/**
 * "Jeeves" setup: from one sentence, predict everything else (brand identity, full ProductSpec,
 * arcade.ai category/style, the instruction for the concept agent). No model: keyword matching
 * against a small mock corpus of past ideas, so the result looks informed and is explainable.
 */
import type { ProductSpec } from "./spec.js";

interface Seed {
  id: string;
  title: string;
  keywords: string[];           // zh + en, matched as substrings (lowercase)
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
  { id: "s1", title: "Tea garden pillow", keywords: ["茶", "山", "霧", "mist", "tea", "mountain", "抱枕", "pillow", "cushion"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "chinoiserie", selections: { fabric: "linen", size: "20x20", embellishment: "none", insert: "none" }, materials: ["亞麻"], features: ["雙面印花", "隱形拉鍊", "可拆洗"], audience: "喜歡東方美學的都市上班族", price: [45, 75], palette: ["#7A8B7F", "#E9E4D8", "#B9A58C"], vibe: "calm" },
  { id: "s2", title: "Circus clown pillow", keywords: ["小丑", "clown", "馬戲", "circus", "瘋", "wild", "鮮豔", "bright", "派對", "party"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "toile", selections: { fabric: "cotton_velvet", size: "18x18", embellishment: "piping", insert: "none" }, materials: ["絨布"], features: ["雙面印花", "滾邊", "隱形拉鍊"], audience: "喜歡大膽裝飾的年輕人", price: [50, 80], palette: ["#D94F3D", "#F2B705", "#1F6F8B"], vibe: "bold" },
  { id: "s3", title: "Plum blossom silk scarf", keywords: ["圍巾", "scarf", "絲", "silk", "梅", "plum", "花", "floral", "blossom"], category: "accessory", arcadeCategory: "Scarves", modelId: "japanese-botanical", selections: {}, materials: ["絲"], features: ["手工捲邊", "方巾", "可當頭巾"], audience: "喜歡東方美學的都市女性", price: [60, 120], palette: ["#E8C4C4", "#F4F1EA", "#55665A"], vibe: "calm" },
  { id: "s4", title: "Batik table runner", keywords: ["桌旗", "runner", "餐桌", "table", "蠟染", "batik", "印尼", "indonesia"], category: "table-linen", arcadeCategory: "Table Runners", modelId: "batik", selections: {}, materials: ["棉"], features: ["耐洗", "雙面可用"], audience: "常在家宴客的人", price: [40, 70], palette: ["#5B3A29", "#1F3B4D", "#E9E4D8"], vibe: "classic" },
  { id: "s5", title: "Art nouveau lampshade", keywords: ["燈", "lamp", "燈罩", "lampshade", "光", "light", "新藝術", "nouveau"], category: "lighting", arcadeCategory: "Drum Lampshades", modelId: "art-nouveau", selections: {}, materials: ["棉布", "金屬框"], features: ["暖光透光", "E27 通用"], audience: "重視氛圍燈光的租屋族", price: [70, 130], palette: ["#B9A58C", "#55665A", "#F4F1EA"], vibe: "classic" },
  { id: "s6", title: "Woodblock wave duvet", keywords: ["被套", "duvet", "床", "bed", "海", "wave", "浮世繪", "woodblock", "ukiyo"], category: "bedding", arcadeCategory: "Duvets", modelId: "japanese-woodblock", selections: {}, materials: ["細棉"], features: ["隱藏式扣", "親膚"], audience: "想把臥室變成度假感的人", price: [150, 260], palette: ["#1F6F8B", "#F4F1EA", "#2B2F2C"], vibe: "calm" },
  { id: "s7", title: "Marbled napkin set", keywords: ["餐巾", "napkin", "大理石", "marble", "marbled", "宴客", "dinner"], category: "table-linen", arcadeCategory: "Napkins", modelId: "marbled-paper", selections: {}, materials: ["亞麻"], features: ["四件組", "可機洗"], audience: "喜歡辦聚餐的人", price: [35, 60], palette: ["#7A8B7F", "#B9A58C", "#E9E4D8"], vibe: "classic" },
  { id: "s8", title: "Pocket square, Victorian floral", keywords: ["口袋巾", "pocket", "西裝", "suit", "紳士", "gentleman", "婚禮", "wedding"], category: "accessory", arcadeCategory: "Pocket Squares", modelId: "victorian-floral", selections: {}, materials: ["絲"], features: ["手工捲邊"], audience: "參加婚禮的男士", price: [30, 55], palette: ["#55665A", "#C98F94", "#F4F1EA"], vibe: "classic" },
  { id: "s9", title: "Tea towel, Ukrainian folk", keywords: ["茶巾", "towel", "廚房", "kitchen", "民俗", "folk", "烏克蘭"], category: "kitchen", arcadeCategory: "Tea Towels", modelId: "stamped-floral", selections: {}, materials: ["棉"], features: ["吸水", "掛環"], audience: "喜歡下廚的人", price: [18, 30], palette: ["#D94F3D", "#1F6F8B", "#F4F1EA"], vibe: "playful" },
  { id: "s10", title: "Outdoor pillow, tropical", keywords: ["戶外", "outdoor", "陽台", "balcony", "熱帶", "tropical", "棕櫚", "palm"], category: "home-textile", arcadeCategory: "Outdoor Decorative Pillows", modelId: "indian-textiles", selections: {}, materials: ["防水布"], features: ["防潑水", "抗 UV"], audience: "有陽台的租屋族", price: [50, 85], palette: ["#2E7D5B", "#F2B705", "#F4F1EA"], vibe: "playful" },
  { id: "s11", title: "Curtains, French floral", keywords: ["窗簾", "curtain", "法式", "french", "客廳", "living", "鄉村", "cottage"], category: "home-textile", arcadeCategory: "Curtains", modelId: "french-floral-wallpaper", selections: {}, materials: ["亞麻混紡"], features: ["遮光 60%", "吊帶式"], audience: "想換季改造客廳的人", price: [120, 220], palette: ["#C98F94", "#E9E4D8", "#7A8B7F"], vibe: "calm" },
  { id: "s12", title: "Floor pillow, Mughal", keywords: ["坐墊", "floor", "蒙兀兒", "mughal", "印度", "india", "冥想", "meditation", "瑜珈", "yoga"], category: "home-textile", arcadeCategory: "Floor Pillows", modelId: "mughal-watercolor", selections: {}, materials: ["棉"], features: ["加厚", "提把"], audience: "在家冥想或做瑜珈的人", price: [80, 130], palette: ["#B9A58C", "#D94F3D", "#F4F1EA"], vibe: "classic" },
  { id: "s13", title: "Impressionist placemats", keywords: ["餐墊", "placemat", "印象派", "impression", "莫內", "monet", "早餐", "breakfast"], category: "table-linen", arcadeCategory: "Placemats", modelId: "impressionism", selections: {}, materials: ["棉"], features: ["四件組", "防滑底"], audience: "注重早餐儀式感的人", price: [30, 55], palette: ["#7A8B7F", "#C98F94", "#F2B705"], vibe: "calm" },
  { id: "s14", title: "Quilt, Biedermeier", keywords: ["被", "quilt", "拼布", "patchwork", "奧地利", "austrian", "溫暖", "cozy"], category: "bedding", arcadeCategory: "Quilts", modelId: "austrian-biedermeier", selections: {}, materials: ["棉", "鋪棉"], features: ["車縫菱格", "可機洗"], audience: "喜歡溫暖居家感的人", price: [180, 300], palette: ["#E9E4D8", "#B9A58C", "#55665A"], vibe: "classic" },
  { id: "s15", title: "Fabric by the yard, toile", keywords: ["布", "fabric", "整碼", "yard", "自己做", "diy", "縫", "sew"], category: "fabric", arcadeCategory: "Fabric By The Yard", modelId: "toile", selections: {}, materials: ["棉"], features: ["每碼計價", "可客製"], audience: "自己做手作的人", price: [25, 45], palette: ["#1F6F8B", "#F4F1EA", "#2B2F2C"], vibe: "classic" },
  { id: "s16", title: "Cat pattern pillow", keywords: ["貓", "cat", "狗", "dog", "寵物", "pet", "可愛", "cute"], category: "home-textile", arcadeCategory: "Decorative Pillows", modelId: "estonian-watercolor", selections: { fabric: "canvas", size: "16x16", embellishment: "none", insert: "none" }, materials: ["棉"], features: ["雙面印花", "隱形拉鍊"], audience: "養寵物的年輕人", price: [40, 65], palette: ["#F2B705", "#C98F94", "#F4F1EA"], vibe: "playful" },
  { id: "s17", title: "Dainty gemstone ring", keywords: ["戒指", "ring", "寶石", "gem", "gemstone", "求婚", "proposal", "首飾", "jewelry"], category: "jewelry", arcadeCategory: "Dainty Gemstone Ring", modelId: null, selections: {}, materials: ["14K 金", "寶石"], features: ["可選寶石", "可刻字"], audience: "想送有故事的禮物的人", price: [150, 400], palette: ["#B9A58C", "#F4F1EA", "#55665A"], vibe: "classic" },
  { id: "s18", title: "Pendant necklace", keywords: ["項鍊", "necklace", "墜", "pendant", "禮物", "gift", "生日", "birthday"], category: "jewelry", arcadeCategory: "Pendant Necklace", modelId: null, selections: {}, materials: ["925 銀"], features: ["可刻字", "可調鍊長"], audience: "想送紀念禮物的人", price: [90, 220], palette: ["#B9A58C", "#F4F1EA", "#2B2F2C"], vibe: "classic" },
  { id: "s19", title: "Gilded age frieze shams", keywords: ["枕套", "sham", "鍍金", "gilded", "華麗", "luxury", "飯店", "hotel"], category: "bedding", arcadeCategory: "Shams", modelId: "gilded-age", selections: {}, materials: ["細棉"], features: ["一對", "信封式"], audience: "想要飯店感臥室的人", price: [60, 110], palette: ["#B9A58C", "#2B2F2C", "#E9E4D8"], vibe: "classic" },
  { id: "s20", title: "Tapestry-style tall lampshade", keywords: ["落地燈", "tall", "掛毯", "tapestry", "歐洲", "european", "古典", "classic"], category: "lighting", arcadeCategory: "Tall Drum Lampshades", modelId: "european-tapestry", selections: {}, materials: ["棉布"], features: ["暖光透光"], audience: "喜歡古典風格的人", price: [90, 160], palette: ["#5B3A29", "#B9A58C", "#55665A"], vibe: "classic" },
];

const VIBES: Record<Seed["vibe"], { mission: string; voice: string; tagline: string }> = {
  calm: { mission: "把靜謐的美感帶進日常生活", voice: "淡雅、含蓄、帶一點詩意", tagline: "安靜地好看" },
  bold: { mission: "讓每個房間都有自己的主張", voice: "大膽、直接、玩心很重", tagline: "放肆一點" },
  playful: { mission: "把可愛和幽默做成每天用得到的東西", voice: "輕鬆、親切、有點調皮", tagline: "每天都想看到它" },
  classic: { mission: "用經典紋樣做出會留很久的物件", voice: "沉穩、講究、重細節", tagline: "經得起時間的樣子" },
};

const hasCJK = (s: string) => /[㐀-鿿]/.test(s);

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
    return { seed: s, matched, score: matched.length + (matched.some((k) => hasCJK(k) === hasCJK(input)) ? 0.5 : 0) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  const best = top[0]?.seed ?? SEEDS[0];
  const maxScore = top[0]?.score ?? 0;
  const confidence = Math.min(0.95, 0.35 + maxScore * 0.15 + top.length * 0.05);

  // vibe from words in the input, else from the best seed
  const vibe: Seed["vibe"] = /瘋|wild|bright|鮮豔|放肆|loud|neon/.test(text) ? "bold"
    : /可愛|cute|fun|玩|kawaii/.test(text) ? "playful"
    : /淡雅|calm|mist|霧|quiet|zen/.test(text) ? "calm"
    : best.vibe;
  const v = VIBES[vibe];
  const palette = vibe === best.vibe ? best.palette : (SEEDS.find((s) => s.vibe === vibe)?.palette ?? best.palette);

  // name: first clause of the user's words + the product noun from the best match
  const SINGULAR: Record<string, [string, string]> = { "Decorative Pillows": ["Pillow", "抱枕"], "Outdoor Decorative Pillows": ["Outdoor Pillow", "戶外抱枕"], Scarves: ["Scarf", "圍巾"], "Table Runners": ["Table Runner", "桌旗"], "Drum Lampshades": ["Lampshade", "燈罩"], "Tall Drum Lampshades": ["Lampshade", "燈罩"], Duvets: ["Duvet", "被套"], Napkins: ["Napkin Set", "餐巾"], "Pocket Squares": ["Pocket Square", "口袋巾"], "Tea Towels": ["Tea Towel", "茶巾"], Curtains: ["Curtains", "窗簾"], "Floor Pillows": ["Floor Pillow", "坐墊"], Placemats: ["Placemats", "餐墊"], Quilts: ["Quilt", "拼布被"], "Fabric By The Yard": ["Fabric", "布料"], "Dainty Gemstone Ring": ["Ring", "戒指"], "Pendant Necklace": ["Necklace", "項鍊"], Shams: ["Shams", "枕套"] };
  const [nounEn, nounZh] = SINGULAR[best.arcadeCategory] ?? [best.arcadeCategory, best.arcadeCategory];
  const zh = hasCJK(input);
  const nounOut = zh ? nounZh : nounEn;
  const clause = input.trim().split(/[,，。.;；!！?？:：]/)[0].trim();
  const stop = /^(a|an|the|some|my|our)\s+/i;
  let name: string;
  if (zh) {
    const short = clause.replace(/^(我想要|我要|想要|做一個|一個|幫我做)/, "").slice(0, 10);
    name = short.includes(nounZh) ? short : `${short}${nounZh}`;
  } else {
    const words = clause.replace(stop, "").split(/\s+/).filter(Boolean).slice(0, 5);
    const titled = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    name = new RegExp(nounEn.split(" ")[0], "i").test(titled) ? titled : `${titled} ${nounEn}`;
  }
  const head = zh ? clause.slice(0, 6) : (clause.replace(stop, "").split(/\s+/)[0] ?? "Studio");
  const features = [...new Set(top.flatMap((t) => t.seed.features))].slice(0, 4);
  const materials = [...new Set(top.flatMap((t) => t.seed.materials))].slice(0, 2);
  const [lo, hi] = top.length ? [Math.min(...top.map((t) => t.seed.price[0])), Math.max(...top.map((t) => t.seed.price[1]))] : best.price;

  const spec: ProductSpec = {
    name,
    tagline: v.tagline,
    concept: `${input.trim()}。以「${best.title}」等相似案例為基礎，做成${nounOut}。`,
    category: best.category,
    target_audience: best.audience,
    features: features.map((text, i) => ({ id: `f${i + 1}`, text })),
    materials: materials.map((name, i) => ({ id: `m${i + 1}`, name })),
    colorways: palette.slice(0, 2).map((hex, i) => ({ id: `c${i + 1}`, name: i === 0 ? "主色" : "輔色", hex })),
    price_target: { currency: "USD", min: lo, max: hi },
    images: [],
    sourcing_notes: `由 arcade.ai 合作工匠製作，單件起訂。預測品類：${best.arcadeCategory}。`,
    arcade: { modelId: best.modelId, prompt: "", patternId: null, categoryId: null, categoryName: best.arcadeCategory, selections: best.selections, productId: null, unitPrice: null, maker: null },
  };

  const styleHint = best.modelId ? `，風格用 ${best.modelId}` : "";
  const sel = Object.keys(best.selections).length ? `，${Object.values(best.selections).slice(0, 2).join(" ")}` : "";
  return {
    input,
    confidence: Number(confidence.toFixed(2)),
    similar: top.map((t) => ({ id: t.seed.id, title: t.seed.title, score: t.score, matched: t.matched })),
    brand: { name: zh ? `${head}工作室` : `${head[0].toUpperCase()}${head.slice(1)} Studio`, identity: { mission: v.mission, voice: v.voice, palette } },
    product: { name, spec },
    arcade: { categoryName: best.arcadeCategory, modelId: best.modelId, selections: best.selections },
    agentInstruction: `${input.trim()}${styleHint}${sel}`,
    basis: top.length ? `根據 ${top.length} 個相似案例預測（${top.map((t) => t.seed.title).join("、")}）` : "沒有相似案例，使用預設值",
  };
}
