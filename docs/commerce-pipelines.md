# Cars, parts and auction commerce

The marketplace now uses saved server orders and item-level fulfilment. Local checkout explicitly simulates payment; it never collects card details or money.

## Customer and vendor journeys

| Area | Customer | Seller / vendor |
| --- | --- | --- |
| Cars | Browse available vehicles, save/compare, send a question or test-drive request, reserve, pay, confirm keys and transfer documents | Publish details and photos, respond/schedule, prepare the paid sale, arrange pickup, track handover |
| Parts | Check seller-supplied fitment, ask a question, cart and quantities, review delivery/tax totals, reserve, pay, track, confirm receipt, review a delivered purchase | Publish photos, condition and stock, answer questions, prepare paid items, add tracking, manage returns |
| Auctions | Watch, bid or register a private maximum, follow the result, pay the winner-only order, confirm handover | Create a lot for an owned available vehicle, schedule/start/extend during its window, follow the winner payment and fulfilment |
| Returns | Request from a received item, follow seller instructions and refund status | Approve/reject with a reason, physically receive and check the return before refunding/restocking |
| Settlements | See payment/refund records in the order | Verified business connects a payment account, waits for receipt/return window, requests a transfer of eligible earnings |

Unpaid reservations expire and return stock once. Prices, addresses, currency and sellers are snapshotted. Checkout retries reuse an order; payment/refund/transfer retries use stable identifiers. Partial seller cancellations refund and restock that seller's line only. Sellers cannot dispatch unpaid items, mark customer receipt, access other sellers' sales, bid on their own lot, or reactivate sold/reserved vehicles through listing edits. Customers cannot purchase their own listings. Public auction payloads omit other bidders' maximums and the seller's reserve.

Auction close creates exactly one order when a winner meets reserve. Unpaid winner orders expire; the seller can create a new auction afterward. A return makes a car a draft for inspection before republishing. An expired auction cannot be reopened with an extension. The worker isolates a failing order/lot so other due work continues.

## Running locally

Install frontend dependencies and the backend requirements into `backend/venv`, then run:

```sh
npm run dev:marketplace
```

Defaults: frontend 3001, Django/Uvicorn 8002, lifecycle worker every five seconds. `FRONTEND_PORT` and `BACKEND_PORT` override both URLs and WebSocket configuration. Occupied ports cause an explicit error; the script does not stop unrelated services. Existing services can instead be kept running and the worker started separately:

```sh
cd backend
venv/bin/python manage.py marketplace_worker --interval 5
```

The worker opens/closes managed auctions, expires unpaid reservations and matures eligible earnings. Existing seeded auctions are deliberately unmanaged; API-created auctions and auctions receiving a real bid are managed. Django retrieve/bid paths also recheck time boundaries. WebSocket broadcasts use Redis across processes when configured; the auction screen polls canonical state as a fallback.

## Deployment configuration and limits

- Set `DJANGO_DEBUG=False`, a strong `DJANGO_SECRET_KEY`, allowed hosts, frontend/CORS origins, `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL`. Configure the signed webhook at `/api/payments/webhook/` for Checkout completion/failure/expiry and refund updates/failures.
- Live payment uses hosted Stripe Checkout and verifies provider amount, currency, order identity and paid status. A browser success assertion cannot mark an order paid. Missing provider setup returns an actionable service error. Late payments after a released reservation are refunded.
- Configure a supported Stripe Connect platform, seller country/capabilities and onboarding before enabling live transfers. Transfers go to the connected account; the ledger does not claim that a bank payout has arrived. Country/account eligibility, large vehicle payments, supported payment methods and actual provider onboarding must be verified against the intended merchant account. Live provider transactions have not been executed in this workspace.
- Run the lifecycle worker continuously under a process supervisor, or run the configured Celery worker and beat. Do not run duplicate scheduling stacks unnecessarily. Use Redis for cross-process channels and a production database with row locking, such as PostgreSQL. SQLite is for local use; lock conflicts return a retryable response.
- Review `MARKETPLACE_CURRENCY` (INR), `MARKETPLACE_TAX_RATE` (existing configurable default 0.08), `MARKETPLACE_EXPRESS_FEE` (25), `CART_RESERVATION_MINUTES` (35), `AUCTION_PAYMENT_HOURS` (24), and `RETURN_WINDOW_DAYS` (7). Tax calculation is configurable arithmetic, not a jurisdictional tax engine. Shipping uses seller-entered tracking rather than courier integrations.
- Set persistent media storage. Optional `MEDIA_ROOT` and `DB_NAME` allow isolated QA. Inspection scores, reviews, fitment and valuation comparables are shown from stored evidence; inspection/vehicle document verification and physical handover remain operator responsibilities.
- Django admin exposes financial/commerce records read-only. Fulfilment, returns and transfers go through validated services rather than direct status edits.

## Verification

Backend regressions cover checkout atomicity, quantity/ownership guards, price snapshots and signed quotes, payment decline/retry, signed/idempotent webhooks, mismatched payment amounts, reservation expiry, multi-seller partial cancellation, fulfilment, handover, returns/refunds, proxy privacy and scheduled auction winner orders. See `backend/apps/orders/test_pipeline.py`.

Browser journeys use a copied SQLite database and separate media directory with temporary seller/buyer accounts. Screenshots and journey records are in `artifacts/commerce/`. Browser tests exercise local test payments, not live charges, courier scans, bank payouts or legal vehicle registration transfers.

See `docs/market-readiness.md` for the current HttpOnly session gateway, launch configuration gate, private verification storage, deployment template and repeatable browser checks.
