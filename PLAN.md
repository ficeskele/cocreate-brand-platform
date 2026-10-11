# 共創品牌平台 — 開發計畫（建立在 arcade.ai 上）

對應 spec：《共創品牌平台 後端 Spec（黑客松 3 小時版）》
日期：2026-10-11

> **名稱澄清，別搞錯**
>
> | | arcade.ai（本專案用的） | arcade.dev（本專案不用） |
> |---|---|---|
> | 是什麼 | Mariam Naficy 創辦的 AI 實體商品平台：prompt → 圖樣 → 抱枕 / 圍巾 / 燈罩 / 首飾 → 工匠製作出貨 | 給 AI agent 用的 MCP 工具與 OAuth 平台 |
> | API | `https://platform.arcade.ai/v1`，全部 POST JSON | `https://api.arcade.dev` |
> | Key | `arcade_sk_live_...`，從 `studio.arcade.ai/settings/api-keys` 取得 | 另一套，我們沒有 |
> | 文件 | `https://docs.arcade.ai/llms.txt` | `docs.arcade.dev` |
> | 專案 skill | `.claude/skills/arcade-api`、`.claude/skills/arcade-api-test-drive` | 已刪除 |
>
> 本文件所有「Arcade」一律指 **arcade.ai**。這場 hackathon（Shopping 3.0 AI Commerce Hackathon）是 arcade.ai 主辦，評審看的是「building on top of arcade.ai APIs」。
> 網路搜尋「Arcade API」幾乎都會回 arcade.dev 的結果，查資料時只用 docs.arcade.ai。

## 1. 對原 spec 的分析

### 1.1 最大問題：原 spec 的 Arcade 整合寫的是 arcade.dev

| spec 裡的東西 | 實際屬於 | 現況 |
|---|---|---|
| Arcade JS SDK、`arcade.tools.execute({tool_name, user_id})` | arcade.dev | 沒有 key，也不是比賽主辦方 |
| `GoogleShopping.SearchProducts`、SERP key、dashboard 授權 | arcade.dev | 同上 |
| 「agent 以使用者身分呼叫外部工具，授權由 Arcade 管」這套講法 | arcade.dev | arcade.ai 沒有這功能，評審聽不懂 |

arcade.ai 的 API 是 **prompt → 圖樣 → 實體商品 → 結帳**，今天已用 curl 驗證可用（成品在 `samples/`）：
`patterns/create`（約 90 秒）→ `products/create`（約 10 秒，回 mockup 圖 + 真實單價 + 製作者）→ `checkouts/create`（回可付款網址）。

### 1.2 改用 arcade.ai 之後 demo 反而更強

原本 concept agent 只能「查同類品然後改 JSON」，評審看到的是文字 diff。
換成 arcade.ai 之後，agent 的 Proposal 會帶：

- arcade.ai 真實生成的圖樣與抱枕 / 圍巾 / 燈罩 mockup 圖
- arcade.ai 真實可製造的規格（fabric、size）與真實單價（USD）
- arcade.ai 真實製作者名字（例如 Esme）
- Release 之後「開店」按鈕直接拿到 arcade.ai 的付款網址（`checkout.arcade.ai`），評審可以當場看到可下單的頁面

### 1.3 其他需要調整的地方

| 項目 | 原 spec | 調整 |
|---|---|---|
| 「mention 後 30 秒內 proposal 出現」 | 30 秒 | arcade.ai 圖樣生成要 90 秒。改成：LLM 先在 15 秒內回一則「我打算怎麼做」的 Message，Proposal 在 2 分鐘內出現。`/agent-runs/:id` 多回 `stage` 讓前端顯示進度。 |
| Shopify 開店 | 直接打 Admin GraphQL | 目前沒有 dev store 與 token。主線改成 arcade.ai `checkouts/create`，Shopify 降為加分項。 |
| ProductSpec | 無 Arcade 欄位 | 加 `arcade` 區塊（見 §3），`images[]` 放 arcade.ai mockup 圖，`price_target` 從 `unitPrice` 填。 |
| LLM 呼叫 | `tool_choice: {type: 'any'}` | 目前的 Claude 模型（Opus 5.5 / Sonnet 5.5）已不接受強制 `any`，會回 400。改成 `tool_choice: auto` + 工具加 `strict: true` + system prompt 明說「只能用 submit_spec 交付」。 |
| LLM 憑證 | 未提 | 後端要用 Anthropic SDK 呼叫 Claude，需要 `ANTHROPIC_API_KEY`（見 §10）。這跟 arcade.ai 的 key 是兩回事。 |
| 幣別 | TWD | arcade.ai 回 USD，`price_target.currency` 改 USD。 |

