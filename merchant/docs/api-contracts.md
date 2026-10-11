# Proposed merchant API contracts

These contracts are future work. The current Hono backend does **not** implement them; the prototype does not call them. Existing backend brands/products/revisions must be deliberately mapped to merchant `Idea` and `Branch` models. A branch remains an independent design, never a Shopify variant.

## MUP backend

Use authenticated, server-derived merchant/creator identity. Do not trust `merchantId` sent by the browser. IDs are opaque strings; timestamps use ISO 8601 UTC; monetary values should use decimal strings or integer minor units in server storage. Responses below use the TypeScript types in `src/types` for clarity.

| Method | Proposed endpoint | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/ideas` | `?q=&category=&sort=popular|recent&cursor=` | `{ items: Idea[], nextCursor: string | null }` |
| GET | `/api/ideas/:ideaId` | — | `{ idea: Idea, creator: User }` |
| GET | `/api/ideas/:ideaId/branches` | — | `{ items: Branch[] }` |
| GET | `/api/branches/:branchId` | — | `{ branch: Branch, creator: User }` |
| POST | `/api/matches` | `{ branchId }`; `Idempotency-Key` header | `201 { application: MatchApplication }`, initially pending with a snapshot of the branch's proposed `commissionTerms` |
| GET | `/api/matches` | `?status=pending|approved|rejected&cursor=` | Authenticated merchant's applications |
| PATCH | `/api/matches/:id` | `{ status: "approved" | "rejected" }` | `{ application: MatchApplication }`; authorized creator/admin only; approval preserves the rate and recipient and marks terms approved |
| POST | `/api/product-drafts` | `{ applicationId, title, description, sellingPrice: "35.00", currency: "USD" }`; `Idempotency-Key` header | `201 { draft: ProductDraft }` with a server-calculated `pricing` snapshot and approved `commissionTerms` |
| GET | `/api/product-drafts` | `?cursor=` | Authenticated merchant's drafts |

Resolve media, branch, idea, creator, approved rights, and cost snapshot on the server when creating a draft. Do not accept untrusted cost/ownership metadata from the client. Store the application ID, branch ID, idea ID, creator attribution, shop ID, and returned Shopify product ID in the MUP database. Approval should bind to a design revision so subsequent community edits cannot silently alter an approved design.

The branch catalog may propose a commission rate, defaulting to 10% in the demo. The Match is the MUP-owned agreement record: `commissionTerms = { commissionRate, commissionRecipientId, commissionStatus }`. Capture those terms when the merchant applies and retain the same rate and designated recipient when a creator approves. One recipient per Match is sufficient for this MVP. The product draft keeps both the approved Match terms and a pricing snapshot. A change to selling price changes the commission **amount**, not the approved **rate**. The server should calculate `creatorCommissionAmount = sellingPrice × commissionRate`, `merchantEstimatedProfit = sellingPrice − manufacturingCost − creatorCommissionAmount`, and `merchantEstimatedProfitMargin = merchantEstimatedProfit / sellingPrice × 100`, guarding against zero/invalid prices and using a documented decimal rounding policy.

Demo-only cost/rate adjustments are saved as a separately marked `pricing.demoOverride` scenario in the local prototype; they never amend `commissionTerms`. A production draft endpoint should derive manufacturing cost and commission rate from trusted records. If scenario testing is retained, use a distinct nonbinding simulation endpoint or explicitly marked fields. These estimates exclude shipping, Shopify/payment fees, advertising, taxes, returns, and platform fees. This contract does not create any commission payable, payout, or accounting event.

Suggested error shape:

```json
{ "error": { "code": "MATCH_NOT_APPROVED", "message": "Creator approval is required.", "field": "applicationId" } }
```

Use 400 for invalid input, 401 for missing authentication, 403 for ownership/approval failures, 404 for missing resources, 409 for duplicate active applications/drafts or stale state, 422 for upstream validation, and 503 for retryable upstream unavailability. Merchant list endpoints must filter server-side. Demo approval controls should be removed from the merchant production build.

Enforce a unique active application per `(merchantId, branchId)` for pending/approved states. A rejected application remains historical; a new attempt gets a new ID. Only pending applications transition to approved/rejected in this prototype. Enforce one draft per approved application with transactions and idempotency. Shopify timeouts require reconciliation to avoid duplicate products on retry.

## Shopify gateway

The prototype's `ShopifyDraftGateway.createDraft` receives a validated draft snapshot and returns `{ shopifyProductId }`. Its mock implementation creates a visibly fake `mock_shopify_…` ID. A production implementation should call the **MUP server**, which owns the Shopify Admin API access token. Never put tokens, OAuth secrets, or Arcade keys in frontend code.

Proposed server sequence:

1. Authenticate the shop/merchant and verify the approved application, ownership, design revision, and unique launch key.
2. Validate product copy, currency, price, attribution, and accessible product media. Replace SVG demo illustrations with supported production media.
3. Call Shopify Admin GraphQL `productCreate` with explicit `DRAFT` status, title, sanitized description, and supported media. Store the returned real product GID. Handle GraphQL errors and mutation `userErrors`. Keep Match ID, Branch ID, and commission terms in MUP's database; do not assume they are native Shopify product fields or imply that Shopify will pay the creator.
4. Set the initial variant price with `productVariantsBulkUpdate` using the actual variant ID returned/fetched for the created product. The initial variant is a Shopify pricing/option record; it does **not** represent the community branch.
5. Persist a launch record with idempotency and recovery state. If product creation succeeds but price/media work fails, retry against the known product ID rather than creating another product. Keep the product in draft status until every required step is complete.
6. Return the resulting draft to the UI. Publishing, fulfillment, checkout, and inventory remain separate future scope.

Pin and test a supported Shopify API version at integration time. Do not treat this document as a complete GraphQL implementation or assume the current backend already supports Shopify.

Arcade commission/payout APIs, Shopify Collabs, or MUP commission tracking may be evaluated later if officially supported and agreed with creators. None are called by this prototype.

Official references: [Shopify productCreate](https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/productCreate) and [Shopify productVariantsBulkUpdate](https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productVariantsBulkUpdate). Consult the schema for the version selected at implementation time.
