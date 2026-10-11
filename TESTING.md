# Test workflow (from scratch, about 5 minutes)

## 0. Setup (once)

```bash
cd ~/Developer/arcade_hackthon
rm -f data/app.db*           # wipe all test data and start empty
scripts/serve.sh --mock      # start the server (mock = no Claude key needed; arcade.ai still generates)
```

It is ready when you see: `cocreate-brand-platform on http://localhost:3456 (arcade.ai backend)`.
Leave this terminal open.

## 1. Open the browser

Open http://localhost:3456/

You should see: a 6-step guide across the top, an empty "Brands" column on the left, and "Step 1: click "+ New brand" on the left" in the middle.

## 2. Create a brand

Click "+ New brand" in the left column. The form is prefilled with "Mist". Click "Create".

Expected: "Mist" appears in the left column, with a "Products" section under it.

## 3. Create a product

Click "+ New product". The form is prefilled with "Tea Garden Pillow". Click "Create".

Expected: a product card appears in the middle. The image slots are three gray boxes saying "No images yet", and the unit price says "No quote yet".

## 4. Ask the agent to design

At the bottom of the "Discussion" card, click "Fill in example". The input shows
`@agent:concept make a spring edition: add plum blossoms, use 20x20 linen`. Click "Send".

Expected:

- Your message appears in the thread, and a few seconds later the agent replies "Design done. I will…".
- The four-step progress bar above the input lights up in order: Claude is designing → arcade.ai is generating the pattern → arcade.ai is building the product → Done.
- The whole run takes 1 to 2 minutes. The page refreshes itself every 2 seconds; no reload needed.

## 5. Review the Proposal and merge

When the run finishes, a card appears under "Proposals" on the right: "main now" on the left shows "No image"; the Proposal on the right has the pillow image, category, size, price and maker, with the field diff table below.

Switch the identity in the top right to **bob** first, then click "Merge into main (as bob)".

Expected:

- The product card at the top switches to the version with images, and the unit price shows a USD amount.
- The co-author chips become three: alice, bob, agent:concept (on behalf of alice).
- "main history" at the bottom right gains a merge entry.

## 6. Release and open the store

Click "Create Release" on the right. v1 and the credits appear.
Then click "Open store (arcade.ai)". After a few seconds the product info and a "Check out on arcade.ai ↗" link appear.

The link opens a real payment page on checkout.arcade.ai. **Do not pay.** Paying places a real order that gets made and shipped to you.

## That is the whole demo path.

---

## Skip the clicking: run everything with curl

```bash
./demo.sh
```

It performs steps 2 to 6 above, prints each result, and ends with the checkout URL. Reload the browser afterwards and the brand it created appears in the left column.

## Common situations

| What you see | What to do |
|---|---|
| The page does not load | The server is not running. Go back to the terminal and run `scripts/serve.sh --mock` |
| Progress stuck on "arcade.ai is generating the pattern" for over 4 minutes | arcade.ai is slow. Wait for the run to fail on its own, then send `@agent:concept` again |
| The agent replies "Sorry, this design run failed: …" | Paste that error message to me |
| The left column fills with duplicate brands | `rm -f data/app.db*` and restart, or ignore it |
| You want real Claude designs | Add `ANTHROPIC_API_KEY=...` to `.env` and start with `scripts/serve.sh` (without --mock) |

---

# Test workflow for the DropLab web app (`/app`)

The React frontend from PR #1 lives at http://localhost:3456/app/ . The old page at `/` still works but is a separate UI; do not mix the two while testing.

## 0. Start clean

```bash
cd ~/Developer/arcade_hackthon
rm -f data/app.db*                 # wipe old test data (old versions with unrelated images come from here)
scripts/serve.sh --mock            # builds web/ if needed, then starts on :3456
```

Wait for `cocreate-brand-platform on http://localhost:3456`. Keep the terminal open.

## 1. Seed one product (the web app has no "create backend product" form yet)

In a second terminal:

```bash
curl -s -X POST localhost:3456/brands -H 'content-type: application/json' -H 'x-user-id: u_alice' \
  -d '{"name":"Mist","slug":"mist-'"$(date +%s)"'","identity":{"mission":"Calm East Asian landscapes for everyday life","voice":"Understated, poetic","palette":["#7A8B7F","#E9E4D8","#B9A58C"]}}' | tee /tmp/brand.json
BID=$(jq -r .id /tmp/brand.json)
curl -s -X POST localhost:3456/brands/$BID/products -H 'content-type: application/json' -H 'x-user-id: u_alice' \
  -d '{"name":"Clown Pillow","spec":{"name":"Clown Pillow","tagline":"Make my room go wild","concept":"A pillow covered in bright circus clowns.","category":"home-textile","target_audience":"Young people","features":[{"id":"f1","text":"Double-sided print"},{"id":"f2","text":"Hidden zipper"}],"materials":[{"id":"m1","name":"Cotton"}],"colorways":[{"id":"c1","name":"Sage","hex":"#7A8B7F"}],"price_target":{"currency":"USD","min":null,"max":null},"images":[],"sourcing_notes":""}}' | jq '{id, name}'
```

