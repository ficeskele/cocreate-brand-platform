import { all, getBrand, getProduct, getRevision, id, mainHistory, one, run, type RevisionRow } from "./db.js";
import { ProductSpec } from "./spec.js";
import * as arcade from "./arcade.js";
import { cacheImage } from "./images.js";

export function coauthors(productId: string) {
  const history = mainHistory(productId);
  const scores = new Map<string, { type: "user" | "agent"; id: string; on_behalf_of: string | null; revisions: number }>();
  const bump = (type: "user" | "agent", who: string, onBehalfOf: string | null) => {
    const key = `${type}:${who}:${onBehalfOf ?? ""}`;
    const cur = scores.get(key) ?? { type, id: who, on_behalf_of: onBehalfOf, revisions: 0 };
    cur.revisions++;
    scores.set(key, cur);
  };
  const credit = (r: { author_type: "user" | "agent"; author_id: string; on_behalf_of_user_id: string | null }) => {
    bump(r.author_type, r.author_id, r.author_type === "agent" ? r.on_behalf_of_user_id : null);
    if (r.author_type === "agent" && r.on_behalf_of_user_id) bump("user", r.on_behalf_of_user_id, null);
  };
  const mainIds = new Set(history.map((r) => r.id));
  for (const r of history) {
    credit(r);
    // A merge copies the source head into main; credit the source branch's revisions too (up to where it forked from main).
    const merged = one<{ source_revision_id: string }>("SELECT source_revision_id FROM proposal WHERE merged_revision_id = ?", r.id);
    let cur: string | null = merged?.source_revision_id ?? null;
    while (cur && !mainIds.has(cur)) {
      const src: RevisionRow | undefined = one<RevisionRow>("SELECT * FROM revision WHERE id = ?", cur);
      if (!src) break;
      credit(src);
      cur = src.parent_revision_id;
    }
  }
  const users = new Map(all<{ id: string; handle: string }>("SELECT id, handle FROM user").map((u) => [u.id, u.handle]));
  return [...scores.values()]
    .map((s) => ({ ...s, handle: s.type === "user" ? (users.get(s.id) ?? s.id) : `agent:${s.id}` }))
    .sort((a, b) => b.revisions - a.revisions);
}

export function buildExportPayload(productId: string) {
  const product = getProduct(productId);
  if (!product) throw new Error("product not found");
  const brand = getBrand(product.brand_id)!;
  const head = mainHistory(productId)[0];
  if (!head) throw new Error("main has no revisions");
  const spec = ProductSpec.parse(JSON.parse(head.content));
  const li = spec.features.map((f) => `<li>${esc(f.text)}</li>`).join("");
  return {
    revisionId: head.id,
    payload: {
      title: spec.name,
      descriptionHtml: `<p>${esc(spec.tagline)}</p><p>${esc(spec.concept)}</p><ul>${li}</ul>`,
      productType: spec.category,
      vendor: brand.name,
      tags: [spec.category, ...(spec.arcade.modelId ? [spec.arcade.modelId] : [])],
      images: spec.images.map((i) => ({ src: i.url, altText: i.role })),
      colorways: spec.colorways.map((c) => c.name),
      price: spec.arcade.unitPrice,
      metafields: [
        { namespace: "cocreate", key: "materials", type: "json", value: JSON.stringify(spec.materials) },
        { namespace: "cocreate", key: "sourcing_notes", type: "single_line_text_field", value: spec.sourcing_notes },
        { namespace: "cocreate", key: "arcade", type: "json", value: JSON.stringify(spec.arcade) },
      ],
      credits: coauthors(productId).map((c) => ({ handle: c.handle, revisions: c.revisions, on_behalf_of: c.on_behalf_of })),
    },
  };
}

export function createRelease(productId: string) {
  const { revisionId, payload } = buildExportPayload(productId);
  const count = one<{ n: number }>("SELECT COUNT(*) n FROM release WHERE product_id = ?", productId)!.n;
  const relId = id();
  const version = `v${count + 1}`;
  run(
    "INSERT INTO release (id, product_id, revision_id, version, export_payload) VALUES (?,?,?,?,?)",
    relId,
    productId,
    revisionId,
    version,
    JSON.stringify(payload),
  );
  return getRelease(relId)!;
}

export function getRelease(relId: string) {
  const row = one<{ id: string; product_id: string; revision_id: string; version: string; export_payload: string; created_at: string }>(
    "SELECT * FROM release WHERE id = ?", relId,
  );
  if (!row) return undefined;
  return { ...row, export_payload: JSON.parse(row.export_payload) as unknown };
}

/** Open the store on arcade.ai: refresh mockup images, then create a real checkout. */
export async function openStore(relId: string) {
  const rel = getRelease(relId);
  if (!rel) throw new Error("release not found");
  const rev = getRevision(rel.revision_id);
  const spec = ProductSpec.parse(rev!.content);
  if (!spec.arcade.productId) throw new Error("this revision has no arcade.ai product yet; run the concept agent first");

  const product = await arcade.getProduct(spec.arcade.productId);
  await Promise.all(product.images.map((img, i) => cacheImage(img.url, `${product.productId}-${i === 0 ? "hero" : "closeup"}`)));

  const checkout = await arcade.createCheckout([{ productId: product.productId, quantity: 1 }]);
  const storeId = id();
  run(
    "INSERT INTO store (id, release_id, target, checkout_id, checkout_url) VALUES (?,?,?,?,?)",
    storeId,
    relId,
    "arcade.ai",
    checkout.checkoutId,
    checkout.checkoutUrl,
  );
  return {
    store: one("SELECT * FROM store WHERE id = ?", storeId),
    checkout_url: checkout.checkoutUrl,
    product: { title: product.title, selectionLabel: product.selectionLabel, unitPrice: product.unitPrice, maker: product.maker },
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
