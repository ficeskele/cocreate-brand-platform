# DropLab web (`/app`)

React + TypeScript + Vite frontend for DropLab, the inverted marketplace for physical product ideas. It is served by the Hono backend at `/app/*`; the existing `/` page is untouched. UI copy is English.

## Run
```bash
pnpm install && pnpm web:install          # from the repo root (Node >= 22 for better-sqlite3)
pnpm web:build                            # outputs web/dist
PORT=3456 AGENT_MOCK_DESIGN=1 pnpm start  # or scripts/serve.sh --mock
# open http://localhost:3456/app/
# Hot reload: pnpm web:dev → http://localhost:5173/app/ (proxies /api → :3456)
```
Without the backend running, the app still works with Demo data only.

Routes: `/app/` is the landing (WorksWheel of the most-voted ideas, Demo votes), `/app/explore` is the feed (`/app/explorar` redirects), ideas/versions keep their shareable URLs (`/app/i/:slug`, `/app/i/:slug/v/:version`). Wheel check: `node web/scripts/wheel.mjs`.

## Real vs Demo
Real (`src/data/api.ts`, tagged **Backend** in the UI): brands/products → ideas, non-main branches → versions, `GET/POST /products/:id/messages` (+ `@agent:concept` with `/agent-runs/:id` polling), `/products/:id/coauthors`, open proposals + `/proposals/:id` diff + `/merge`, `/products/:id/releases` + `/releases/:id/open-store`, `X-User-Id` (alice/bob switch in Profile).

Demo (`src/data/mock.ts`, tagged **Demo**): sample ideas and renders, votes, follows, purchase interest and aggregates, private minimum royalties, the illustrative $35 retail / $5 total royalty pool proposal, image-rights approvals, notifications, Shopify preview/draft, referral commissions, image pins on comments.

## Checks
`pnpm --dir web exec tsc -b` · `pnpm web:build` · with the server running: `node web/scripts/smoke.mjs` and `node web/scripts/shots.mjs` (390/834/1440 overflow check, writes web/shots/).

## Why `src/components/ui` matters (shadcn)
shadcn/ui copies component source into your repo instead of installing a package. `components.json` tells its CLI that UI primitives live in `@/components/ui` and helpers in `@/lib/utils` (`cn` = clsx + tailwind-merge). Keeping that exact path and the `@/` alias (tsconfig + Vite) means `npx shadcn add <component>` and pasted shadcn-style components (e.g. `works-wheel.tsx`) resolve their imports without edits. Tailwind v4 is loaded without preflight (`src/styles/tailwind.css`), so the existing plain-CSS screens are unaffected; theme vars (`--background`, `--foreground`, `--muted`, `--muted-foreground`, …) map to the DropLab monochrome tokens.

Intro loader: `src/components/ui/ascii-loader.tsx` (Canvas2D ordered-dither, all recipe params as props). Shown once per session on `/app/` (force with `/app/?intro`), ~1.9 s, skippable by click/key; with prefers-reduced-motion it draws one static frame and closes after 0.8 s. Image: *The Creation of Adam* detail, Michelangelo, public domain, via Wikimedia Commons (`public/creation-of-adam-hands.jpg`). Check: `node web/scripts/loader.mjs`.

## Look and landing
Dark style adapted from the Mindloop template (MIT; see `ATTRIBUTION.md`): pure-black tokens in `src/styles/tokens.css` (bg #000, fg #fff, card 5 %, muted 15 %, muted-fg 65 %, border 20 %, accent hsl(170 15% 45%) used only for focus rings and Backend tags), Inter + Instrument Serif (Google Fonts link in `index.html`; italic serif for display headings), liquid-glass on the nav, secondary buttons, chips, modal and toast. The landing follows its structure with `motion`: hero (WorksWheel of the most-voted ideas) → scroll-revealed mission copy → four-up features (Propose, Branch, Signal interest, Launch with a merchant) → CTA → footer. There is no video hero, because we don't have a free, licensed video source. The intro loader is white dither on black.

`src/components/ui/liquid-metal-button.tsx` is copied verbatim (needs `@paper-design/shaders`, `lucide-react`). It's used for the landing hero and CTA ("Explore ideas", plus the icon variant for "Propose an idea") and for "Create version" on the idea page. The component has a fixed width of 142 px, no disabled state and no focus ring, so `.lm-wrap` adds a visible `:focus-within` outline and a lighter label colour for contrast. Merchant "Create draft" keeps the regular button because it needs a disabled state. Checks: `node web/scripts/mission.mjs` (landing hero/mission/CTA shots).
