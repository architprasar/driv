# Drivio (DrivioCars) — Product Vision & Current State

*Extracted from the existing codebase (Next.js 16 frontend + Django backend) on 2026-07-24, ahead of a v2 rebuild.*

## 1. What the product is

**DrivioCars** is an India-focused (₹ pricing, Indian cities) online marketplace and services hub for the used-car lifecycle. The pitch on the homepage is:

> "50,000+ Assured used cars from verified sellers across 200+ cities. Every car inspected, every deal protected."

It's not just a classifieds board — it bundles together everything an owner or buyer touches around a car's life:

- **Buy** a used/certified car
- **Sell** a car (guided, "white-glove" flow) or list spare parts
- **Bid** on salvage/damaged vehicles via live auctions
- **Inspect** — 250-point certified inspection reports per car
- **Value** — instant AI-style valuation estimate for a car you own
- **History** — VIN-based vehicle history report (accidents, recalls, ownership transfers)
- **Finance** — EMI calculator + partner bank loan offers
- **Insure** — insurance quote comparison
- **Challan** — traffic fine / e-challan lookup (India-specific)
- **Parts marketplace** — OEM/aftermarket parts, buy or sell, with car-compatibility matching
- **Vendor program** — B2B sellers (salvage yards/dealers) with their own dashboard, tiered accounts, payouts

The tagline framing across the app is **trust + transparency**: "Assured" badge, escrow-protected payments, 7-day returns, RC title verification. This is clearly modeled on platforms like CarDekho/Cars24/Copart/CARFAX rolled into one, adapted to the Indian market.

## 2. Core domains (from the Django backend)

The backend (`backend/apps/*`) is cleanly split into 13 domain apps, which is a good map of the actual feature set:

| App | Purpose |
|---|---|
| `accounts` | Custom user model with roles: **buyer / seller / vendor / admin**; addresses |
| `cars` | Brand → Model → Car catalog; images, features, condition, VIN, status (draft/active/sold/archived) |
| `parts` | Spare parts catalog with SKU, stock, brand/model compatibility (M2M), genuine/aftermarket flag |
| `auctions` | Salvage/damaged car auctions: lots, bids (incl. **proxy bidding**), watchers, live event log (outbid, extended, closed, winner) |
| `inspections` | Structured inspection reports: categories → checkpoints, photos, overall score/grade, CPO flag |
| `valuations` | Instant valuation estimates (min/max/avg, demand premium, mileage adjustment) tied to a car |
| `orders` | Order + line items + status timeline (placed → delivered), tracking, driver name |
| `payments` | Stripe-backed payments, multiple methods incl. **EMI**, refund status |
| `cart` | Unified cart for both parts and cars |
| `vendors` | Vendor business profiles, KYC docs, verification workflow, tiers (standard/gold/platinum), payouts, activity feed |
| `notifications` | Categorized (bids/market/account/orders) user notifications |
| `search` | Saved searches with push/email alerting on new matches |
| `support` | Help center (categories/FAQ articles), support tickets, testimonials |

Notable infra choices: **Django Channels + daphne** (in-memory channel layer) — built for real-time features, almost certainly the live-auction bidding. **Stripe** is wired for payments. CORS is scoped to explicit localhost origins (dev-only setup right now).

## 3. Frontend surface (Next.js App Router)

`src/app/` has ~35 route segments. Grouped by intent:

**Marketplace core**: `/cars`, `/cars/[id]`, `/parts`, `/parts/[id]`, `/parts/list`, `/parts/home`, `/search`, `/compare` (side-by-side spec comparison), `/cart`, `/checkout/booking`, `/orders`, `/orders/[id]`

