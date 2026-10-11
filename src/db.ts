import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });
export const db = new Database(process.env.DB_PATH ?? "data/app.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS brand (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  identity TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brand(id),
  name TEXT NOT NULL,
  main_branch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS branch (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('main','human','agent')),
  head_revision_id TEXT,
  created_by_type TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS revision (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branch(id),
  parent_revision_id TEXT,
  author_type TEXT NOT NULL,
  author_id TEXT NOT NULL,
  on_behalf_of_user_id TEXT,
  content TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  agent_run_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS proposal (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id),
  source_branch_id TEXT NOT NULL,
  source_revision_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','merged')),
  opened_by_type TEXT NOT NULL,
  opened_by_id TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  merged_revision_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS message (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id),
  author_type TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  agent_run_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_run (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id),
  agent TEXT NOT NULL,
  triggered_by_user_id TEXT NOT NULL,
  instruction TEXT NOT NULL,
  input_revision_id TEXT NOT NULL,
  work_branch_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed')),
  stage TEXT NOT NULL DEFAULT 'designing',
  arcade_job_id TEXT,
  tool_calls TEXT NOT NULL DEFAULT '[]',
  output_revision_id TEXT,
  output_proposal_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS release (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id),
  revision_id TEXT NOT NULL,
  version TEXT NOT NULL,
  export_payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL REFERENCES release(id),
  target TEXT NOT NULL,
  checkout_id TEXT,
  checkout_url TEXT,
  shop_domain TEXT,
  shopify_product_id TEXT,
  admin_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.prepare(`INSERT OR IGNORE INTO user (id, handle) VALUES ('u_alice','alice'),('u_bob','bob'),('u_carol','carol')`).run();

export const id = () => nanoid(12);
/** Run `fn` inside one SQLite transaction; multi-row writes either all land or none do. */
export const tx = <T>(fn: () => T): T => db.transaction(fn)();

export type Row = Record<string, unknown>;

export function one<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}
export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}
export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}

export function parseJson<T>(row: Row | undefined, keys: string[]): T | undefined {
  if (!row) return undefined;
  const out: Row = { ...row };
  for (const k of keys) if (typeof out[k] === "string") out[k] = JSON.parse(out[k] as string);
  return out as T;
}

export interface RevisionRow {
  id: string;
  branch_id: string;
  parent_revision_id: string | null;
  author_type: "user" | "agent";
  author_id: string;
  on_behalf_of_user_id: string | null;
  content: string;
  summary: string;
  agent_run_id: string | null;
  created_at: string;
}

export function getRevision(revId: string) {
  return parseJson<Omit<RevisionRow, "content"> & { content: unknown }>(
    one("SELECT * FROM revision WHERE id = ?", revId),
    ["content"],
  );
}

export function getBranch(branchId: string) {
  return one<{ id: string; product_id: string; name: string; kind: string; head_revision_id: string | null }>(
    "SELECT * FROM branch WHERE id = ?",
    branchId,
  );
}

export function getProduct(productId: string) {
  return one<{ id: string; brand_id: string; name: string; main_branch_id: string }>(
    "SELECT * FROM product WHERE id = ?",
    productId,
  );
}

export function getBrand(brandId: string) {
  return parseJson<{ id: string; name: string; slug: string; identity: BrandIdentity; created_by: string }>(
    one("SELECT * FROM brand WHERE id = ?", brandId),
    ["identity"],
  );
}

export interface BrandIdentity {
  mission: string;
  voice: string;
  palette: string[];
}

/** Append a revision to a branch and move its head. */
export function appendRevision(opts: {
  branchId: string;
  content: unknown;
  summary: string;
  authorType: "user" | "agent";
  authorId: string;
  onBehalfOf?: string | null;
  agentRunId?: string | null;
}) {
  const branch = getBranch(opts.branchId);
  if (!branch) throw new Error(`branch ${opts.branchId} not found`);
  const revId = id();
  run(
    `INSERT INTO revision (id, branch_id, parent_revision_id, author_type, author_id, on_behalf_of_user_id, content, summary, agent_run_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    revId,
    branch.id,
    branch.head_revision_id,
    opts.authorType,
    opts.authorId,
    opts.onBehalfOf ?? null,
    JSON.stringify(opts.content),
    opts.summary,
    opts.agentRunId ?? null,
  );
  run("UPDATE branch SET head_revision_id = ? WHERE id = ?", revId, branch.id);
  return revId;
}

export function addMessage(opts: {
  productId: string;
  authorType: "user" | "agent";
  authorId: string;
  body: string;
  agentRunId?: string | null;
}) {
  const msgId = id();
  run(
    "INSERT INTO message (id, product_id, author_type, author_id, body, agent_run_id) VALUES (?,?,?,?,?,?)",
    msgId,
    opts.productId,
    opts.authorType,
    opts.authorId,
    opts.body,
    opts.agentRunId ?? null,
  );
  return one("SELECT * FROM message WHERE id = ?", msgId)!;
}

/** Walk main's parent chain, newest first. */
export function mainHistory(productId: string) {
  const product = getProduct(productId);
  if (!product) return [];
  const branch = getBranch(product.main_branch_id);
  const out: RevisionRow[] = [];
  let cur = branch?.head_revision_id ?? null;
  while (cur) {
    const r = one<RevisionRow>("SELECT * FROM revision WHERE id = ?", cur);
    if (!r) break;
    out.push(r);
    cur = r.parent_revision_id;
  }
  return out;
}
