/**
 * concept agent: Claude designs a new ProductSpec via tool_use, then the backend
 * generates the real pattern + product on arcade.ai and opens a Proposal.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { addMessage, all, appendRevision, getBrand, getProduct, getRevision, id, one, run, type BrandIdentity } from "./db.js";
import { ProductSpec } from "./spec.js";
import * as arcade from "./arcade.js";
import { cacheImage } from "./images.js";

let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// ---- submit_spec schema: ProductSpec minus server-filled fields, plus what we need to call arcade.ai ----
const SubmitSpec = z.object({
  summary: z.string().describe("繁體中文，三句內：改了什麼、選了什麼風格與品類、為什麼"),
  spec: z.object({
    name: z.string(),
    tagline: z.string(),
    concept: z.string(),
    category: z.string(),
    target_audience: z.string(),
    features: z.array(z.object({ id: z.string(), text: z.string() })),
    materials: z.array(z.object({ id: z.string(), name: z.string() })),
    colorways: z.array(z.object({ id: z.string(), name: z.string(), hex: z.string() })),
    sourcing_notes: z.string(),
  }),
  arcade: z.object({
    prompt: z.string().describe("English prompt for arcade.ai pattern generation: scene, motifs, style. No product names."),
    modelId: z.string().describe("A modelId from list_styles"),
    categoryId: z.string().describe("A print categoryId from list_categories"),
    selections: z.record(z.string(), z.string()).describe("Complete selections object as returned by get_category_options with canManufacture=true"),
  }),
});
type SubmitSpec = z.infer<typeof SubmitSpec>;

const tools: Anthropic.Tool[] = [
  {
    name: "list_styles",
    description: "List the arcade.ai pattern style models (modelId + name). Call this before choosing a modelId.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "list_categories",
    description: "List the arcade.ai product categories that can be manufactured (pillows, scarves, lampshades, napkins...). Only `print` categories can be used with submit_spec.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "get_category_options",
    description:
      "Get a category's options (fabric, size, embellishment...) from arcade.ai. Pass selections={} first to get the defaults; then pass only the values you want changed. The response's `selections` is the complete object to send to submit_spec once canManufacture is true.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        selections: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["categoryId", "selections"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_spec",
    description: "Deliver the final ProductSpec, the summary, and the arcade.ai generation parameters. This ends your work.",
    strict: true,
    input_schema: z.toJSONSchema(SubmitSpec, { target: "draft-7" }) as Anthropic.Tool.InputSchema,
  },
];

function systemPrompt(brand: { name: string; identity: BrandIdentity }) {
  return `你是品牌「${brand.name}」共創團隊的產品概念設計師。你的產出會被做成真實的實體商品（由 arcade.ai 生成圖樣並由工匠製作）。

品牌 identity：
- mission: ${brand.identity.mission}
- voice: ${brand.identity.voice}
- palette: ${brand.identity.palette.join(", ")}

工作方式：
1. 先呼叫 list_styles 與 list_categories，挑一個風格 modelId 與一個 print 類別。
2. 呼叫 get_category_options 確認你要的尺寸與材質存在（canManufacture 必須為 true），並把回傳的完整 selections 原樣交付。
3. 最後只能透過 submit_spec 交付，不要用文字回答。

規則：
- 使用者沒叫你動的欄位原樣保留；陣列元素保留原 id，新增的用新 id（例如 f4、m3、c2）。
- name、tagline、concept 用繁體中文，依品牌 voice 撰寫。
- arcade.prompt 用英文，描述畫面內容、構圖、風格與用色，不要寫商品名稱或品牌名。
- colorways 的 hex 要呼應品牌 palette。
- summary 繁體中文三句內：改了什麼、選了什麼風格與品類、為什麼。`;
}


interface DesignCtx {
  brand: { name: string; identity: BrandIdentity };
  inputSpec: ProductSpec;
  recent: Array<{ author_type: string; author_id: string; body: string }>;
  instruction: string;
  toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
  onToolCall: () => void;
}

/** Ask Claude to design the new spec. Returns once submit_spec is called. */
async function designWithClaude(ctx: DesignCtx): Promise<SubmitSpec> {
    let submitted: SubmitSpec | null = null;
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          `目前的 ProductSpec（main head）：\n${JSON.stringify(ctx.inputSpec, null, 2)}`,
          `最近的討論：\n${ctx.recent.map((m) => `[${m.author_type}:${m.author_id}] ${m.body}`).join("\n")}`,
          `使用者的指示：${ctx.instruction}`,
          "請依照工作方式完成設計並用 submit_spec 交付。",
        ].join("\n\n"),
      },
    ];
    let validationRetries = 0;

    for (let round = 0; round < 8 && !submitted; round++) {
      const response = await client().messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: systemPrompt(ctx.brand),
        tools,
        tool_choice: { type: "auto" },
        output_config: { effort: "medium" },
        messages,
      });
      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason === "refusal") throw new Error("Claude refused the request");
      const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (uses.length === 0) {
        if (response.stop_reason === "end_turn") {
          messages.push({ role: "user", content: "請用 submit_spec 工具交付，不要用文字回答。" });
          continue;
        }
        throw new Error(`unexpected stop_reason ${response.stop_reason}`);
      }
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of uses) {
        let output: unknown;
        let isError = false;
        try {
          if (use.name === "list_styles") output = await arcade.listModels();
          else if (use.name === "list_categories") output = (await arcade.listCategories()).map(({ categoryId, name, world }) => ({ categoryId, name, world }));
          else if (use.name === "get_category_options") {
            const inp = use.input as { categoryId: string; selections: Record<string, string> };
            const cat = await arcade.getCategory(inp.categoryId, inp.selections);
            output = {
              name: cat.name,
              world: cat.world,
              canManufacture: cat.canManufacture,
              selections: cat.selections,
              options: cat.options.map((o) => ({ key: o.key, values: o.values.filter((v) => v.available).map((v) => `${v.value} (${v.label})`) })),
            };
          } else if (use.name === "submit_spec") {
            const parsed = SubmitSpec.safeParse(use.input);
            if (!parsed.success) {
              if (validationRetries++ >= 1) throw new Error(`submit_spec invalid: ${parsed.error.message}`);
              output = { error: "invalid submit_spec input", issues: parsed.error.issues };
              isError = true;
            } else {
              submitted = parsed.data;
              output = { ok: true };
            }
          } else throw new Error(`unknown tool ${use.name}`);
        } catch (e) {
          output = { error: (e as Error).message };
          isError = true;
        }
        ctx.toolCalls.push({ tool: use.name, input: use.input, output });
        ctx.onToolCall();
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output), is_error: isError });
      }
      messages.push({ role: "user", content: results });
    }
    if (!submitted) throw new Error("agent did not submit a spec within 8 rounds");
    return submitted;
}

