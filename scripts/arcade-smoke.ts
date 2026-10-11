// Smoke test: the TypeScript arcade.ai client against read-only endpoints.
import * as arcade from "../src/arcade.js";
const models = await arcade.listModels();
console.log("models:", models.length, models.slice(0, 3).map((m) => m.modelId));
const cats = await arcade.listCategories();
const pillows = cats.find((c) => c.name === "Decorative Pillows")!;
console.log("categories:", cats.length, "pillows:", pillows.categoryId);
const detail = await arcade.getCategory(pillows.categoryId, { fabric: "linen", size: "20x20" });
console.log("categories/get:", detail.canManufacture, detail.selections);
