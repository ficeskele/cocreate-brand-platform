/**
 * "Jeeves" setup: from one sentence, predict everything else (brand identity, full ProductSpec,
 * arcade.ai category/style, the instruction for the concept agent). No model: keyword matching
 * against a small mock corpus of past ideas, so the result looks informed and is explainable.
 */
import type { ProductSpec } from "./spec.js";

interface Seed {
  id: string;
  title: string;
  keywords: string[];           // matched as lowercase substrings of the input
  category: string;             // ProductSpec.category
  arcadeCategory: string;       // arcade.ai category name from categories/list
  modelId: string | null;       // arcade.ai style; null = let arcade choose
  selections: Record<string, string>;
  materials: string[];
  features: string[];
  audience: string;
  price: [number, number];      // USD band
  palette: string[];
  vibe: "calm" | "bold" | "playful" | "classic";
}

const SEEDS: Seed[] = [
  { id: "s1", title: "Tea garden pillow", keywords: ["tea", "mountain", "mist", "fog", "garden", "pillow", "cushion"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "chinoiserie", selections: { fabric: "linen", size: "20x20", embellishment: "none", insert: "none" }, materials: ["Linen"], features: ["Double-sided print", "Hidden zipper", "Removable cover"], audience: "Urban professionals who love East Asian aesthetics", price: [45, 75], palette: ["#7A8B7F", "#E9E4D8", "#B9A58C"], vibe: "calm" },
  { id: "s2", title: "Circus clown pillow", keywords: ["clown", "circus", "wild", "crazy", "bright", "vivid", "party", "loud"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "toile", selections: { fabric: "cotton_velvet", size: "18x18", embellishment: "piping", insert: "none" }, materials: ["Velvet"], features: ["Double-sided print", "Piping", "Hidden zipper"], audience: "Young people who like bold decor", price: [50, 80], palette: ["#D94F3D", "#F2B705", "#1F6F8B"], vibe: "bold" },
  { id: "s3", title: "Plum blossom silk scarf", keywords: ["scarf", "silk", "plum", "blossom", "floral", "flower"], category: "accessory", arcadeCategory: "Scarves", modelId: "japanese-botanical", selections: {}, materials: ["Silk"], features: ["Hand-rolled hem", "Square", "Works as a headscarf"], audience: "Urban women who love East Asian aesthetics", price: [60, 120], palette: ["#E8C4C4", "#F4F1EA", "#55665A"], vibe: "calm" },
  { id: "s4", title: "Batik table runner", keywords: ["runner", "table", "batik", "indonesia", "dining"], category: "table-linen", arcadeCategory: "Table Runners", modelId: "batik", selections: {}, materials: ["Cotton"], features: ["Washable", "Reversible"], audience: "People who host dinners at home", price: [40, 70], palette: ["#5B3A29", "#1F3B4D", "#E9E4D8"], vibe: "classic" },
  { id: "s5", title: "Art nouveau lampshade", keywords: ["lamp", "lampshade", "light", "lighting", "nouveau"], category: "lighting", arcadeCategory: "Drum Lampshades", modelId: "art-nouveau", selections: {}, materials: ["Cotton", "Metal frame"], features: ["Warm diffused light", "Fits E27 fittings"], audience: "Renters who care about mood lighting", price: [70, 130], palette: ["#B9A58C", "#55665A", "#F4F1EA"], vibe: "classic" },
  { id: "s6", title: "Woodblock wave duvet", keywords: ["duvet", "bed", "bedroom", "wave", "sea", "ocean", "woodblock", "ukiyo"], category: "bedding", arcadeCategory: "Duvets", modelId: "japanese-woodblock", selections: {}, materials: ["Fine cotton"], features: ["Hidden buttons", "Soft on skin"], audience: "People who want a holiday feel in the bedroom", price: [150, 260], palette: ["#1F6F8B", "#F4F1EA", "#2B2F2C"], vibe: "calm" },
  { id: "s7", title: "Marbled napkin set", keywords: ["napkin", "marble", "marbled", "dinner", "guests"], category: "table-linen", arcadeCategory: "Napkins", modelId: "marbled-paper", selections: {}, materials: ["Linen"], features: ["Set of four", "Machine washable"], audience: "People who like hosting", price: [35, 60], palette: ["#7A8B7F", "#B9A58C", "#E9E4D8"], vibe: "classic" },
  { id: "s8", title: "Pocket square, Victorian floral", keywords: ["pocket square", "suit", "gentleman", "wedding", "groom", "handkerchief"], category: "accessory", arcadeCategory: "Pocket Squares", modelId: "victorian-floral", selections: {}, materials: ["Silk"], features: ["Hand-rolled hem"], audience: "Men attending weddings", price: [30, 55], palette: ["#55665A", "#C98F94", "#F4F1EA"], vibe: "classic" },
  { id: "s9", title: "Tea towel, Ukrainian folk", keywords: ["towel", "kitchen", "folk", "ukrainian", "cooking"], category: "kitchen", arcadeCategory: "Tea Towels", modelId: "stamped-floral", selections: {}, materials: ["Cotton"], features: ["Absorbent", "Hanging loop"], audience: "People who love to cook", price: [18, 30], palette: ["#D94F3D", "#1F6F8B", "#F4F1EA"], vibe: "playful" },
  { id: "s10", title: "Outdoor pillow, tropical", keywords: ["outdoor", "balcony", "patio", "tropical", "palm", "jungle"], category: "home-textile", arcadeCategory: "Outdoor Decorative Pillows", modelId: "indian-textiles", selections: {}, materials: ["Water-resistant fabric"], features: ["Water repellent", "UV resistant"], audience: "Renters with a balcony", price: [50, 85], palette: ["#2E7D5B", "#F2B705", "#F4F1EA"], vibe: "playful" },
  { id: "s11", title: "Curtains, French floral", keywords: ["curtain", "curtains", "french", "living room", "cottage", "window"], category: "home-textile", arcadeCategory: "Curtains", modelId: "french-floral-wallpaper", selections: {}, materials: ["Linen blend"], features: ["60% blackout", "Tab top"], audience: "People refreshing the living room for a new season", price: [120, 220], palette: ["#C98F94", "#E9E4D8", "#7A8B7F"], vibe: "calm" },
  { id: "s12", title: "Floor pillow, Mughal", keywords: ["floor", "mughal", "india", "indian", "meditation", "yoga", "seat"], category: "home-textile", arcadeCategory: "Floor Pillows", modelId: "mughal-watercolor", selections: {}, materials: ["Cotton"], features: ["Extra thick", "Carry handle"], audience: "People who meditate or do yoga at home", price: [80, 130], palette: ["#B9A58C", "#D94F3D", "#F4F1EA"], vibe: "classic" },
  { id: "s13", title: "Impressionist placemats", keywords: ["placemat", "placemats", "impressionist", "monet", "breakfast"], category: "table-linen", arcadeCategory: "Placemats", modelId: "impressionism", selections: {}, materials: ["Cotton"], features: ["Set of four", "Non-slip backing"], audience: "People who like a breakfast ritual", price: [30, 55], palette: ["#7A8B7F", "#C98F94", "#F2B705"], vibe: "calm" },
  { id: "s14", title: "Quilt, Biedermeier", keywords: ["quilt", "patchwork", "austrian", "alpine", "cozy", "winter", "warm"], category: "bedding", arcadeCategory: "Quilts", modelId: "austrian-biedermeier", selections: {}, materials: ["Cotton", "Batting"], features: ["Diamond stitching", "Machine washable"], audience: "People who like a warm, homely feel", price: [180, 300], palette: ["#E9E4D8", "#B9A58C", "#55665A"], vibe: "classic" },
  { id: "s15", title: "Fabric by the yard, toile", keywords: ["fabric", "yard", "diy", "sew", "sewing", "make my own"], category: "fabric", arcadeCategory: "Fabric By The Yard", modelId: "toile", selections: {}, materials: ["Cotton"], features: ["Priced per yard", "Customizable"], audience: "People who sew their own things", price: [25, 45], palette: ["#1F6F8B", "#F4F1EA", "#2B2F2C"], vibe: "classic" },
  { id: "s16", title: "Cat pattern pillow", keywords: ["cat", "kitten", "dog", "puppy", "pet", "cute", "kawaii"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "estonian-watercolor", selections: { fabric: "canvas", size: "16x16", embellishment: "none", insert: "none" }, materials: ["Cotton"], features: ["Double-sided print", "Hidden zipper"], audience: "Young pet owners", price: [40, 65], palette: ["#F2B705", "#C98F94", "#F4F1EA"], vibe: "playful" },
  { id: "s17", title: "Dainty gemstone ring", keywords: ["ring", "gem", "gemstone", "proposal", "engagement", "jewelry", "jewellery"], category: "jewelry", arcadeCategory: "Dainty Gemstone Ring", modelId: null, selections: {}, materials: ["14K gold", "Gemstone"], features: ["Choice of stone", "Engravable"], audience: "People giving a gift with a story", price: [150, 400], palette: ["#B9A58C", "#F4F1EA", "#55665A"], vibe: "classic" },
  { id: "s18", title: "Pendant necklace", keywords: ["necklace", "pendant", "gift", "birthday", "girlfriend", "anniversary"], category: "jewelry", arcadeCategory: "Pendant Necklace", modelId: null, selections: {}, materials: ["925 silver"], features: ["Engravable", "Adjustable chain"], audience: "People giving a keepsake", price: [90, 220], palette: ["#B9A58C", "#F4F1EA", "#2B2F2C"], vibe: "classic" },
  { id: "s19", title: "Gilded age frieze shams", keywords: ["sham", "shams", "pillowcase", "gilded", "luxury", "hotel"], category: "bedding", arcadeCategory: "Shams", modelId: "gilded-age", selections: {}, materials: ["Fine cotton"], features: ["Pair", "Envelope closure"], audience: "People who want a hotel-style bedroom", price: [60, 110], palette: ["#B9A58C", "#2B2F2C", "#E9E4D8"], vibe: "classic" },
  { id: "s20", title: "Tapestry-style tall lampshade", keywords: ["floor lamp", "tall", "tapestry", "european", "classic", "antique"], category: "lighting", arcadeCategory: "Tall Drum Lampshades", modelId: "european-tapestry", selections: {}, materials: ["Cotton"], features: ["Warm diffused light"], audience: "People who like classic interiors", price: [90, 160], palette: ["#5B3A29", "#B9A58C", "#55665A"], vibe: "classic" },
];

const VIBES: Record<Seed["vibe"], { mission: string; voice: string; tagline: string }> = {
  calm: { mission: "Bring quiet beauty into everyday life", voice: "Understated, restrained, a little poetic", tagline: "Quietly beautiful" },
  bold: { mission: "Give every room an opinion", voice: "Bold, direct, playful", tagline: "Go a little wild" },
  playful: { mission: "Turn cute and funny into things you use every day", voice: "Light, friendly, a bit cheeky", tagline: "Something to smile at every day" },
  classic: { mission: "Make objects from classic patterns that last", voice: "Steady, considered, detail-driven", tagline: "Built to stand the test of time" },
};

/** arcade.ai category -> singular product noun used in predicted names */
const SINGULAR: Record<string, string> = { "Decorative Pillows": "Pillow", "Outdoor Decorative Pillows": "Outdoor Pillow", Scarves: "Scarf", "Table Runners": "Table Runner", "Drum Lampshades": "Lampshade", "Tall Drum Lampshades": "Lampshade", Duvets: "Duvet", Napkins: "Napkin Set", "Pocket Squares": "Pocket Square", "Tea Towels": "Tea Towel", Curtains: "Curtains", "Floor Pillows": "Floor Pillow", Placemats: "Placemats", Quilts: "Quilt", "Fabric By The Yard": "Fabric", "Dainty Gemstone Ring": "Ring", "Pendant Necklace": "Necklace", Shams: "Shams" };

export interface Prediction {
  input: string;
  confidence: number;
  similar: { id: string; title: string; score: number; matched: string[] }[];
  brand: { name: string; identity: { mission: string; voice: string; palette: string[] } };
  product: { name: string; spec: ProductSpec };
  arcade: { categoryName: string; modelId: string | null; selections: Record<string, string> };
  agentInstruction: string;
  basis: string;
}

export function predict(input: string): Prediction {
  const text = input.toLowerCase();
  const scored = SEEDS.map((s) => {
    const matched = s.keywords.filter((k) => text.includes(k.toLowerCase()));
    // the product noun the user actually wrote (scarf, pillow, necklace...) outranks mood words
    const noun = (SINGULAR[s.arcadeCategory] ?? "").split(" ").pop()!.toLowerCase();
    const nounHit = noun && new RegExp(`\\b${noun}s?\\b`).test(text);
    return { seed: s, matched, score: matched.length + (nounHit ? 3 : 0) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  const best = top[0]?.seed ?? SEEDS[0];
  const maxScore = top[0]?.score ?? 0;
  const confidence = Math.min(0.95, 0.35 + maxScore * 0.15 + top.length * 0.05);

  // vibe from words in the input, else from the best seed
  const vibe: Seed["vibe"] = /wild|crazy|bright|vivid|loud|neon|bold/.test(text) ? "bold"
    : /cute|fun|playful|kawaii|cheeky/.test(text) ? "playful"
    : /calm|mist|quiet|zen|serene|soft/.test(text) ? "calm"
    : best.vibe;
  const v = VIBES[vibe];
  const palette = vibe === best.vibe ? best.palette : (SEEDS.find((s) => s.vibe === vibe)?.palette ?? best.palette);

  // name: first clause of the user's words, title-cased, plus the product noun if they did not write one
  const noun = SINGULAR[best.arcadeCategory] ?? best.arcadeCategory;
  const clause = input.trim().split(/[,.;!?:]/)[0].trim();
  const lead = /^(i want|i'd like|i would like|make me|give me|a|an|the|some|my|our)\s+/i;
  const trailing = /^(in|the|a|an|of|for|with|and|to|on|at|by|from|that|is|my)$/i;
  const words = clause.replace(lead, "").replace(lead, "").split(/\s+/).filter(Boolean).slice(0, 5);
  while (words.length > 1 && trailing.test(words[words.length - 1])) words.pop();
  const titled = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || noun;
  const name = new RegExp(`\\b${noun.split(" ").pop()}s?\\b`, "i").test(titled) ? titled : `${titled} ${noun}`;
  const head = words[0] ? words[0][0].toUpperCase() + words[0].slice(1) : "My";

  const features = [...new Set(top.flatMap((t) => t.seed.features))].slice(0, 4);
  const materials = [...new Set(top.flatMap((t) => t.seed.materials))].slice(0, 2);
  const [lo, hi] = top.length ? [Math.min(...top.map((t) => t.seed.price[0])), Math.max(...top.map((t) => t.seed.price[1]))] : best.price;

  const spec: ProductSpec = {
    name,
    tagline: v.tagline,
    concept: `${input.trim().replace(/[.!?]+$/, "")}. Based on similar ideas such as "${best.title}", made as a ${noun.toLowerCase()}.`,
    category: best.category,
    target_audience: best.audience,
    features: features.map((text, i) => ({ id: `f${i + 1}`, text })),
    materials: materials.map((name, i) => ({ id: `m${i + 1}`, name })),
    colorways: palette.slice(0, 2).map((hex, i) => ({ id: `c${i + 1}`, name: i === 0 ? "Primary" : "Accent", hex })),
    price_target: { currency: "USD", min: lo, max: hi },
    images: [],
    sourcing_notes: `Made to order by an arcade.ai partner artisan, from a single unit. Predicted category: ${best.arcadeCategory}.`,
    arcade: { modelId: best.modelId, prompt: "", patternId: null, categoryId: null, categoryName: best.arcadeCategory, selections: best.selections, productId: null, unitPrice: null, maker: null },
  };

  const styleHint = best.modelId ? `, style ${best.modelId}` : "";
  const sel = Object.keys(best.selections).length ? `, ${Object.values(best.selections).slice(0, 2).join(" ")}` : "";
  return {
    input,
    confidence: Number(confidence.toFixed(2)),
    similar: top.map((t) => ({ id: t.seed.id, title: t.seed.title, score: t.score, matched: t.matched })),
    brand: { name: `${head} Studio`, identity: { mission: v.mission, voice: v.voice, palette } },
    product: { name, spec },
    arcade: { categoryName: best.arcadeCategory, modelId: best.modelId, selections: best.selections },
    agentInstruction: `${input.trim().replace(/[.!?]+$/, "")}${styleHint}${sel}, category ${best.arcadeCategory}`,
    basis: top.length ? `Predicted from ${top.length} similar idea${top.length > 1 ? "s" : ""} (${top.map((t) => t.seed.title).join(", ")})` : "No similar ideas found; using defaults",
  };
}
