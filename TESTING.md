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