/** Demo fallback when no Claude credentials are available: a fixed, known-good design. */
function mockDesign(input: ProductSpec, instruction: string): SubmitSpec {
  return {
    summary: `依指示「${instruction}」更新：加入春季梅花元素，改用 East Asian 風格生成圖樣，做成 20x20 亞麻抱枕。`,
    spec: {
      name: `${input.name}・春季限定`,
      tagline: "梅花初綻，山嵐未散",
      concept: `${input.concept} 春季限定版以晨霧中的梅花與梯田茶園為主題。`,
      category: input.category,
      target_audience: input.target_audience,
      features: [...input.features, { id: `f${input.features.length + 1}`, text: "春季限定圖樣，限量製作" }],
      materials: [{ id: "m1", name: "亞麻" }],
      colorways: [...input.colorways, { id: `c${input.colorways.length + 1}`, name: "梅粉", hex: "#E8C4C4" }],
      sourcing_notes: "由 arcade.ai 合作工匠製作，單件起訂。",
    },
    arcade: {
      prompt: "A serene mountain tea garden at dawn with soft mist, terraced tea plants, blooming plum blossoms and small songbirds, elegant East Asian ink and watercolor style, muted sage green and cream palette",
      modelId: "chinoiserie",
      categoryId: "0ef267de-f8c2-4a93-89a3-63be809f68e2",
      selections: { fabric: "linen", size: "20x20", embellishment: "none", insert: "none" },
    },
  };
}

