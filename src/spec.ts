import { z } from "zod";

/** ProductSpec: the structured content of every Revision. Images and arcade.* all come from arcade.ai. */
export const ImageRole = z.enum(["pattern", "hero", "closeup"]);

export const ProductSpec = z.object({
  name: z.string(),
  tagline: z.string(),
  concept: z.string(),
  category: z.string(),
  target_audience: z.string(),
  features: z.array(z.object({ id: z.string(), text: z.string() })),
  materials: z.array(z.object({ id: z.string(), name: z.string() })),
  colorways: z.array(z.object({ id: z.string(), name: z.string(), hex: z.string() })),
  price_target: z.object({
    currency: z.string().default("USD"),
    min: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
  }),
  images: z.array(z.object({ url: z.string(), role: ImageRole })).default([]),
  sourcing_notes: z.string().default(""),
  arcade: z
    .object({
      modelId: z.string().nullable().default(null),
      prompt: z.string().default(""),
      patternId: z.string().nullable().default(null),
      categoryId: z.string().nullable().default(null),
      categoryName: z.string().nullable().default(null),
      selections: z.record(z.string(), z.string()).default({}),
      productId: z.string().nullable().default(null),
      unitPrice: z.object({ amount: z.string(), currency: z.string() }).nullable().default(null),
      maker: z.object({ makerId: z.string(), name: z.string() }).nullable().default(null),
    })
    .default({
      modelId: null,
      prompt: "",
      patternId: null,
      categoryId: null,
      categoryName: null,
      selections: {},
      productId: null,
      unitPrice: null,
      maker: null,
    }),
});
export type ProductSpec = z.infer<typeof ProductSpec>;

/** Field-level diff. Arrays with `id` are aligned by id; everything else is compared as JSON. */
export type DiffEntry =
  | { path: string; kind: "changed"; before: unknown; after: unknown }
  | { path: string; kind: "added"; after: unknown }
  | { path: string; kind: "removed"; before: unknown };

export function diffSpec(before: unknown, after: unknown, path = ""): DiffEntry[] {
  const out: DiffEntry[] = [];
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

  if (Array.isArray(before) && Array.isArray(after) && hasIds(before) && hasIds(after)) {
    const bm = new Map(before.map((x) => [x.id, x]));
    const am = new Map(after.map((x) => [x.id, x]));
    for (const [k, b] of bm) {
      if (!am.has(k)) out.push({ path: `${path}[${k}]`, kind: "removed", before: b });
      else out.push(...diffSpec(b, am.get(k), `${path}[${k}]`));
    }
    for (const [k, a] of am) if (!bm.has(k)) out.push({ path: `${path}[${k}]`, kind: "added", after: a });
    return out;
  }
  if (isObj(before) && isObj(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in before)) out.push({ path: p, kind: "added", after: after[k] });
      else if (!(k in after)) out.push({ path: p, kind: "removed", before: before[k] });
      else out.push(...diffSpec(before[k], after[k], p));
    }
    return out;
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ path, kind: "changed", before, after });
  return out;
}

function hasIds(arr: unknown[]): arr is Array<{ id: string }> {
  return arr.every((x) => typeof x === "object" && x !== null && typeof (x as { id?: unknown }).id === "string");
}
