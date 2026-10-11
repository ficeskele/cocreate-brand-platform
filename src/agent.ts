/**
 * concept agent: Claude designs a new ProductSpec via tool_use, then the backend
 * generates the real pattern + product on arcade.ai and opens a Proposal.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { addMessage, all, appendRevision, getBrand, getProduct, getRevision, id, one, run, tx, type BrandIdentity } from "./db.js";
import { ProductSpec } from "./spec.js";
import * as arcade from "./arcade.js";
import { cacheImage } from "./images.js";

let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

// ---- submit_spec schema: ProductSpec minus server-filled fields, plus what we need to call arcade.ai ----
const SubmitSpec = z.object({
  summary: z.string().describe("English, at most three sentences: what changed, which style and category were chosen, and why"),
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
  return `You are the product concept designer on the co-creation team for the brand "${brand.name}". Your output becomes a real physical product: arcade.ai generates the pattern and an artisan makes it.

Brand identity:
- mission: ${brand.identity.mission}
- voice: ${brand.identity.voice}
- palette: ${brand.identity.palette.join(", ")}

How to work:
1. Call list_styles and list_categories first, then pick one style modelId and one print category.
2. Call get_category_options to confirm the size and material you want exist (canManufacture must be true), and hand back the returned selections exactly as given.
3. Deliver only through submit_spec. Do not answer in plain text.

Rules:
- Keep every field the user did not ask you to change exactly as is. Keep existing ids on array elements and give new elements new ids (for example f4, m3, c2).
- Write name, tagline and concept in English, in the brand's voice.
- Write arcade.prompt in English, describing the scene, composition, style and colors. Do not mention the product name or the brand name.
- colorways hex values should echo the brand palette.
- summary: English, at most three sentences: what changed, which style and category you chose, and why.`;
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
          `Current ProductSpec (main head):\n${JSON.stringify(ctx.inputSpec, null, 2)}`,
          `Recent discussion:\n${ctx.recent.map((m) => `[${m.author_type}:${m.author_id}] ${m.body}`).join("\n")}`,
          `User instruction: ${ctx.instruction}`,
          "Follow the working steps, finish the design, and deliver it with submit_spec.",
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
          messages.push({ role: "user", content: "Deliver with the submit_spec tool. Do not answer in plain text." });
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

/**
 * Simple mode (AGENT_MOCK_DESIGN=1, no Claude credentials): no LLM. The user's instruction plus the
 * product's concept and tagline become the arcade.ai prompt verbatim. Text fields are left untouched.
 * Size like "20x20" and a fabric keyword in the instruction are honoured; otherwise category defaults apply.
 */