export async function runConceptAgent(runId: string) {
  const agentRun = one<{
    id: string; product_id: string; triggered_by_user_id: string; instruction: string; input_revision_id: string;
  }>("SELECT * FROM agent_run WHERE id = ?", runId);
  if (!agentRun) return;
  const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
  const setRun = (fields: Record<string, unknown>) => {
    const keys = Object.keys(fields);
    run(
      `UPDATE agent_run SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      ...keys.map((k) => fields[k]),
      runId,
    );
  };
  const say = (body: string) => addMessage({ productId: agentRun.product_id, authorType: "agent", authorId: "concept", body, agentRunId: runId });

  try {
    // 1. load context
    const product = getProduct(agentRun.product_id)!;
    const brand = getBrand(product.brand_id)!;
    const inputRev = getRevision(agentRun.input_revision_id)!;
    const inputSpec = ProductSpec.parse(inputRev.content);
    const recent = all<{ author_type: string; author_id: string; body: string }>(
      "SELECT author_type, author_id, body FROM message WHERE product_id = ? ORDER BY created_at DESC LIMIT 10",
      product.id,
    ).reverse();

    // 2. design: Claude tool loop (or a canned design when AGENT_MOCK_DESIGN=1, the demo fallback)
    setRun({ stage: "designing" });
    let submitted: SubmitSpec | null = null;
    if (process.env.AGENT_MOCK_DESIGN === "1") {
      submitted = mockDesign(inputSpec, agentRun.instruction);
      toolCalls.push({ tool: "mock_design", input: { instruction: agentRun.instruction }, output: submitted });
      setRun({ tool_calls: JSON.stringify(toolCalls) });
    } else {
      submitted = await designWithClaude({ brand, inputSpec, recent, instruction: agentRun.instruction, toolCalls, onToolCall: () => setRun({ tool_calls: JSON.stringify(toolCalls) }) });
    }

    // 3. announce the plan
    const cats = await arcade.listCategories();
    const styles = await arcade.listModels();
    const catName = cats.find((c) => c.categoryId === submitted.arcade.categoryId)?.name ?? submitted.arcade.categoryId;
    const styleName = styles.find((m) => m.modelId === submitted.arcade.modelId)?.name ?? submitted.arcade.modelId;
    const selLabel = Object.entries(submitted.arcade.selections).map(([k, v]) => `${k}=${v}`).join(", ");
    say(`設計完成。我會用「${styleName}」風格在 arcade.ai 生成圖樣，做成 ${catName}（${selLabel}）。生成約需 1 到 2 分鐘。`);

    // 4. generate on arcade.ai: pattern, then product with the chosen selections
    setRun({ stage: "generating" });
    const patJob = await arcade.createPattern({ prompt: submitted.arcade.prompt, modelId: submitted.arcade.modelId });
    setRun({ arcade_job_id: patJob.jobId });
    const patDone = await arcade.pollJob(patJob.jobId);
    const patternId = patDone.result?.patternId;
    if (!patternId) throw new Error("arcade.ai pattern job succeeded without a patternId");

    setRun({ stage: "building" });
    let prodJob: arcade.Job;
    try {
      prodJob = await arcade.createProduct({ patternId, categoryId: submitted.arcade.categoryId, selections: submitted.arcade.selections });
    } catch (e) {
      if (e instanceof arcade.ArcadeError && e.status === 400 && /fit|aspect/i.test(String(JSON.stringify(e.body)))) {
        prodJob = await arcade.createProduct({ patternId, categoryId: submitted.arcade.categoryId, selections: submitted.arcade.selections, fit: { mode: "fill" } });
      } else throw e;
    }
    setRun({ arcade_job_id: prodJob.jobId });
    const prodDone = await arcade.pollJob(prodJob.jobId);
    const productId = prodDone.result?.productId;
    if (!productId) throw new Error("arcade.ai product job succeeded without a productId");

    // 5. fetch images + price, cache images locally (arcade.ai URLs expire)
    const [pattern, arcadeProduct] = await Promise.all([arcade.getPattern(patternId), arcade.getProduct(productId)]);
    const images = [
      { url: await cacheImage(pattern.imageUrl, `${patternId}-pattern`), role: "pattern" as const },
      ...(await Promise.all(
        arcadeProduct.images.slice(0, 2).map(async (img, i) => ({
          url: await cacheImage(img.url, `${productId}-${i === 0 ? "hero" : "closeup"}`),
          role: i === 0 ? ("hero" as const) : ("closeup" as const),
        })),
      )),
    ];
    const price = Number(arcadeProduct.unitPrice.amount);
    const newSpec: ProductSpec = ProductSpec.parse({
      ...inputSpec,
      ...submitted.spec,
      price_target: { currency: arcadeProduct.unitPrice.currency, min: price, max: price },
      images,
      arcade: {
        modelId: submitted.arcade.modelId,
        prompt: submitted.arcade.prompt,
        patternId,
        categoryId: submitted.arcade.categoryId,
        categoryName: catName,
        selections: arcadeProduct.selections,
        productId,
        unitPrice: arcadeProduct.unitPrice,
        maker: arcadeProduct.maker,
      },
    });

    // 6. branch -> revision -> proposal -> message
    const branchId = id();
    const branchName = `agent/concept/${runId.slice(0, 8)}`;
    run(
      "INSERT INTO branch (id, product_id, name, kind, head_revision_id, created_by_type, created_by_id) VALUES (?,?,?,?,?,?,?)",
      branchId, product.id, branchName, "agent", agentRun.input_revision_id, "agent", "concept",
    );
    const revId = appendRevision({
      branchId,
      content: newSpec,
      summary: submitted.summary,
      authorType: "agent",
      authorId: "concept",
      onBehalfOf: agentRun.triggered_by_user_id,
      agentRunId: runId,
    });
    const proposalId = id();
    run(
      "INSERT INTO proposal (id, product_id, source_branch_id, source_revision_id, status, opened_by_type, opened_by_id, summary) VALUES (?,?,?,?,?,?,?,?)",
      proposalId, product.id, branchId, revId, "open", "agent", "concept", submitted.summary,
    );
    say(`${submitted.summary}\n\narcade.ai 商品：${arcadeProduct.title}（${arcadeProduct.selectionLabel}），製作者 ${arcadeProduct.maker.name}，單價 ${arcadeProduct.unitPrice.currency} ${arcadeProduct.unitPrice.amount}。已開 Proposal ${proposalId}，請審閱後 merge。`);
    setRun({ stage: "done", status: "succeeded", work_branch_id: branchId, output_revision_id: revId, output_proposal_id: proposalId });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[agent ${runId}] failed:`, e);
    setRun({ status: "failed", error: msg });
    say(`抱歉，這次設計失敗了：${msg}`);
  }
}
