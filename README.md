# Co-Create Brand Platform (built on arcade.ai)

Brand → Product (versioned ProductSpec) → `@agent:concept` → Claude designs + **arcade.ai** generates the pattern and the physical product → Proposal → a human merges → Release → open store (arcade.ai checkout).

> "Arcade" here always means **arcade.ai** (the AI physical-product platform), not arcade.dev. See the naming note at the top of `PLAN.md`.

## Run it

```bash
pnpm install
cp .env.example .env   # fill in ARCADE_API_KEY (arcade.ai) and ANTHROPIC_API_KEY
scripts/serve.sh         # Claude does the design for real
scripts/serve.sh --mock  # fallback without ANTHROPIC_API_KEY: fixed design, arcade.ai generation still runs
./demo.sh                # run the full demo path with curl (about 1 to 2 minutes, generates on arcade.ai for real)
```

The server listens on `http://localhost:3456`. The root path serves the one-page UI (left column: brands and products; main area: product state, discussion thread with agent progress, Proposal diff and merge, Release and store). Switch between alice and bob in the top right; the API's `X-User-Id` header follows. `#product=<id>` opens a product directly.

Reset data: stop the server, run `rm -f data/app.db*` (the WAL and SHM files too), and start again.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | /brands | `{name, slug, identity:{mission, voice, palette[]}}` |
| GET | /brands | all brands, with products |
| GET | /brands/:id | with products |
| POST | /brands/:id/products | `{name, spec}` → product, main branch, revision #1 |
| GET | /products/:id | main head spec, branches, open proposals, last 20 messages |
| POST | /products/:id/messages | `{body}`; returns `agent_run_id` when the body contains `@agent:concept` |
| GET | /products/:id/messages | |
| GET | /agent-runs/:id | `status`, `stage` (designing / generating / building / done), `tool_calls` |
| GET | /proposals/:id | source and main specs + diff |
| POST | /proposals/:id/merge | |
| GET | /products/:id/revisions | history of main |
| GET | /products/:id/coauthors | includes merged agent revisions |
| POST | /products/:id/releases | |
| GET | /releases/:id | with export_payload |
| POST | /releases/:id/open-store | arcade.ai `checkouts/create` → `{checkout_url}` |
| GET | /images/:file | images downloaded and cached from arcade.ai (its signed URLs expire) |
| GET | /health | |

## Layout

```
src/index.ts    Hono routes
src/db.ts       SQLite schema, seed, revision helpers
src/spec.ts     ProductSpec zod schema, diff
src/arcade.ts   arcade.ai client (POST JSON, retry, job polling)
src/images.ts   downloads arcade.ai images into data/images/
src/agent.ts    concept agent: designWithClaude → arcade.ai generation → branch/revision/proposal
src/release.ts  coauthors, export_payload, open-store
public/index.html  one-page frontend (vanilla JS, polls every 2 seconds)
demo.sh         full demo path
scripts/        serve.sh, arcade-smoke.ts, ui-clickthrough.mjs (headless Chrome clicks through Release and Open store)
```

## Merchant prototype (`merchant/`, Shopify-side demo)

The merchant experience lives independently in [`merchant/`](merchant/README.md). It uses React + TypeScript + Vite + Tailwind and does not require the creator backend or any API keys. It is a separate npm project (not part of the pnpm workspace); the creator app and the commands above are unchanged.

```bash
cd merchant
npm ci
npm run dev          # http://127.0.0.1:5173
npm run build        # TypeScript check + production build
npm test             # service and persistence tests
npm run test:e2e     # full browser flow; requires Google Chrome
```

Implemented: discovery/search/category filters/sorting, six ideas with eighteen distinct branches, idea and branch detail, pending applications with proposed creator commission terms and explicit Demo Controls, approval-gated draft preparation, live commission and estimated profit calculations, and browser-persisted mock Shopify drafts. All data and local concept illustrations are mock; production costs are not Arcade quotations, and no real Shopify, Arcade, or commission payout API is called by this app.

**Demo:** Discover an idea → select a branch → Apply to Sell → confirm → My Applications → Demo Controls: Approve → Prepare Product Draft → Create Product Draft → My Product Drafts.

See the [merchant README](merchant/README.md) for architecture, limitations, preview/setup instructions, and the [proposed API contracts](merchant/docs/api-contracts.md) for future MUP endpoints and server-side Shopify `productCreate` / `productVariantsBulkUpdate` integration. These endpoints are proposals, not existing backend capabilities.

> Known gap: `merchant/src/data/catalog.ts` (ideas, branches, categories, demo merchant, `getCreator`) was not included in PR #2 because the old `data/` ignore rule swallowed it. It is being rewritten; until it lands, `npm run build` and `npm test` in `merchant/` fail on that missing module.