### 1.4 保留不動的部分

Brand / Product / Branch / Revision / Proposal / Message / AgentRun / Release 的資料模型、
X-User-Id 假登入、merge 即覆蓋、coauthors 從 Revision 鏈算、14 個端點，全部照 spec 做。

## 2. 調整後的 demo 劇本（5 分鐘）

1. 建 Brand「山嵐 Mist」（identity：東方水墨、淡雅、palette 青灰與米白）和 Product「茶園抱枕」，附初始 ProductSpec（只有文字，沒有圖）。
2. 在討論串打 `@agent:concept 做成春季限定版，加梅花，用 20x20 亞麻`。
3. 畫面每 2 秒輪詢：`designing`（Claude 寫 spec 與 prompt）→ `generating`（arcade.ai 生成圖樣）→ `building`（arcade.ai 做成商品）→ `done`。
4. Proposal 出現：左右 diff，右邊多了 arcade.ai mockup 圖、單價 USD、製作者。按 merge（換成 u_bob），coauthors 顯示 alice、bob、concept agent（代表 alice）。
5. 按 Release，再按「開店」，拿到 `checkout.arcade.ai` 的網址，直接開給評審看。

## 3. ProductSpec 新增欄位

```json
{
  "...": "原 spec 欄位全部保留",
  "price_target": {"currency": "USD", "min": null, "max": null},
  "arcade": {
    "modelId": "chinoiserie",
    "prompt": "agent 寫給 arcade.ai 的英文 prompt",
    "patternId": "",
    "categoryId": "",
    "selections": {"fabric": "linen", "size": "20x20", "embellishment": "none", "insert": "none"},
    "productId": "",
    "unitPrice": {"amount": "43.56", "currency": "USD"},
    "maker": {"makerId": "", "name": ""}
  }
}
```

`arcade.*` 的每個 id 都是 arcade.ai 回傳的。

### 3.1 圖片全部來自 arcade.ai

系統裡所有商品圖都由 arcade.ai 產生，不接其他圖片生成服務：

| role | 來源 | arcade.ai 端點 |
|---|---|---|
| `pattern` | 圖樣本身，1024x1024 PNG | `patterns/get` 的 `imageUrl` |
| `hero` | 商品 mockup 正面 | `products/get` 的 `images[0].url` |
| `closeup` | 商品 mockup 特寫 | `products/get` 的 `images[1].url` |

修改（`refine/edit`、`recolor`、`crop` 等）每次都產生新的 pattern，所以迭代版本的圖也全是 arcade.ai 的。Brand 若要一張代表圖，同樣用 `patterns/create` 生。唯一不是 arcade.ai 產出的圖是使用者上傳的參考圖，那是透過 `references/createUpload` 送進 arcade.ai 當輸入。

arcade.ai 回的圖片網址是簽名網址，會過期。後端拿到網址後立刻下載到 `data/images/<id>-<role>.png`，用 `GET /images/:file` 自己提供，ProductSpec 的 `images[].url` 一律指向自己的路徑。這樣 demo 中途不會失效，export_payload 給 Shopify 的網址也穩定。

## 4. concept agent（取代 GoogleShopping 版）

### 4.1 工具

給 Claude 的 tools（Anthropic tool_use，`tool_choice: auto`，每個工具 `strict: true`）：

| tool | 做什麼 | 實作（全部打 arcade.ai） |
|---|---|---|
| `list_styles` | 回 arcade.ai 26 個風格模型 | `models/list`，啟動時快取 |
| `list_categories` | 回 arcade.ai 21 個 print 類別與 8 個 jewelry 類別 | `categories/list`，啟動時快取 |
| `get_category_options` | 回某類別的 fabric / size 等選項 | `categories/get` with `selections: {}` |
| `submit_spec` | 交付新 ProductSpec + summary + arcade prompt + categoryId + selections | 本地，zod 驗證 |

