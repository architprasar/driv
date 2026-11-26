# Market-readiness handoff

This pass hardens the implemented cars, parts and auction journeys. It does not claim that live payment accounts, email transport, business policies or hosting have been approved or tested with real customers.

## What changed

- Browser access/refresh tokens are HttpOnly cookies set by the same-origin Next.js API gateway. Tokens are stripped from login, registration, refresh and password-change responses. Cross-origin writes are rejected; request bodies and uploads are bounded. Client refresh is single-flight and coordinated between tabs when browser locks are available. Temporary refresh failures retain the session.
- Registration supports full display names and case-insensitive unique email identities. Email verification (required for public production bidding), password reset, password-change session revocation and refresh-token logout work. Old sessions issued before the password-revocation change need to sign in again.
- Unexpected API errors return a safe JSON message and support reference. Dependency outages return 503; conflicting transactions return 409. Public pages have recovery/404 screens. Recovery uses the current Next.js `retry` API to refetch server content. Unavailable search/catalogues do not become false empty/missing results.
- Checkout persists its attempt key and can recover a saved order after a lost response/reload. Parallel attempts with the same key return the same order. PostgreSQL locks protect the last inventory unit and seller settlement queries.
- Provider refunds use current provider state when delayed/out-of-order webhook events arrive. Late payment after inventory release is refunded once. WebSocket notification failures do not turn committed bids into failed responses.
- Persistent email records retry transport failures without rolling back orders. Sent/expired message bodies are cleared. SMTP is an at-least-once transport: a crash after acceptance can still cause a repeated email.
- Support has customer/staff reply threads, staff attribution and customer notifications. Customers cannot impersonate staff or read another customer’s ticket.
- Listing photos can be added, made primary and removed. The backend enforces ownership and the ten-photo limit and chooses a replacement primary image.
- Vendor identity documents are outside public media. Only the owner and staff can download them, and downloads are not cached. Replacing verification documents or changing business identity returns the profile to review. Public serving blocks the legacy `/media/vendor_docs/` path.
- Parts search, condition, price, stock and fitment filters and catalogue pagination work. Review counts come from verified purchase records. Home/auction surfaces no longer manufacture inventory, reviews or inspection claims during outages. VIN history shows stored records, not an invented registry/title check. Insurance/challan previews no longer fabricate records or quotes; finance is clearly an estimate.
- Public help, operational policy pages and current city selection are connected to real flows. Provider/domain/business configuration remains a launch requirement.

## Repeatable verification

Latest local verification: **128 PostgreSQL backend tests passed**; SQLite passed with two PostgreSQL-only tests skipped; **7 Playwright journeys** and **4 inventory tests** passed. Production build, TypeScript, migration drift and Compose configuration checks passed. Lint has zero errors and 22 warnings. Both dependency audits report zero known vulnerabilities. See [validation evidence](../artifacts/readiness/validation.txt) and [structured results](../artifacts/readiness/validation.json). The running local website is `http://localhost:3001`.

A production standalone smoke check confirmed that server-rendered detail pages and API-gateway media URLs use the configured public HTTPS origin without internal redirect loops. This simulated trusted gateway headers; it did not deploy public DNS/TLS.

```sh
npm run lint
npm run test:inventory
npm audit --audit-level=moderate
npm run build
cd backend
venv/bin/python manage.py makemigrations --check --dry-run
venv/bin/python manage.py test --noinput
```

`npm run test:e2e` starts its own frontend on **3100**, API on **8100**, lifecycle worker, temporary database and synthetic accounts. It refuses to overwrite an existing QA database. It does not use `backend/db.sqlite3` or real provider payments. Install its browser once with `npx playwright install chromium`. To use an existing compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

The repository Playwright suite covers HttpOnly sign-in, CSRF rejection, temporary refresh failure/retry, lost checkout-response recovery, payment decline/retry, dispatch/receipt/review/return, direct vehicle handover, auction proxy privacy/winner checkout, pagination/help/404 navigation. Backend tests also run against PostgreSQL, including concurrent checkout collisions. SQLite intentionally skips the two assertions that require PostgreSQL row locking.

Additional browser evidence in `artifacts/readiness/` covers actual API shutdown/recovery, email verification/reset, staff support replies, photo management, private verification downloads, Redis broadcasts between API/worker processes, and desktop/mobile rendering. These use separate PostgreSQL/media fixtures and test payments.

CI runs lint, dependency checks, production build, PostgreSQL tests and the isolated Playwright suite. Dependency updates include Next.js 16.4.3, Django 5.2.18 and patched runtime packages. Uvicorn now serves ASGI HTTP/WebSockets; Daphne/Twisted were removed from the runtime dependency chain.

## Public-launch configuration

Run `backend/venv/bin/python backend/manage.py check --deploy --fail-level ERROR`. The local development defaults deliberately fail the launch gate. The check catches debug mode, a development/placeholder secret, missing live provider/webhook keys, an HTTP/local frontend URL, SQLite, missing shared Redis, a non-delivering email backend, missing trusted origins, wildcard hosts, invalid policy amounts, missing operator identity and publicly located identity files. It validates configuration shape, not merchant approval or successful external delivery.

Before launch, supply and verify:

1. The public domain and DNS, operator business/contact details, approved terms/privacy/return policies, tax settings and delivery charges.
2. A supported live merchant/Connect account, signed webhook configuration, seller onboarding and account/country capabilities. Complete provider-approved payment/refund/transfer validation. No real charges, refunds or bank payouts were executed here.
3. A verified email sender and working transport; verify recovery and transaction messages reach real inboxes. Monitor pending/expired delivery records in admin.
4. Hosting, HTTPS termination, PostgreSQL, shared Redis, persistent public/private media, backups and a tested restore. Set explicit allowed/trusted hosts. Keep database/cache/API service ports private to the gateway network.
5. Staff accounts and access controls, staff verification/refund/dispute processes, monitoring of worker heartbeat/5xx/refund failures, and a plan for courier/physical vehicle/document checks. The app records tracking and handover; it does not perform government title transfer or courier scans.

Health endpoints: `/api/health/live/` checks the process; `/api/health/ready/` checks database/cache and, in production, a recent shared lifecycle-worker heartbeat. A dead/stale worker removes readiness rather than letting unpaid reservations and auctions silently stop progressing.

## Container deployment template

`deployment/` contains separate non-root frontend/backend images, PostgreSQL, Redis, worker, persistent media, migration gate and Caddy HTTPS routing. Copy `deployment/env.example` to `deployment/.env.production` and replace placeholders; never commit that file.

```sh
docker compose --env-file deployment/.env.production -f deployment/compose.production.yml config -q
docker compose --env-file deployment/.env.production -f deployment/compose.production.yml build
docker compose --env-file deployment/.env.production -f deployment/compose.production.yml up -d
```

The migration service must complete the deployment check, schema migrations, private-document migration and static collection before services start. Back up the database and public/private media before upgrades. `privatize_vendor_documents --dry-run` previews the legacy file move; the real command moves referenced legacy identity files into private storage without changing their model names. It refuses path traversal and existing-destination collisions.

The Compose configuration was validated locally. Container image execution was not tested because the Docker daemon was unavailable. Validate gateway/TLS/container behavior on the intended host before routing real users to it.

Implementation references: [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Django security release](https://www.djangoproject.com/weblog/2026/oct/06/security-releases/). These informed hardening; they are not a certification or legal review of this marketplace.
