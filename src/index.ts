import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { z } from "zod";
import { all, appendRevision, addMessage, getBranch, getBrand, getProduct, getRevision, id, mainHistory, one, run } from "./db.js";
import { ProductSpec, diffSpec } from "./spec.js";
import { runConceptAgent } from "./agent.js";
import { coauthors, createRelease, getRelease, openStore } from "./release.js";

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

app.use("*", async (c, next) => {
  c.set("userId", c.req.header("x-user-id") ?? "u_alice");
  await next();
});
app.onError((err, c) => {
  console.error(err);
  const status = err instanceof z.ZodError ? 400 : 500;
  return c.json({ error: { code: err instanceof z.ZodError ? "VALIDATION" : "INTERNAL", message: err.message } }, status);
});
const notFound = (c: Context, what: string) => c.json({ error: { code: "NOT_FOUND", message: `${what} not found` } }, 404);

app.use("/images/*", serveStatic({ root: "./data" }));
app.get("/health", (c) => c.json({ ok: true, service: "cocreate-brand-platform", arcade: "arcade.ai", mock_design: process.env.AGENT_MOCK_DESIGN === "1", claude: Boolean(process.env.ANTHROPIC_API_KEY) }));
app.get("/", serveStatic({ path: "./public/index.html" }));

// ---- brands ----
const BrandBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  identity: z.object({ mission: z.string(), voice: z.string(), palette: z.array(z.string()) }),
});
app.post("/brands", async (c) => {
  const body = BrandBody.parse(await c.req.json());
  const brandId = id();
  run("INSERT INTO brand (id, name, slug, identity, created_by) VALUES (?,?,?,?,?)", brandId, body.name, body.slug, JSON.stringify(body.identity), c.get("userId"));
  return c.json(getBrand(brandId), 201);
});
app.get("/brands", (c) =>
  c.json(all("SELECT * FROM brand ORDER BY created_at DESC").map((b) => ({ ...b, identity: JSON.parse(b.identity as string), products: all("SELECT id, name FROM product WHERE brand_id = ? ORDER BY created_at", b.id) }))),
);
app.get("/brands/:id", (c) => {
  const brand = getBrand(c.req.param("id"));
  if (!brand) return notFound(c, "brand");
  const products = all("SELECT * FROM product WHERE brand_id = ? ORDER BY created_at", brand.id);
  return c.json({ ...brand, products });
});

// ---- products ----
app.post("/brands/:id/products", async (c) => {
  const brand = getBrand(c.req.param("id"));
  if (!brand) return notFound(c, "brand");
  const body = z.object({ name: z.string().min(1), spec: ProductSpec }).parse(await c.req.json());
  const productId = id();
  const branchId = id();
  const userId = c.get("userId");
  run("INSERT INTO product (id, brand_id, name, main_branch_id) VALUES (?,?,?,?)", productId, brand.id, body.name, branchId);
  run(
    "INSERT INTO branch (id, product_id, name, kind, head_revision_id, created_by_type, created_by_id) VALUES (?,?,?,?,?,?,?)",
    branchId, productId, "main", "main", null, "user", userId,
  );
  appendRevision({ branchId, content: body.spec, summary: "initial spec", authorType: "user", authorId: userId });
  return c.json(productView(productId), 201);
});

function productView(productId: string) {
  const product = getProduct(productId);
  if (!product) return undefined;
  const main = getBranch(product.main_branch_id)!;
  const head = main.head_revision_id ? getRevision(main.head_revision_id) : undefined;
  return {
    ...product,
    main_head: head,
    branches: all("SELECT * FROM branch WHERE product_id = ? ORDER BY created_at", productId),
    open_proposals: all("SELECT * FROM proposal WHERE product_id = ? AND status = 'open' ORDER BY created_at", productId),
    messages: all("SELECT * FROM message WHERE product_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20", productId).reverse(),
  };
}
app.get("/products/:id", (c) => {
  const v = productView(c.req.param("id"));
  return v ? c.json(v) : notFound(c, "product");
});
app.get("/products/:id/revisions", (c) => {
  if (!getProduct(c.req.param("id"))) return notFound(c, "product");
  return c.json(mainHistory(c.req.param("id")).map((r) => ({ ...r, content: JSON.parse(r.content) })));
});
app.get("/products/:id/coauthors", (c) => {
  if (!getProduct(c.req.param("id"))) return notFound(c, "product");
  return c.json(coauthors(c.req.param("id")));
});