**Selling**: `/sell` (hub with capture form), `/sell/details` (valuation-driven pricing breakdown with pricing factors like "positive/negative/neutral" impact), `/sell/part` (4-step listing wizard), `/dashboard/parts` (seller's own listings)

**Auctions**: `/auctions`, `/auctions/[id]`, `/auctions/live` (real-time "control room" style UI — countdown timer, accept bid, extend time)

**Trust/diligence tools**: `/inspection`, `/inspection/[id]`, `/inspection/report`, `/inspection/report/[id]`, `/history/[vin]`, `/valuation`

**Ancillary financial services**: `/finance` (EMI calculator + bank partner offers), `/insurance` (quote comparison), `/challan` (fine lookup)

**Vendor/B2B**: `/vendor`, `/vendor/register` (3-step KYC wizard), `/vendor/dashboard`

**Account/platform plumbing**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile` (+ `/settings`, `/saved`, `/notifications`, `/orders`), `/select-city` (city-scoping cookie), `/help`, `/notifications`

## 4. What's real vs. what's a mockup right now

This matters a lot for planning a rebuild — a chunk of the "features" are **static/demo UI, not wired to the backend**:

- `/auctions/live`, `/inspection/report/[id]`, `/valuation`, `/compare` — hardcoded sample data (Porsche 911 GT3 RS, Porsche Taycan, fixed ₹ figures), no API calls. These read as **design mockups translated straight into JSX**, not live features.
- `/challan` and `/insurance` — explicitly commented as `v1 flow: deterministic local preview while payment integration is pending`; results are computed client-side from the input string, not a real government/insurer API.
- `/finance` — EMI math is real (amortization formula), but bank offers are hardcoded partners.
- `/sell/details`, `/history/[vin]`, `/sell/part`, `/dashboard/parts`, homepage — these **do** call the Django API (`serverFetch`/`apiClient`) and reflect real backend models (valuations, vehicle history events, parts).
- `/vendor/dashboard`, `/vendor/register` — UI-only stat cards with static numbers (₹1,42,85,000 earnings, "24 live auctions") — not fetched.

So the product today is really: **a solid, real data model + a handful of genuinely wired flows (home, car browsing, parts listing/selling, valuation-to-sell handoff, vehicle history), surrounded by a much larger set of beautifully designed but non-functional screens** sketching out where the product wants to go.

## 5. Product ideas embedded in the current build (worth keeping)

These are the ambitious ideas already expressed in the code/design, even if unimplemented — a good backlog for v2:

1. **One trust layer across every transaction type** — the same "Assured / 250-point inspection / escrow / 7-day return" trust language is meant to apply uniformly to cars, parts, and salvage auctions.
2. **Valuation → Sell funnel** — get an instant estimate, see itemized pricing factors (why your car is worth what it is), then convert directly into a listing or "list in auction" for damaged vehicles.
3. **Salvage auction vertical** distinct from normal used-car sales — damage type/severity taxonomy, repair cost estimate, reserve price, proxy bidding, real-time outbid/extend events (Copart/IAAI-style, India-flavored).
4. **Vehicle history as a standalone trust product** — VIN lookup independent of whether the car is listed on Drivio, with verified vs. unverified event sourcing and recall flags.
5. **Bundled financial services around the car** — financing (EMI), insurance quotes, and challan (fine) checks positioned as convenience add-ons at point of purchase/ownership, not separate products.
6. **Vendor-as-a-channel** — a distinct B2B onboarding (KYC, tiers, payouts) so salvage yards/dealers can feed inventory into the auction pipeline at scale, separate from peer-to-peer selling.
7. **Parts as a first-class second marketplace** — not just car listings; a full SKU/stock/compatibility-driven parts catalog with its own sell wizard, reviews, and dashboard.
8. **Real-time infrastructure already chosen** — Channels/daphne suggests the intent was always live bidding/notifications, not polling.

## 6. Honest gaps / risks in the current build

- Heavy reliance on **hardcoded external image URLs** (`lh3.googleusercontent.com/aida-public/...`) — these are AI-generated placeholder assets (Stitch/Gemini), not owned media; will need real asset pipeline.
- No automated tests found alongside the flows that matter most (auctions, payments).
- `CORS_ALLOW_ALL_ORIGINS = False` with hardcoded localhost origins — fine for dev, needs real config for prod.
- Payments app has Stripe fields but the actual checkout flow's depth wasn't verified beyond `cart`/`orders` models — worth auditing before rebuild reuses it.
- Several "flagship" screens (live auction control room, inspection report, valuation hero, comparison) are disconnected from data — if the v2 pitch leans on these, they need real endpoints, not just UI.
- Design system is Material Symbols + custom Tailwind tokens (`on-surface`, `primary-container`, etc.) — consistent, but worth deciding whether to carry forward or replace as part of the "proper design" reset.

## 7. Summary for the rebuild

The **domain model is the strongest asset here** — 13 well-scoped Django apps covering the full used-car lifecycle (buy/sell/auction/inspect/value/history/finance/insure/parts/vendor) represent real product thinking, not boilerplate. The **weakness is execution depth**: many of the most compelling screens are unwired mockups, assets are placeholder AI images, and the visual design (while coherent) is generic "AI-generated startup" aesthetic rather than a distinctive brand.

A v2 rebuild can likely **keep the domain/data model and information architecture almost as-is**, and focus the "proper design and all" effort on: (a) a distinctive visual identity instead of the current Material-esque template look, (b) wiring the mockup screens (live auctions, inspection reports, valuation, comparison, vendor dashboard) to the already-existing backend models, and (c) deciding which ancillary services (challan, insurance) are real integrations vs. cut for v1.
