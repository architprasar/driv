# Drivio Cars24-Parity Delivery Backlog

## Epic 1: Discovery, Navigation, and City Context
### Story 1.1: Multi-lane global navigation
Acceptance Criteria
- Header shows `Buy`, `Sell`, `Loans`, `Car Check`, `Insurance`, `Challan`, `Support`.
- Each lane links to a functional route (not placeholder).
- Mobile nav exposes same lanes.

### Story 1.2: Persistent city selection
Acceptance Criteria
- User can set city from header.
- Selected city persists across pages and refresh.
- Cars/parts/search results are city-scoped by default.

### Story 1.3: Home lane modules
Acceptance Criteria
- Home renders lane-specific cards/CTAs for buy/sell/loan/check/challan.
- Trust strip shows inspection/warranty/return/payment assurances.

## Epic 2: Used Cars Listing Parity
### Story 2.1: Faceted filters
Acceptance Criteria
- Filters support city, budget, brand/model, fuel, transmission, body type, year, mileage, owner count.
- Filter state is URL-synced and shareable.
- API supports all listed filters.

### Story 2.2: Sorting parity
Acceptance Criteria
- Sort supports relevance, price asc/desc, year desc, mileage asc, newest.
- Frontend sort labels map correctly to backend ordering fields.

### Story 2.3: Rich listing cards
Acceptance Criteria
- Cards show ownership, inspection badge, assurance tags, EMI from, delivery ETA.
- Empty state provides recovery CTAs and recommendations.

## Epic 3: Car Detail Trust Stack
### Story 3.1: Inspection and history evidence
Acceptance Criteria
- Detail page shows subsystem inspection summary and score.
- Ownership/service/legal/challan indicators are visible.

### Story 3.2: Commerce confidence panel
Acceptance Criteria
- Price breakup, EMI simulation, and loan CTA are present.
- Warranty/return/repair assurance blocks are visible and linked.

### Story 3.3: Action flows
Acceptance Criteria
- Test drive, reserve, and callback CTAs submit valid requests.
- Similar cars panel renders with available inventory.

## Epic 4: Sell Car Journey
### Story 4.1: Registration-led entry
Acceptance Criteria
- User can start with reg number or manual make/model flow.
- Validation prevents incomplete starts.

### Story 4.2: Valuation workflow
Acceptance Criteria
- Valuation returns min/max range and confidence hints.
- User can proceed to schedule inspection from valuation result.

### Story 4.3: Offer and payout tracking
Acceptance Criteria
- Seller sees offer timeline states and next action.
- Pickup/payment/RC transfer status is visible in dashboard.

## Epic 5: Parts Marketplace Parity
### Story 5.1: Vehicle fitment-first browsing
Acceptance Criteria
- Parts listing supports year/make/model/variant fitment filters.
- Compatibility label shown on cards and detail pages.

### Story 5.2: Seller inventory consistency
Acceptance Criteria
- `seller=me` works for authenticated users.
- Parts dashboard renders only seller-owned listings correctly.

### Story 5.3: Listing and detail completeness
Acceptance Criteria
- Part create flow validates required fields and returns usable payload.
- Part detail shows compatibility, warranty/return, and seller trust signals.

## Epic 6: Checkout, Payments, and Orders Hardening
### Story 6.1: Checkout payload contract integrity
Acceptance Criteria
- Checkout submits only fields accepted by backend.
- Address, delivery method, and cart state are validated before order creation.

### Story 6.2: Payment lifecycle correctness
Acceptance Criteria
- Order/payment states follow valid transitions only.
- Payment confirmation updates order status deterministically.

### Story 6.3: Order tracking reliability
Acceptance Criteria
- Tracking endpoint returns consistent timeline schema.
- Order detail page handles pending/failed/confirmed states gracefully.

## Epic 7: User Dashboard, Alerts, and Saved Flows
### Story 7.1: Unified dashboard data contract
Acceptance Criteria
- Dashboard response includes user, garage, incoming bids, valuations, counts.
- Frontend renders without schema assumptions or runtime errors.

### Story 7.2: Saved searches and alerts
Acceptance Criteria
- Users can create/edit/delete saved searches.
- New-match alerts are generated and surfaced in notifications.

## Epic 8: Car Check, Challan, Loans, Insurance Services
### Story 8.1: Vehicle History Report module
Acceptance Criteria
- User can request and view a VIN/reg report with timestamp and source metadata.
- Report can be downloaded and revisited.

### Story 8.2: Challan module
Acceptance Criteria
- User can check challans via reg number + OTP verification.
- Pending/paid states and payment receipts are shown.

### Story 8.3: Loans and insurance module
Acceptance Criteria
- Loan eligibility and EMI calculations are available.
- Insurance quote and purchase/renewal flow is represented end-to-end.

## Epic 9: Platform Reliability and Quality Gates
### Story 9.1: Contract governance
Acceptance Criteria
- OpenAPI is published and kept in sync with implemented endpoints.
- Breaking API changes fail CI contract checks.

### Story 9.2: Test coverage expansion
Acceptance Criteria
- Backend tests exist for auth, cars filters/sort, parts seller scope, orders/payments.
- Core user funnels pass automated integration checks.

### Story 9.3: Observability baseline
Acceptance Criteria
- Structured logs and request IDs are emitted for core APIs.
- Error rates and latency metrics are available for critical flows.

## Current Build Focus (Active)
- Phase 2 implementation running now on:
  - Search/listing parity
  - Checkout/payments/orders hardening
  - Parts seller/dashboard completion
