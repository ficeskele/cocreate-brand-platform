/**
 * arcade.ai client (https://docs.arcade.ai). NOT arcade.dev.
 * Every call is POST https://platform.arcade.ai/v1/<procedure> with a JSON body and a bearer key.
 */
import { nanoid } from "nanoid";

const BASE = "https://platform.arcade.ai/v1";
const KEY = process.env.ARCADE_API_KEY ?? "";
const UA = process.env.ARCADE_USER_AGENT ?? "cocreate-brand-platform/0.1 (hackathon)";

export class ArcadeError extends Error {
  constructor(
    public procedure: string,
    public status: number,
    public body: unknown,
  ) {
    super(`arcade.ai ${procedure} -> HTTP ${status}: ${typeof body === "object" && body && "message" in body ? (body as { message: string }).message : JSON.stringify(body)}`);
  }
}

export async function call<T = unknown>(procedure: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!KEY.startsWith("arcade_sk_live_")) throw new Error("ARCADE_API_KEY (arcade.ai key, arcade_sk_live_...) is not set");
  let attempt = 0;
  for (;;) {
    const res = await fetch(`${BASE}/${procedure}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    if (res.ok) return json as T;
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const ra = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
      await sleep(ra * 1000);
      attempt++;
      continue;
    }
    throw new ArcadeError(procedure, res.status, json);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const requestId = (prefix: string) => `${prefix}-${nanoid(10)}`;

// ---- types (subset of https://docs.arcade.ai/openapi.json) ----
export interface Job {
  jobId: string;
  kind: "pattern" | "product" | "download";
  status: "running" | "succeeded" | "failed";
  result: { patternId?: string; productId?: string } | null;
  error: { message: string } | null;
}
export interface Model {
  modelId: string;
  name: string;
}
export interface Category {
  categoryId: string;
  name: string;
  world: "print" | "jewelry";
  category: { categoryId: string; name: string } | null;
}
export interface CategoryDetail {
  categoryId: string;
  name: string;
  world: "print" | "jewelry";
  options: Array<{
    key: string;
    label: string;
    values: Array<{ value: string; label: string; isDefault: boolean; available: boolean }>;
  }>;
  selections: Record<string, string>;
  canManufacture: boolean;
}
export interface Pattern {
  patternId: string;
  width: number;
  height: number;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
}
export interface Product {
  productId: string;
  title: string;
  categoryId: string;
  maker: { makerId: string; name: string };
  selections: Record<string, string>;
  selectionLabel: string;
  imageUrl: string;
  images: Array<{ url: string }>;
  description: string | null;
  patternId: string;
  unitPrice: { amount: string; currency: string };
}

// ---- cached catalogs ----
let modelsCache: Model[] | null = null;
let categoriesCache: Category[] | null = null;

export async function listModels() {
  modelsCache ??= (await call<{ items: Model[] }>("models/list")).items;
  return modelsCache;
}
export async function listCategories() {
  categoriesCache ??= (await call<{ items: Category[] }>("categories/list")).items;
  return categoriesCache;
}
export function getCategory(categoryId: string, selections: Record<string, string> = {}) {
  return call<CategoryDetail>("categories/get", { categoryId, selections });
}

// ---- generation ----
export function createPattern(opts: { prompt: string; modelId?: string | null; categoryId?: string | null; referenceIds?: string[]; colors?: string[] }) {
  const body: Record<string, unknown> = { requestId: requestId("pat"), prompt: opts.prompt };
  if (opts.modelId) body.modelId = opts.modelId;
  if (opts.categoryId) body.categoryId = opts.categoryId;
  if (opts.referenceIds?.length) body.referenceIds = opts.referenceIds;
  if (opts.colors?.length) body.colors = opts.colors;
  return call<Job>("patterns/create", body);
}
export function getPattern(patternId: string) {
  return call<Pattern>("patterns/get", { patternId });
}
export function createProduct(opts: { patternId: string; categoryId: string; selections: Record<string, string>; fit?: { mode: "fill" } }) {
  const body: Record<string, unknown> = { requestId: requestId("prod"), ...opts };
  return call<Job>("products/create", body);
}
export function getProduct(productId: string, quantity = 1) {
  return call<Product>("products/get", { productId, quantity });
}
export function getJob(jobId: string) {
  return call<Job>("jobs/get", { jobId });
}
export function createCheckout(lines: Array<{ productId: string; quantity: number }>) {
  return call<{ checkoutId: string; checkoutUrl: string }>("checkouts/create", {
    requestId: requestId("chk"),
    lines,
    dropShip: lines.some((l) => l.quantity === 1),
  });
}

/** Poll a job every `intervalMs` until it finishes. `onTick` sees each state. */
export async function pollJob(jobId: string, opts: { intervalMs?: number; timeoutMs?: number; onTick?: (j: Job) => void } = {}) {
  const interval = Math.max(2000, opts.intervalMs ?? 3000);
  const timeout = opts.timeoutMs ?? 240_000;
  const start = Date.now();
  for (;;) {
    const job = await getJob(jobId);
    opts.onTick?.(job);
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new Error(`arcade.ai job ${jobId} failed: ${job.error?.message ?? "unknown"}`);
    if (Date.now() - start > timeout) throw new Error(`arcade.ai job ${jobId} still running after ${timeout / 1000}s`);
    await sleep(interval);
  }
}
