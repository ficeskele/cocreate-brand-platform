# 共創品牌平台（built on arcade.ai）

## MUP merchant prototype (Shopify-side demo)

The merchant experience lives independently in [`merchant/`](merchant/README.md). It uses React + TypeScript + Vite + Tailwind and does not require the creator backend or any API keys. The existing creator app and its commands below are unchanged.

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

---

Brand → Product（版本化 ProductSpec）→ `@agent:concept` → Claude 設計 + **arcade.ai** 生成圖樣與實體商品 → Proposal → 人 merge → Release → 開店（arcade.ai checkout）。

> 這裡的 Arcade 一律指 **arcade.ai**（AI 實體商品平台），不是 arcade.dev。詳見 `PLAN.md` 開頭的名稱澄清。

## 跑起來

```bash
pnpm install
cp .env.example .env   # 填 ARCADE_API_KEY（arcade.ai）與 ANTHROPIC_API_KEY
scripts/serve.sh         # 真的用 Claude 設計
scripts/serve.sh --mock  # 沒有 ANTHROPIC_API_KEY 時的備案：固定設計，arcade.ai 生成照常
./demo.sh                # 用 curl 跑完整條 demo 路線（約 1 到 2 分鐘，會在 arcade.ai 真的生成）
```

伺服器在 `http://localhost:3456`，根路徑就是一頁式介面（左欄品牌與商品，主區商品現況、討論串與 agent 進度、Proposal diff 與 merge、Release 與開店）。右上角切換 alice / bob 身分，API 的 `X-User-Id` 跟著變。`#product=<id>` 可直接開某個商品。

重置資料：`rm data/app.db` 再重啟。

## 端點

| Method | Path | 做什麼 |
|---|---|---|
| POST | /brands | `{name, slug, identity:{mission, voice, palette[]}}` |
| GET | /brands | 全部品牌，含 products |
| GET | /brands/:id | 含 products |
| POST | /brands/:id/products | `{name, spec}` → product、main、revision #1 |
| GET | /products/:id | main head spec、branches、open proposals、最近 20 則 messages |
| POST | /products/:id/messages | `{body}`；含 `@agent:concept` 時回 `agent_run_id` |
| GET | /products/:id/messages | |
| GET | /agent-runs/:id | `status`、`stage`（designing / generating / building / done）、`tool_calls` |
| GET | /proposals/:id | source 與 main 兩份 spec + diff |
| POST | /proposals/:id/merge | |
| GET | /products/:id/revisions | main 的歷史 |
| GET | /products/:id/coauthors | 含 merge 進來的 agent revision |
| POST | /products/:id/releases | |
| GET | /releases/:id | 含 export_payload |
| POST | /releases/:id/open-store | arcade.ai `checkouts/create` → `{checkout_url}` |
| GET | /images/:file | 從 arcade.ai 下載快取的圖（簽名網址會過期） |
| GET | /health | |

## 結構

```
src/index.ts    Hono 路由
src/db.ts       SQLite schema、seed、revision 工具
src/spec.ts     ProductSpec zod schema、diff
src/arcade.ts   arcade.ai client（POST JSON、retry、job 輪詢）
src/images.ts   下載 arcade.ai 圖片到 data/images/
src/agent.ts    concept agent：designWithClaude → arcade.ai 生成 → branch/revision/proposal
src/release.ts  coauthors、export_payload、open-store
public/index.html  一頁式前端（vanilla JS，每 2 秒輪詢）
demo.sh         完整路線
scripts/        serve.sh、arcade-smoke.ts、ui-clickthrough.mjs（headless Chrome 點過 Release 與開店）
```
