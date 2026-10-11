# DropLab web (`/app`)

React + TypeScript + Vite frontend for DropLab, the inverted marketplace for physical product ideas. It is served by the Hono backend at `/app/*`; the existing `/` page is untouched. UI copy is Spanish.

## Run
```bash
pnpm install && pnpm web:install          # from the repo root (Node >= 22 for better-sqlite3)
pnpm web:build                            # outputs web/dist
PORT=3456 AGENT_MOCK_DESIGN=1 pnpm start  # or scripts/serve.sh --mock
# open http://localhost:3456/app/
# Hot reload: pnpm web:dev → http://localhost:5173/app/ (proxies /api → :3456)
```
Without the backend running, the app still works with Demo data only.

## Real vs Demo
Real (`src/data/api.ts`, tagged **Backend** in the UI): brands/products → ideas, non-main branches → versions, `GET/POST /products/:id/messages` (+ `@agent:concept` with `/agent-runs/:id` polling), `/products/:id/coauthors`, open proposals + `/proposals/:id` diff + `/merge`, `/products/:id/releases` + `/releases/:id/open-store`, `X-User-Id` (alice/bob switch in Perfil).

Demo (`src/data/mock.ts`, tagged **Demo**): sample ideas and renders, votes, follows, purchase interest and aggregates, private minimum royalties, the illustrative $35 retail / $5 total royalty pool proposal, image-rights approvals, notifications, Shopify preview/draft, referral commissions, image pins on comments.

## Checks
`pnpm --dir web exec tsc -b` · `pnpm web:build` · with the server running: `node web/scripts/smoke.mjs` and `node web/scripts/shots.mjs` (390/834/1440 overflow check, writes web/shots/).

## Why `src/components/ui` matters (shadcn)
shadcn/ui copies component source into your repo instead of installing a package. `components.json` tells its CLI that UI primitives live in `@/components/ui` and helpers in `@/lib/utils` (`cn` = clsx + tailwind-merge). Keeping that exact path and the `@/` alias (tsconfig + Vite) means `npx shadcn add <component>` and pasted shadcn-style components (e.g. `works-wheel.tsx`) resolve their imports without edits. Tailwind v4 is loaded without preflight (`src/styles/tailwind.css`), so the existing plain-CSS screens are unaffected; theme vars (`--background`, `--foreground`, `--muted`, `--muted-foreground`, …) map to the DropLab monochrome tokens.
