# MUP Discovery — merchant prototype

A standalone Shopify-inspired merchant workspace for discovering community ideas, applying to sell a specific design branch, and preparing a mock Shopify product draft. No API keys, backend process, Shopify store, or Arcade account are required.

## Run locally

Requirements: Node.js 22.12+ (Node.js 24 LTS recommended) and npm.

```bash
cd merchant
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). The existing creator app still runs separately using the repository's original commands. This app does not use its database, API routes, secrets, or dependencies.

```bash
npm run build       # strict TypeScript check + production bundle in dist/
npm run preview     # serve that production bundle, normally port 4173
npm test            # service and persistence tests
npm run test:e2e    # browser walkthrough; requires Google Chrome installed
```

Browser tests reuse the repository’s Chrome DevTools Protocol approach. They start an isolated Chrome profile and Vite server on port 5178, use port 9338 for Chrome debugging, and save screenshots in ignored `test-results/`. Install Google Chrome, or set `CHROME_PATH` to a Chrome/Chromium executable. The test runner cleans up its browser, server, and temporary profile when finished.

## Try the hackathon flow

1. In **Discover Ideas**, search, filter by category, or sort by popularity/recent publication.
2. Open an idea, select a design branch, and choose **Explore this branch**.
3. Select **Apply to Sell**, review the proposed creator commission and manufacturing estimate, then **Confirm application**. The application starts **Pending**.
4. Open **My Applications**. Under the clearly labeled **Demo Controls**, click **Approve** (or **Reject** to demonstrate the rejection flow).
5. On an approved application, click **Prepare Product Draft**. Edit the title, description, and selling price. The **Pricing & Profit Estimate** updates immediately; the approved commission rate stays fixed as the price changes. Optional **Demo Controls** let you test different manufacturing costs and commission rates without changing the approved Match terms.
6. Click **Create Product Draft**, then **View My Product Drafts**. Refresh to verify persistence.

A branch is a separately authored design, never a Shopify size/color variant. Approval applies to the selected `branchId` only. Pending/rejected applications cannot access launch even by entering a launch URL directly. The service also enforces approval, merchant ownership, and field validation.

## Implemented

- Six ideas across five categories, with 18 branches and original/fork lineage.
- Thirty-six original SVG mock product illustrations stored locally, including alternate detail views. Regenerate with `python3 scripts/generate-previews.py`.
- Search across names/descriptions/tags, category filters, popularity/recent sorting, URL-preserved discovery filters, engagement counts, and production estimates.
- Idea detail, selectable branches, branch detail with lineage, and image galleries.
- Confirmation dialogs, pending applications, simulated approve/reject, status filtering, prevention of duplicate pending/approved applications, and reapplication after rejection.
- Branch-specific proposed commission rates (8%, 10%, or 12%), commission preview before applying, and terms retained when the Match is approved.
- Approved-only product preparation, editable product copy and selling price, live commission/profit breakdown, negative-profit feedback, mock Shopify IDs, and duplicate draft prevention.
- Responsive navigation, keyboard-accessible native dialogs, focus indicators, reduced-motion support, loading/error/empty states, broken-image fallbacks, and invalid route handling.
- Applications/drafts persisted in versioned localStorage; session-only fallback and visible notices when storage is unavailable, full, or corrupt. Corrupt saved content is left untouched.

## Architecture

```text
src/
  components/       reusable UI, gallery, dialog, admin shell
  pages/            six merchant pages
  data/catalog.ts   stable mock idea/branch/creator/merchant identities
  services/         service methods, Shopify gateway, storage adapter, pricing math
  state/            React context loading/refresh and storage event synchronization
  types/            User, Merchant, Idea, Branch, MatchApplication, ProductDraft
public/products/    bundled original SVG concept placeholders
scripts/            reproducible preview generator
tests/              business-rule tests and browser walkthroughs
docs/               proposed backend and Shopify integration contracts
```

`createMerchantService(repository, gateway)` provides `getIdeas`, `getIdeaById`, `getBranchesByIdeaId`, `getBranchById`, `applyToSell`, `getMerchantApplications`, `updateApplicationStatus`, `createProductDraft`, and `getProductDrafts`. Pages call this interface through `MerchantProvider`. `ShopifyDraftGateway.createDraft` is the replaceable Shopify boundary.

Hash routing supports direct links and refresh on ordinary static hosting. `base: './'` supports serving the bundle from a subdirectory. An embedded app migration can retain the types, pages, and services while replacing hash routing, the outer shell, merchant identity, persistence, and gateway with authenticated backend/App Bridge integrations.

## Mock limitations

- Every community record, support count, price, application, and Shopify identifier is demo data. SVGs are concept placeholders, not actual product photography. Costs are illustrative and **not Arcade quotations**.
- One fixed demo merchant; no login, OAuth, live store connection, real permissions, creator messaging, or external API requests.
- Creator review exists only as merchant-visible **Demo Controls**. These controls must not be exposed to merchants in production.
- A created draft is a browser-local snapshot; it never creates or publishes a real Shopify product. One mock draft is allowed per approved application.
- Creator commission = selling price × approved proposed commission rate. **Estimated Profit Before Other Expenses** = selling price − estimated manufacturing cost − creator commission; estimated margin = that profit ÷ selling price × 100, or 0% for a zero/invalid price. Estimates exclude shipping, Shopify/payment processing fees, advertising, taxes, refunds/returns, and additional platform fees. They do not guarantee earnings. All amounts use USD.
- Optional Demo Controls save adjusted cost/rate in a draft's `pricing` snapshot and mark it as a scenario. The approved Match's `commissionTerms` remain unchanged and are also preserved on the draft. Ordinary selling-price edits never change the approved rate.
- Existing version 1 localStorage applications and drafts migrate in memory to the version 2 pricing model and are saved in version 2 on the next write. Records are not duplicated during migration.
- Commission figures only visualize proposed terms. There is no payout, Arcade commission API, Shopify Collabs, or creator revenue distribution integration.
- Persistence belongs to this browser and origin. Clearing site storage removes demo applications and drafts. Other tabs receive storage updates, but localStorage cannot provide server-grade atomicity across simultaneous writers. A backend must enforce unique active matches and idempotent launch transactions.
- localStorage can be edited by the browser user; this is a prototype, not an authorization boundary. Production must derive merchant identity and approval server-side.
- No Shopify OAuth, payment/checkout, royalties, manufacturing, fulfillment, or creator editing features are implemented.

## Future integration

See [proposed API contracts](docs/api-contracts.md). These are proposals, not endpoints implemented by the current Hono backend. The existing backend uses brands/products/revisions; it needs an explicit adapter or new merchant-facing endpoints before integration.

Reset only the merchant demo using browser developer tools:

```js
localStorage.removeItem('mup.merchant.demo.v1');
location.reload();
```

This leaves the creator app's SQLite data untouched.