Claude 不直接等圖，它只負責「設計」。生成由後端在 `submit_spec` 之後呼叫 arcade.ai 執行。

### 4.2 `runConceptAgent(runId)` 步驟

1. 載入 AgentRun、input Revision、Brand、最近 10 則 Message。stage = `designing`。
2. Claude tool loop（最多 8 輪）直到 `submit_spec`。zod 驗證失敗回丟一次。
3. 立刻寫一則 agent Message：「我會用 X 風格生成 Y，做成 Z 類別的 W 尺寸」。
4. stage = `generating`：arcade.ai `patterns/create` with `prompt`、`modelId`、`categoryId`（一個 job 同時產 pattern 和 product，少一次往返）。若 Claude 指定了非預設 selections，改走 `patterns/create`（不帶 categoryId）→ `products/create`。
5. 每 3 秒 `jobs/get`，最多 4 分鐘。stage = `building` 當 pattern 好、product 還在跑時。
6. arcade.ai `products/get` 取 mockup 圖、unitPrice、maker，寫進 spec 的 `arcade` 與 `images`。
7. 開 branch `agent/concept/<run 前 8 碼>` → Revision（author=agent, on_behalf_of=觸發者）→ Proposal(open) → agent Message 說改了什麼 → AgentRun succeeded。
8. 任何例外 → failed + error + 一則失敗 Message。arcade.ai 回 4xx 時把 message 原樣寫進 error。

### 4.3 System prompt 要點

- 你是品牌共創團隊的產品概念設計師，只能透過 `submit_spec` 交付。
- 先 `list_styles` 和 `list_categories` 挑風格與類別，再 `get_category_options` 確認尺寸材質存在。
- `arcade.prompt` 用英文寫，描述畫面內容與風格，不要寫商品名稱。
- 使用者沒叫你動的欄位原樣保留；陣列元素保留原 id，新增用新 id。
- 用 Brand identity 的 voice 寫 name、tagline、concept（繁中）。
- summary 繁中三句內：改了什麼、選了什麼風格與品類、為什麼。

### 4.4 arcade.ai 煙霧測試已完成

今天已用 curl 跑通 arcade.ai 的 patterns/create → products/create → checkouts/create，紀錄在 `.arcade-api/log/`。
不需要再花 15 分鐘做煙霧測試，這段時間移給 agent。

## 5. 技術選型

| 項目 | 選 | 原因 |
|---|---|---|
| 執行環境 | Node 24 + pnpm | 已安裝 |
| 後端 | TypeScript + Hono + better-sqlite3 | spec 原選項，最少樣板 |
| LLM | `@anthropic-ai/sdk`，模型 `claude-opus-5-5`，adaptive thinking，effort `medium` | 目前預設模型；tool_use 用 `auto` + `strict` |
| arcade.ai client | 自己寫 `src/arcade.ts`，fetch + `User-Agent` + `requestId` | arcade.ai API 只有 POST JSON，沒有也不需要 SDK；重用 `arcade-api.sh` 的規則 |
| 驗證 | zod | submit_spec 與 request body |
| 測試 | 不寫；`demo.sh` 用 curl 跑完整條路線 | 照 spec |
| 前端 | 一頁 HTML 或 Artifact，輪詢 API | 時間表沒有前端，先用 demo.sh，有時間再做 |

## 6. 專案結構

```
src/
  index.ts          Hono app、路由
  db.ts             SQLite schema、seed（u_alice、u_bob）
  spec.ts           ProductSpec zod schema、diff
  arcade.ts         arcade.ai client：call()、poll()、listModels、listCategories、getCategory、createPattern、createProduct、getProduct、createCheckout
  agent.ts          runConceptAgent：Claude tool loop + arcade.ai 生成 + 寫 revision/proposal
  images.ts         下載 arcade.ai 圖片到 data/images/，提供 GET /images/:file
  release.ts        export_payload、open-store（arcade.ai checkout；Shopify 可選）
demo.sh             curl 跑完整條路線
.env                ARCADE_API_KEY（arcade.ai）、ARCADE_USER_AGENT、ANTHROPIC_API_KEY
```

