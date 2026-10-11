/**
 * arcade.ai image URLs are signed and expire. Download them once into data/images/ and
 * serve them from GET /images/:file so every URL in a ProductSpec stays stable.
 */
import { mkdirSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export const IMAGE_DIR = path.resolve("data/images");
mkdirSync(IMAGE_DIR, { recursive: true });

const PUBLIC_BASE = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3456}`;

export async function cacheImage(url: string, name: string): Promise<string> {
  const file = `${name}.png`;
  const dest = path.join(IMAGE_DIR, file);
  if (!existsSync(dest)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${name} failed: HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
  return `${PUBLIC_BASE}/images/${file}`;
}