## 2. Open the app

http://localhost:3456/app/ opens the landing page (hero, wheel of top ideas, mission, CTA). Click **Explore** in the top nav, or open http://localhost:3456/app/explore directly.

Expected: the "Explore" feed. Four **Demo** cards (bike bag, lamp, planter...) plus one card tagged **Backend**: "Clown Pillow" with a grey "No render yet" placeholder. The grey line under the title says "Connected to the backend".

## 3. Open the idea and ask the agent

Click the **Clown Pillow** card. You land on the detail page, tab **Conversation** (empty, tagged Backend).

In the text box type:

```
@agent:concept bright clown pattern, 20x20 linen
```

Click **Post**.

Expected:
- Your message appears, then an agent reply "Design done…".
- A line "Agent: running · designing" appears, then "running · generating", "running · building", and after 1 to 2 minutes "succeeded · done".
- The big image on the page still shows the placeholder. That is correct: main has not changed yet.

## 4. Review and merge the version

Click the **Versions** tab.

Expected:
- The version tree shows "Original · Clown Pillow" and one child "Clown Pillow · bright clown pattern…" by agent:concept. (The "Demo" badge next to the vote count is a leftover label from the PR; votes are demo-only.)
- Panel **Open proposals** (Backend) shows the agent's summary. Click **View changes** to list the changed fields.

Switch user: top nav **Profile** → "Backend user" → pick **bob**. Go back (browser back, or Explore → card → Versions).

Click **Merge proposal**.

Expected:
- Toast "Proposal merged".
- The big image at the top becomes the clown pillow render from arcade.ai.
- Panel **Co-authors** shows alice, bob, and "Agent concept (on behalf of alice)".
- Feed card for the idea now shows the render too.

## 5. Release and store

Click the **Stores** tab → **Create release** → "Release v1 created." → **Open store**.

Expected: the button becomes **Open checkout**, a link to checkout.arcade.ai. Do not pay: it is a real order.

## 6. (Optional) one more round

Back in **Conversation**, send `@agent:concept same clowns but in blue tones, 18x18 velvet`. A second version appears under Versions with its own image; merge it the same way.

## Automated version of steps 3 to 5

```bash
cd web && node scripts/e2e.mjs            # full run including the 1-2 min generation
cd web && SKIP_AGENT=1 node scripts/e2e.mjs   # only diff → merge → release → store, needs an open proposal
```

Prints a JSON summary and writes screenshots to `web/docs/screenshots/e2e-*.png`.

## What is Demo vs Backend in `/app`

| Backend (real, from our API) | Demo (fake data from the PR) |
|---|---|
| Ideas tagged **Backend**, their image, title, description | Bike bag, lamp, planter ideas |
| Conversation messages and `@agent:concept` runs | Votes, Follow, Share counts |
| Versions: tree children, Open proposals, Co-authors | Interest tab, royalties, Earnings |
| Stores: Create release, Open store (arcade.ai checkout) | Merchant mode (`/app/m`), Shopify preview |

---

# One-sentence setup ("Jeeves" mode) in `/app`

Goal: the user types one sentence; everything else is predicted and prefilled. Prediction is keyword matching against a mock corpus (`src/predict.ts`), not a trained model, so it is instant and explainable.

1. Open http://localhost:3456/app/create (sign up with any name, email and password when asked).
2. Type one sentence, e.g. `a pillow full of bright circus clowns to make my room go wild` or `a silk scarf with plum blossoms in the mist`.
3. Click **Predict the rest** (or just **Predict and continue**). A panel shows: predicted name, category plus arcade.ai category and style, audience, features, price band, brand voice and palette, confidence, and which similar ideas were used.
4. Steps 2 and 3 are already filled; change anything or just click **Next**.
5. **Publish idea**: creates the brand (if none) and the product on the backend, posts `@agent:concept <predicted instruction>` and opens the idea. The agent then generates on arcade.ai (1 to 2 minutes); continue with the Versions / Stores steps above.

API only: `curl -X POST localhost:3456/predict -H 'content-type: application/json' -d '{"text":"a birthday necklace for my girlfriend"}'`

On-screen demo: `cd web && node scripts/demo-onesentence.mjs "your sentence"`.