## 7. 端點（照 spec 14 個，只改兩處）

- `GET /agent-runs/:id` 多回 `stage`（designing / generating / building / done）和 `arcade_job_id`。
- `POST /releases/:id/open-store` 改為：先 arcade.ai `products/get` 刷新圖片網址，再 arcade.ai `checkouts/create` with `dropShip: true`，存 Store `{checkout_id, checkout_url}`，回 `{store, checkout_url}`。若之後有 Shopify token，同一端點加 `?target=shopify`。

## 8. 三小時時間表（調整版）

| 時間 | 做什麼 | 完成的證據 |
|---|---|---|
| 0:00–0:20 | 骨架、SQLite schema、seed、Brand / Product / Branch / Revision 端點 | curl 建出 product，回 main head |
| 0:20–0:35 | `arcade.ts` client，從 TypeScript 打 arcade.ai `models/list` 與 `categories/get` | 兩個呼叫回 200 |
| 0:35–1:40 | concept agent：Claude tool loop、submit_spec、arcade.ai 生成、revision / proposal / message | mention 後 2 分鐘內 proposal 出現且帶 mockup 圖 |
| 1:40–2:05 | diff、merge、coauthors | merge 後 main head 是 agent 的內容，coauthors 兩人一 agent |
| 2:05–2:30 | release、export_payload、open-store（arcade.ai checkout） | 拿到 checkout.arcade.ai 網址 |
| 2:30–3:00 | demo.sh 從頭跑一遍、修 bug、講稿 | 一次跑完不出錯 |

Demo 前先完整跑一次，讓資料庫裡有一個已完成的 run 當備案。現場若 arcade.ai 生成超過 4 分鐘，直接切到備案的 Proposal。

## 9. 有時間再加（照順序）

1. ~~前端一頁式介面~~ 已完成：`public/index.html`，由同一個伺服器在 `/` 提供。
2. `@agent:concept 換成藍色系` → arcade.ai `recolorClusters` + `recolor`，不重新生成，20 秒內完成（20 分鐘）。
3. Brand 參考圖：上傳一張品牌視覺 → arcade.ai `references/createUpload` → agent 帶 `referenceIds`（25 分鐘）。
4. critic agent（20 分鐘）。
5. Shopify draft product（需要 dev store，45 分鐘）。
6. jewelry 類別：同一個 agent，改走 arcade.ai `patterns/create` 帶 jewelry categoryId（15 分鐘）。

## 10. 開工前需要的東西

### 兩把 key，各做各的事

| Key | 給誰用 | 狀態 |
|---|---|---|
| `ARCADE_API_KEY` | 後端呼叫 arcade.ai 生成圖樣、商品、結帳 | 已在 `.env`，已驗證 |
| `ANTHROPIC_API_KEY` | 後端的 concept agent 呼叫 Claude 來設計 ProductSpec 與寫 arcade.ai prompt | 目前沒有 |

為什麼需要 `ANTHROPIC_API_KEY`：spec 寫明 LLM 用「Anthropic SDK 直呼，用 tool_use 強制回 ProductSpec JSON」。這段程式跑在我們自己的 Hono 伺服器裡，由 `POST /products/:id/messages` 觸發，demo 時評審按下去就會呼叫 Claude。Claude Code 這個對話視窗沒辦法被伺服器當 API 呼叫，所以伺服器需要自己的憑證。

取得方式二選一：

1. 到 https://console.anthropic.com/settings/keys 建一把 key，放進 `.env` 的 `ANTHROPIC_API_KEY`。
2. 安裝 Anthropic CLI 後執行 `ant auth login`，SDK 會自動讀登入後的 profile，不用設環境變數。這台機器目前沒裝 `ant`。

### 其他

- 確認接受 §1.3 的調整：agent 工具從 GoogleShopping 換成 arcade.ai 生成，Shopify 降為加分項。
- arcade.ai 的 key 曾在對話中貼出，建議到 studio.arcade.ai 重建一把。