function simpleDesign(input: ProductSpec, instruction: string, categoryId: string): SubmitSpec {
  const text = `${instruction} ${input.concept} ${input.tagline}`;
  const size = /(\d{1,2})\s*[x×]\s*(\d{1,2})/i.exec(instruction);
  const fabricWords: Array<[RegExp, string]> = [
    [/velvet/i, "cotton_velvet"], [/soft linen/i, "soft_linen"], [/linen/i, "linen"], [/fine cotton/i, "fine_cotton"],
  ];
  const fabric = fabricWords.find(([re]) => re.test(instruction))?.[1];
  const selections: Record<string, string> = { fabric: fabric ?? "canvas", size: size ? `${size[1]}x${size[2]}` : "18x18", embellishment: "none", insert: "none" };
  return {
    summary: `Simple mode (no Claude): generated an arcade.ai pattern from your words "${instruction}" and the product concept, then built a Decorative Pillow (${selections.fabric}, ${selections.size}). Text fields were not rewritten.`,
    spec: {
      // Versions need a distinguishable name in lists; the rest of the text stays untouched.
      name: `${input.name} · ${instruction.replace(/\s+/g, " ").slice(0, 24)}`,
      tagline: input.tagline,
      concept: input.concept,
      category: input.category,
      target_audience: input.target_audience,
      features: input.features,
      materials: input.materials,
      colorways: input.colorways,
      sourcing_notes: input.sourcing_notes || "Made to order by an arcade.ai partner artisan, from a single unit.",
    },
    arcade: {
      prompt: `${instruction}. ${input.concept}. ${input.tagline}`.slice(0, 1000),
      modelId: "",
      categoryId,
      selections,
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
      "SELECT author_type, author_id, body FROM message WHERE product_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10",
      product.id,
    ).reverse();

    // 2. design: Claude tool loop (or a canned design when AGENT_MOCK_DESIGN=1, the demo fallback)
    setRun({ stage: "designing" });
    let submitted: SubmitSpec | null = null;
    const cats = await arcade.listCategories();
    const styles = await arcade.listModels();
    if (process.env.AGENT_MOCK_DESIGN === "1") {
      const pillows = cats.find((c) => c.world === "print" && /decorative pillow/i.test(c.name)) ?? cats.find((c) => c.world === "print");
      if (!pillows) throw new Error("arcade.ai returned no print categories");
      submitted = simpleDesign(inputSpec, agentRun.instruction, pillows.categoryId);
      toolCalls.push({ tool: "simple_design", input: { instruction: agentRun.instruction }, output: submitted });
      setRun({ tool_calls: JSON.stringify(toolCalls) });
    } else {
      submitted = await designWithClaude({ brand, inputSpec, recent, instruction: agentRun.instruction, toolCalls, onToolCall: () => setRun({ tool_calls: JSON.stringify(toolCalls) }) });
    }

    // 3. announce the plan
    const catName = cats.find((c) => c.categoryId === submitted.arcade.categoryId)?.name ?? submitted.arcade.categoryId;
    const styleName = submitted.arcade.modelId ? (styles.find((m) => m.modelId === submitted.arcade.modelId)?.name ?? submitted.arcade.modelId) : "arcade.ai auto";
    const selLabel = Object.entries(submitted.arcade.selections).map(([k, v]) => `${k}=${v}`).join(", ");
    say(`Design done. I will generate the pattern on arcade.ai in the "${styleName}" style and make it a ${catName} (${selLabel}). Generation takes about 1 to 2 minutes.`);

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
        modelId: submitted.arcade.modelId || null,
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
    const proposalId = id();
    const summary = submitted.summary;
    const revId = tx(() => {
      run(
        "INSERT INTO branch (id, product_id, name, kind, head_revision_id, created_by_type, created_by_id) VALUES (?,?,?,?,?,?,?)",
        branchId, product.id, branchName, "agent", agentRun.input_revision_id, "agent", "concept",
      );
      const rev = appendRevision({
        branchId,
        content: newSpec,
        summary,
        authorType: "agent",
        authorId: "concept",
        onBehalfOf: agentRun.triggered_by_user_id,
        agentRunId: runId,
      });
      run(
        "INSERT INTO proposal (id, product_id, source_branch_id, source_revision_id, status, opened_by_type, opened_by_id, summary) VALUES (?,?,?,?,?,?,?,?)",
        proposalId, product.id, branchId, rev, "open", "agent", "concept", summary,
      );
      return rev;
    });
    say(`${submitted.summary}\n\narcade.ai product: ${arcadeProduct.title} (${arcadeProduct.selectionLabel}), made by ${arcadeProduct.maker.name}, unit price ${arcadeProduct.unitPrice.currency} ${arcadeProduct.unitPrice.amount}. Opened Proposal ${proposalId}; please review and merge.`);
    setRun({ stage: "done", status: "succeeded", work_branch_id: branchId, output_revision_id: revId, output_proposal_id: proposalId });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[agent ${runId}] failed:`, e);
    try {
      setRun({ status: "failed", error: msg });
      say(`Sorry, this design run failed: ${msg}`);
    } catch (e2) {
      console.error(`[agent ${runId}] could not record the failure:`, e2);
    }
  }
}