// ---- messages / agent trigger ----
const MENTION = /@agent:concept\s*(.*)/s;
app.get("/products/:id/messages", (c) => {
  if (!getProduct(c.req.param("id"))) return notFound(c, "product");
  return c.json(all("SELECT * FROM message WHERE product_id = ? ORDER BY created_at, rowid", c.req.param("id")));
});
app.post("/products/:id/messages", async (c) => {
  const product = getProduct(c.req.param("id"));
  if (!product) return notFound(c, "product");
  const body = z.object({ body: z.string().min(1) }).parse(await c.req.json());
  const userId = c.get("userId");
  const m = MENTION.exec(body.body);
  let agentRunId: string | null = null;
  if (m) {
    const main = getBranch(product.main_branch_id)!;
    agentRunId = id();
    run(
      "INSERT INTO agent_run (id, product_id, agent, triggered_by_user_id, instruction, input_revision_id, status, stage) VALUES (?,?,?,?,?,?,?,?)",
      agentRunId, product.id, "concept", userId, m[1].trim() || body.body, main.head_revision_id, "running", "designing",
    );
  }
  const message = addMessage({ productId: product.id, authorType: "user", authorId: userId, body: body.body, agentRunId });
  if (agentRunId) void runConceptAgent(agentRunId);
  return c.json({ message, agent_run_id: agentRunId }, 201);
});
app.get("/agent-runs/:id", (c) => {
  const row = one("SELECT * FROM agent_run WHERE id = ?", c.req.param("id"));
  if (!row) return notFound(c, "agent run");
  return c.json({ ...row, tool_calls: JSON.parse(row.tool_calls as string) });
});

// ---- proposals ----
app.get("/proposals/:id", (c) => {
  const p = one<{ id: string; product_id: string; source_revision_id: string }>("SELECT * FROM proposal WHERE id = ?", c.req.param("id"));
  if (!p) return notFound(c, "proposal");
  const source = getRevision(p.source_revision_id)!;
  const mainHead = mainHistory(p.product_id)[0];
  const mainSpec = mainHead ? JSON.parse(mainHead.content) : null;
  return c.json({
    ...p,
    source,
    main: mainHead ? { ...mainHead, content: mainSpec } : null,
    diff: diffSpec(mainSpec, source.content),
  });
});
app.post("/proposals/:id/merge", (c) => {
  const p = one<{ id: string; product_id: string; source_revision_id: string; status: string; summary: string }>(
    "SELECT * FROM proposal WHERE id = ?", c.req.param("id"),
  );
  if (!p) return notFound(c, "proposal");
  if (p.status !== "open") return c.json({ error: { code: "ALREADY_MERGED", message: "proposal is not open" } }, 409);
  const product = getProduct(p.product_id)!;
  const source = getRevision(p.source_revision_id)!;
  const mergedId = appendRevision({
    branchId: product.main_branch_id,
    content: source.content,
    summary: `merge: ${p.summary}`,
    authorType: "user",
    authorId: c.get("userId"),
  });
  run("UPDATE proposal SET status = 'merged', merged_revision_id = ? WHERE id = ?", mergedId, p.id);
  return c.json({ proposal: one("SELECT * FROM proposal WHERE id = ?", p.id), merged_revision: getRevision(mergedId), coauthors: coauthors(product.id) });
});

// ---- releases / store ----
app.post("/products/:id/releases", (c) => {
  if (!getProduct(c.req.param("id"))) return notFound(c, "product");
  return c.json(createRelease(c.req.param("id")), 201);
});
app.get("/releases/:id", (c) => {
  const r = getRelease(c.req.param("id"));
  return r ? c.json(r) : notFound(c, "release");
});
app.post("/releases/:id/open-store", async (c) => {
  if (!getRelease(c.req.param("id"))) return notFound(c, "release");
  return c.json(await openStore(c.req.param("id")), 201);
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => console.log(`cocreate-brand-platform on http://localhost:${port} (arcade.ai backend)`));
