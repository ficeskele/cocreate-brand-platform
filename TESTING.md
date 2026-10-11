# 測試 workflow（從零開始，約 5 分鐘）

## 0. 準備（只做一次）

```bash
cd ~/Developer/arcade_hackthon
rm -f data/app.db            # 清掉所有測試資料，從空的開始
scripts/serve.sh --mock      # 啟動伺服器（mock = 不用 Claude key，arcade.ai 照常生成）
```

看到這行就是好了：`cocreate-brand-platform on http://localhost:3456 (arcade.ai backend)`。
這個終端機留著不要關。

## 1. 開瀏覽器

開 http://localhost:3456/

你會看到：上方一條 6 步驟導覽、左欄「品牌」是空的、中間寫「第 1 步：按左邊＋新品牌」。

## 2. 建品牌

左欄按「＋ 新品牌」→ 表單已填好「山嵐 Mist」→ 按「建立」。

應該看到：左欄出現「山嵐 Mist」，下面多了「商品」區。

## 3. 建商品

左欄按「＋ 新商品」→ 表單已填好「茶園抱枕」→ 按「建立」。

應該看到：中間出現商品卡，圖的位置是三個灰色方框寫「還沒有圖」，單價「尚未報價」。

## 4. 叫 agent 設計

中間「討論串」最下面，按「填入範例」，輸入框會出現
`@agent:concept 做成春季限定版，加梅花，用 20x20 亞麻`，按「送出」。

應該看到：

- 討論串出現你的訊息，幾秒後出現 agent 的回覆「設計完成。我會用…」。
- 輸入框上方四格進度條，依序亮起：Claude 設計中 → arcade.ai 生成圖樣 → arcade.ai 製作商品 → 完成。
- 整個過程 1 到 2 分鐘，頁面每 2 秒自動更新，不用重新整理。

## 5. 看 Proposal 並 merge

完成後右邊「Proposals」出現一張卡：左邊 main 現況「沒有圖」，右邊 Proposal 有抱枕圖、品類、尺寸、價格、製作者，下面是欄位 diff 表。

先把右上角身分切成 **bob**，再按「Merge 到 main（以 bob 身分）」。

應該看到：

- 上方商品卡換成有圖的版本，單價出現 USD 金額。
- 右上角 co-author 變成三個：alice、bob、agent:concept（代表 alice）。
- 右下「main 歷史」多一筆 merge。

## 6. Release 與開店

右邊「打 Release」→ 出現 v1 與 credits。
再按「開店（arcade.ai）」→ 幾秒後出現商品資訊和「在 arcade.ai 結帳 ↗」。

點開連結會到 checkout.arcade.ai 的真實付款頁。**不要付款**，付了就真的做出來寄給你。

## 到這裡 demo 路線走完。

---

## 不想點畫面：用 curl 一次跑完

```bash
./demo.sh
```

會自動做完上面 2 到 6 步，每步印結果，最後印出結帳網址。跑完後重新整理瀏覽器，左欄會出現它建的品牌。

## 常見狀況

| 看到什麼 | 怎麼辦 |
|---|---|
| 頁面打不開 | 伺服器沒跑。回到終端機執行 `scripts/serve.sh --mock` |
| 進度卡在「arcade.ai 生成圖樣」超過 4 分鐘 | arcade.ai 慢。等它自己 failed 後再送一次 `@agent:concept` |
| agent 回「這次設計失敗了：…」 | 把那段錯誤訊息貼給我 |
| 左欄一堆重複品牌 | `rm data/app.db` 重啟，或不管它 |
| 想用真的 Claude 設計 | `.env` 加 `ANTHROPIC_API_KEY=...`，改用 `scripts/serve.sh`（不加 --mock） |
