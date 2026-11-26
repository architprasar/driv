# Dashboard workspaces

The account, seller, and vendor dashboards share an authenticated layout, navigation,
forms, tables, status badges, loading states, errors, and mobile navigation.
Marketplace navigation and its floating assistant are hidden within the workspaces.

## Pages

| Workspace | Routes |
| --- | --- |
| Account | `/profile`, `/profile/orders`, `/profile/orders/[id]`, `/profile/bids`, `/profile/payments`, `/profile/saved`, `/profile/valuations`, `/profile/addresses`, `/profile/notifications`, `/profile/settings`, `/profile/support`, `/profile/vendor-registration` |
| Seller | `/dashboard`, `/dashboard/cars`, `/dashboard/cars/[id]/edit`, `/dashboard/parts`, `/dashboard/parts/[id]/edit`, `/dashboard/sales`, `/dashboard/auctions`, `/dashboard/analytics` |
| Vendor | `/vendor/dashboard`, `/vendor/dashboard/listings`, `/vendor/dashboard/listings/[id]/edit`, `/vendor/dashboard/auctions`, `/vendor/dashboard/payouts`, `/vendor/dashboard/activity`, `/vendor/dashboard/business` |

Vendor pages require a registered vendor profile. Other accounts see a registration
prompt. Any account can use its own seller workspace; all inventory and business
queries are scoped to the authenticated owner.

## Data and behavior

`GET /api/dashboard/workspace/<section>/` supplies full-account summary counts and
paginated inventory, sales, auctions, bids, payments, valuations, payouts, or activity.
Inventory editing reads `/api/dashboard/workspace/<cars|parts>/<id>/` without
incrementing public listing views. Mutations use the existing domain APIs.

- Vehicle and parts lists support server search, filtering, ordering, and pagination.
- Both quick price/stock editing and full listing editing are available.
- Owner checks protect listing changes and auction management. Order-linked listings
  cannot be deleted, and open auction vehicles cannot change price or availability.
- Auction forms schedule lots. Owners manually start them within their bidding window,
  extend live lots, or close them. Closing uses the existing winner/order workflow.
- Orders use server filters and dedicated item, delivery, payment, and progress pages.
- Revenue includes only the owner's line items from completed payments, excludes
  cancelled orders, and keeps currencies separate. Customer payments are not a wallet.
- Saved searches persist real criteria. Their matches endpoint applies brand, city,
  budget, fuel, transmission, and supported year criteria to active vehicles.
- Address creation/editing, notification read actions, support requests, password
  changes, business contact editing, and document uploads connect to real APIs.
- Profile updates cannot change account roles. Vendor status and membership remain
  controlled by the backend.

Payout pages track existing payout records; they do not initiate bank transfers.
Saved searches provide matching results in the app, without claiming email or push
alert delivery. This change does not add a background auction scheduler.

## Staff operations

The existing Django admin at `/admin/` now includes inventory, auctions, orders,
payments, vendor profiles, payouts, business activity, and support requests.
Staff order-status changes create customer tracking updates; verification and
membership changes create vendor activity. Payment and auction history is read-only.
Existing Django staff permissions apply; no administrator account is created.

## Local development

Use the existing Next.js and Django commands. When other projects occupy the default
ports, the current local frontend uses port 3001 and Django uses port 8002:

```sh
cd backend
venv/bin/python manage.py runserver 127.0.0.1:8002
```

```sh
NEXT_PUBLIC_API_URL=http://127.0.0.1:8002/api \
NEXT_PUBLIC_API_ORIGIN=http://127.0.0.1:8002 \
API_SERVER_URL=http://127.0.0.1:8002/api \
npm run dev -- --port 3001
```

## Validation

Backend regression tests are in `backend/apps/core/test_workspace.py`. They cover
account isolation, inventory pagination and editing, role protection, default addresses,
password changes, actual saved-search matching, auction ownership/lifecycle actions,
separate payment currencies, and owner-only editor reads.

Browser screenshots and the route-check report are under `artifacts/dashboard/`.
Browser mutation checks used a temporary SQLite copy and a separate API instance;
the original database was not seeded or modified by those checks.
