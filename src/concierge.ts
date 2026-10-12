/**
 * Discussion concierge: when someone writes in an idea's thread, the agent answers with a concrete
 * design draft (name, style, category, materials, palette, price band) and asks for confirmation.
 * Nothing is generated until a person confirms ("go" or the Confirm button). Without a Claude key
 * the draft comes from the mock prediction corpus, so it is instant.
 */
import { predict } from "./predict.js";
import type { ProductSpec } from "./spec.js";

export interface Draft {
  instruction: string;          // what /generate will run
  name: string;
  categoryName: string;
  modelId: string | null;
  selections: Record<string, string>;
  palette: string[];
  priceBand: [number | null, number | null];
  basis: string;
}

const CONFIRM = /^\s*(go|yes|ok|okay|do it|make it|confirm|start|generate|build it|let'?s go)\s*[.!]*\s*$/i;
export const isConfirmation = (text: string) => CONFIRM.test(text);

/** Build the agent's reply to a discussion message, plus the draft it proposes. */
export function draftReply(text: string, spec: ProductSpec, author: string): { body: string; draft: Draft } {
  const pred = predict(`${text}. ${spec.concept}`);
  // "make it blue" on a necklace must stay a necklace: keep the idea's category unless the message names a product
  const NOUN = /\b(necklace|pendant|rings?|earr?ings?|studs?|scarf|scarves|pillow|cushion|lamp|lampshade|duvet|napkins?|placemats?|runner|tablecloth|curtains?|quilt|towel|shams?|fabric)\b/i;
  if (spec.arcade?.categoryName && !NOUN.test(text)) {
    pred.arcade.categoryName = spec.arcade.categoryName;
    pred.arcade.modelId = spec.arcade.modelId ?? pred.arcade.modelId;
    pred.arcade.selections = spec.arcade.selections ?? {};
  }
  const sel = Object.keys(pred.arcade.selections).length ? Object.values(pred.arcade.selections).slice(0, 2).join(" ") : "";
  const instruction = `${text.trim().replace(/[.!?]+$/, "")}${pred.arcade.modelId ? `, style ${pred.arcade.modelId}` : ""}${sel ? `, ${sel}` : ""}, category ${pred.arcade.categoryName}`;
  // Name: the idea's current name plus the words that drove the match, e.g. "Clown Pillow (pastel, velvet)"
  const words = [...new Set(pred.similar.flatMap((s) => s.matched))].filter((w) => text.toLowerCase().includes(w)).slice(0, 3);
  const name = words.length ? `${spec.name} (${words.join(", ")})` : `${spec.name} (variant)`;
  const draft: Draft = {
    instruction,
    name,
    categoryName: pred.arcade.categoryName,
    modelId: pred.arcade.modelId,
    selections: pred.arcade.selections,
    palette: pred.brand.identity.palette,
    priceBand: [pred.product.spec.price_target.min, pred.product.spec.price_target.max],
    basis: pred.basis,
  };
  const lines = [
    `Here is how I would shape that, ${author.replace(/^u_/, "")}:`,
    `- Name: ${draft.name}`,
    `- Product: ${draft.categoryName}${sel ? ` (${sel})` : ""} on arcade.ai${draft.modelId ? `, style ${draft.modelId}` : ""}`,
    `- Palette: ${draft.palette.join(" ")}`,
    draft.priceBand[0] != null ? `- Expected price: USD ${draft.priceBand[0]}-${draft.priceBand[1]}` : "",
    `- ${draft.basis}`,
    `Reply "go" (or press Confirm and generate) and I will render it on arcade.ai as a new branch. Say more and I will revise the draft.`,
  ].filter(Boolean);
  return { body: lines.join("\n"), draft };
}
