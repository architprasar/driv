# DrivioCars — UI Design Brief (every page, UI level only)

This lists everything the current site shows, page by page: sections top to bottom, text, data on each card, buttons, form fields, filters, and states. It was taken from the code in `src/app` and `src/components` on 2026-09-23.

**Legend**
- 🟢 **Live**: shows real data from the backend.
- 🟡 **Demo**: fixed placeholder content; the URL's id is ignored.
- ⚪ **Static**: buttons and controls don't do anything yet.

---

## 0. At a glance

**40 screens to design**, grouped into 8 areas. There are 43 routes in total; 3 of them only redirect, and one linked page is missing.

| # | Area | Screens | URLs |
|---|---|---|---|
| A | Site shell | 5 components | Navbar, mobile drawer, mobile bottom bar, footer, toast |
| B | Home & discovery | 4 | `/`, `/search`, `/select-city`, `/help` |
| C | Buy cars | 3 | `/cars`, `/cars/[id]`, `/compare` |
| D | Car services | 7 | `/finance`, `/insurance`, `/challan`, `/valuation`, `/history/[vin]`, `/inspection/[id]`, `/inspection/report/[id]` |
| E | Sell | 3 | `/sell`, `/sell/details`, `/sell/part` |
| F | Parts marketplace | 5 | `/parts`, `/parts/home`, `/parts/list`, `/parts/[id]`, `/dashboard/parts` |
| G | Auctions & vendors | 5 | `/auctions`, `/auctions/[id]`, `/auctions/live`, `/vendor/register`, `/vendor/dashboard` |
| H | Cart & checkout | 4 | `/cart`, `/checkout`, `/checkout/booking`, `/orders/[id]` |
| I | Account | 9 | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile`, `/profile/orders`, `/profile/saved`, `/profile/notifications`, `/profile/settings` |

- **Redirect-only (no design needed):** `/dashboard` → `/profile`, `/notifications` → `/profile/notifications`, `/saved` → `/profile/saved`.
- **Missing page:** `/vendor/inspection-guide` is linked from the auctions page but doesn't exist, so it currently shows a 404.

### Main user journeys
1. **Buy a car:** Home → `/cars` → `/cars/[id]` → Book Test Drive (`/checkout/booking`)
2. **Sell a car:** `/sell` (form) → `/sell/details` (price) → Book Inspection or List in Auction
3. **Buy a part:** `/parts` → `/parts/list` → `/parts/[id]` → `/cart` → `/checkout` → `/orders/[id]`
4. **Sell a part:** `/sell/part` (4-step wizard) → `/dashboard/parts`
5. **Bid on an auction:** `/auctions` → `/auctions/[id]` (live bidding)
6. **Account:** `/login` or `/register` → `/profile`, with the Orders, Settings, Notifications and Saved Searches tabs

---

## 1. Current design system ("Assured")

- **Fonts:**
  - Headings: **Plus Jakarta Sans** (400–800)
  - Body: **Inter** (400–700)
  - Icons: **Material Symbols Outlined**
- **Type scale:**

  | Style | Size | Weight |
  |---|---|---|
  | display | 44→72px | 800 |
  | h1 | 32→48px | 800 |
  | h2 | 24→36px | 700 |
  | h3 | 18→24px | 700 |
  | h4 | 18px | 600 |
  | label caps | 11px uppercase | 700 |

- **Colours:**

  | Role | Main | Hover / container / border |
  |---|---|---|
  | Primary blue | #003EC7 | hover #0033A8, subtle #EEF2FF, border #C7D2FE |
  | Assured green (trust / verified) | #059669 | container #ECFDF5, border #6EE7B7 |
  | Live / auction amber | #D97706 | container #FFFBEB, border #FDE68A |
  | Secondary slate | #475569 | container #F1F5F9 |
  | Error | #DC2626 | container #FEE2E2 |
  | Text | #0F172A | muted #475569, outline #64748B, borders #E2E8F0 |
  | Surfaces | #FFFFFF | #F8FAFC, #F1F5F9, #E2E8F0 |
  | Dark sections | bg #0A0F1E | card #111C33, border #1E3A5F, text #F1F5F9, muted #94A3B8 |

- **Radius:** 4, 8, 12, 16, 20, 24 or 32px, or a full pill.
- **Signature elements:**
  - Green "✓ ASSURED" pill
  - Amber "LIVE" pill with a pulsing dot
  - Cards lift on hover
  - Shimmer while loading
  - Fade-up animation when sections scroll into view
- **Buttons:** primary, secondary, ghost, assured (green), outline, danger. Sizes sm, md, lg. Each can be a pill, full width, loading (spinner) or disabled.
- **Badges:** assured, live, primary, secondary, success, warning, error, neutral. Text is 11px uppercase, with an optional dot or icon.
- **Content widths:** 768, 1024, 1152, 1280 (default) or 1536px. Side padding is 16, 24 or 32px.
- **Toast:** bottom centre, max width 448px, shows for about 2.6s. Colours: success (green), error (red) or info (dark slate).

---

## A. Site shell (appears on every page)

### A1. Navbar (fixed at the top)

**Row 1 (64px), left to right:**
1. **Logo:** blue rounded square with a car icon, plus the "DRIVIOCARS" wordmark (the wordmark is hidden on the smallest phones). Links to `/`.
2. **Search bar** (tablet and up). See A6.
3. **City selector** (screens 1280px and wider only). Shows a pin and the city name, e.g. "All Cities". Links to `/select-city`.
4. **Right side:**
   - Search icon (mobile only)
   - Cart icon (no item-count badge)
   - Profile icon
   - Divider
   - **"+ Sell Car"** button (tablet and up)
   - Hamburger menu (screens under 1024px)

**Row 2 (36px, desktop only): category strip.** Buy Car · Sell Car · Auctions · Parts · Finance · Insurance · Value My Car · RC Check · Challan. On the right: green ✓ "ALL CARS DRIVIOCARS ASSURED".

> Signed in and signed out look identical. There's no user name, no avatar and no cart count.

### A2. Mobile drawer (opens from the left, 300px wide, dims the page behind it)

- **Header:** logo and a close button.
- **Links, each with an icon** (the current page is highlighted in blue):
  - Buy Used Car
  - Sell Your Car
  - Live Auctions
  - Parts Marketplace
  - Car Finance
  - Car Insurance
  - Value My Car
  - RC & History Check
  - Challan Check
  - Compare Cars
  - Help & Support
- **Footer:**
  - Outlined **"Sign In / Create Account"** button (shown even when the user is signed in)
  - Primary **"+ Sell My Car — It's Free"** button

### A3. Bottom tab bar (mobile only, frosted glass)

Five tabs, each an icon above a label: **Home · Buy · Sell · Cart · Profile**. The active tab is blue, with a filled icon on a light-blue tile.

### A4. Footer

1. **Dark stats strip:**
   - 50,000+ Assured Vehicles
   - 200+ Cities Covered
   - 10 Lakh+ Happy Customers
   - 250 Point Inspection
2. **Brand column:** logo, "India's most trusted platform to buy, sell and finance used cars — with every vehicle Assured.", and a "✓ DRIVIOCARS ASSURED" chip.
3. **Four link columns:**

   | Column | Links |
   |---|---|
   | Marketplace | Browse Inventory · Live Auctions · Parts & Accessories · Become a Vendor |
   | Services | Expert Inspection · Car Financing · Car Insurance · Value My Car |
   | Trust & Safety | RC & History Check · Challan Check · Help Centre · Contact Us |
   | Company | About · Privacy Policy · Terms · Careers (these pages don't exist yet) |

4. **Bottom bar:** "© 2026 DrivioCars. All rights reserved." and a shield with "End-to-End Encrypted · SSL Secured".

### A5. Pages without the site shell

`/login` and all `/profile/*` pages use their own layout, with no navbar, footer or bottom bar.

### A6. Search bar (in the navbar) and its dropdown

- **Closed:** a grey pill input with the placeholder "Search cars, parts, auctions...".
- **Open:** the field widens into a panel and the page behind it blurs.
- **Controls:** a spinner while searching, a × to clear, and Enter opens `/search`.
- **Dropdown states:**
  1. **Fewer than 3 characters typed:**
     - "TRENDING CARS", with 4 rows (thumbnail, name, tagline): BMW M4, Audi RS6, Corvette C8, Range Rover.
     - Hint: "Type at least 3 letters…"
  2. **No results:** icon, "No results found", "We couldn't find anything matching "…"".
  3. **Results:**
     - **VEHICLES (N found):** up to 4 rows, each with a thumbnail, brand + model, year and price in green ₹.
     - **PARTS & GEAR (N found):** up to 4 rows, each with a round thumbnail, name, category and price.
     - Full-width blue button: "View all N search results →".

---

## B. Home & discovery

### B1. Homepage `/` 🟢

1. **Hero** (almost full screen, dark photo, the navbar sits on top of it)
   - Green pill: "✓ INDIA'S MOST TRUSTED PLATFORM"
   - Headline: "Find Your / **Perfect Drive.**" (second line in light blue)
   - Subtext: "50,000+ Assured used cars from verified sellers across 200+ cities. Every car inspected, every deal protected."
   - **Search card** (white, one row):
     - "Make, model…" input
     - City dropdown: All India, Delhi NCR, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad
     - **Search** button
   - Brand chips under the search card: Maruti · Hyundai · Tata · Honda · Toyota
   - 4 trust chips: 250-Point Inspection · 7-Day Returns · Zero Hidden Fees · RC Title Verified
2. **Quick-action cards** (4 cards overlapping the bottom of the hero; 2 per row on mobile, 4 on desktop)

   | Card | Subtext | Style |
   |---|---|---|
   | Buy Used Car | "50,000+ Assured cars" | solid blue |
   | Sell Your Car | "Get best price fast" | white |
   | Live Auctions | "Bid on salvage vehicles" | white |
   | Parts Marketplace | "OEM & aftermarket parts" | white |

3. **Trending Used Cars**
   - Eyebrow "HANDPICKED FOR YOU", a "View All →" link, and 3 car cards (the standard **car card**, see section J).
   - **Empty state:** "No Cars Available Yet" / "Our curated inventory is being updated…", with a "Browse Inventory" button.
4. **Stats** (dark section)
   - "WHY 10 LAKH+ INDIANS TRUST US" / "DrivioCars by the Numbers"
   - 4 stats: 50,000+ Vehicles · 200+ Cities · 10L+ Customers · 4.8★ Rating
5. **Why Choose DrivioCars?** (4 cards, each with an icon, title and one line)
   - 250-Point Inspection
   - DrivioCars Assured
   - Secure Payments ("Escrow-protected…")
   - 7-Day Returns
6. **Sell banner** (blue)
   - "WHITE-GLOVE SERVICE" / "Sell your car for the best price." / "Our experts handle photography, paperwork and buyer negotiations…"
   - "Start Selling →" button, with a photo alongside
7. **Testimonials**
   - "CUSTOMER STORIES" / "Trusted by over 10 Lakh car enthusiasts."
   - 2 quote cards, each with an avatar, 5 stars, the quote, and name + role:
     - Rahul Sharma, Buyer, Delhi NCR
     - Priya Menon, Seller, Bangalore
   - Tall photo with a floating card: "DrivioCars Assured · 250-point inspected · Title clear"

### B2. Search results `/search?q=` 🟢

- **Header:** "Search Results" / "Showing results for "…"".
- **Cars (count):** grid of cards, each with an image, "year • brand", model and price.
- **Parts & Accessories (count):** grid of cards, each with an image, category, name and price.
- **Empty states:**
  - No search term: "Enter a search term in the navbar…"
  - No results: "No results found for "…""
- There are no filters, sorting or pagination.

### B3. Select city `/select-city`

- **Header:** "CHOOSE YOUR CITY" / "Discover cars and parts near you" / a line comparing the feature to BookMyShow (rewrite this).
- **City search:** "Search your city" input, plus quick pills: All Cities · Delhi NCR · Mumbai · Bangalore · Pune.
- **8 city cards**, each with an icon, the name and 2–3 areas. The selected card is outlined in blue.

  | City | Areas |
  |---|---|
  | Delhi NCR | Gurugram, Noida, Faridabad |
  | Mumbai | Andheri, Navi Mumbai, Thane |
  | Bangalore | Whitefield, HSR, Indiranagar |
  | Hyderabad | Gachibowli, Jubilee Hills |
  | Chennai | OMR, T Nagar, Anna Nagar |
  | Pune | Hinjawadi, Kothrud, Baner |
  | Kolkata | Salt Lake, Howrah, New Town |
  | Ahmedabad | SG Highway, Bopal, Maninagar |

- **Empty state:** "No city found for "…"".
- Choosing a city saves it and returns to Home.
- This page doesn't follow the design system (it uses emoji and default colours), so it needs redesigning.

### B4. Help centre `/help` ⚪

1. **Header:** "How can we **help you** today?", with a search box (placeholder: `Search for "how to sell", "bids"...`).
2. **5 category rows**, each with an icon, title and one line: Buying · Selling · Auctions · Parts & Service · Account & Trust.
3. **Contact support:**
   - "Can't find what you're looking for?" / "support team is available 24/7…"
   - Buttons: "Live Chat Now" and "Open a Ticket"
   - Mock chat preview: agent "Sarah Mitchell, Senior Customer Concierge"
4. **Trending Topics:** 3 numbered questions, plus a "View all FAQ" link.

---

## C. Buy cars

### C1. Car listing `/cars` 🟢

1. **Sticky filter bar**
   - Title "Available Cars" (or "Results for "…""), with a count pill
   - **Sort:** Newest · Price Low→High · Price High→Low · Year Newest · Year Oldest · Mileage Lowest · Mileage Highest
   - **Filters** button (shows a badge with the active count) and a **Clear** button
2. **Filter panel "Refine Cars"** (bottom sheet on mobile, centred popup on desktop)
   - Dropdowns:
     - City: Delhi / Mumbai / Bangalore / Hyderabad / Pune
     - Fuel: Petrol / Diesel / Electric / Hybrid
     - Transmission: Automatic / Manual
     - Body: Sedan / SUV / Hatchback / Coupe / Convertible
   - Inputs: Min ₹, Max ₹, Year from, Year to
   - Buttons: Clear and **Apply Filters**
3. **Car grid** (1–4 columns): the standard car card, with an extra "Top Pick ★" badge on cars in excellent condition. A heart (save) button appears on hover.
4. A **"Load More Cars"** button ⚪
5. **Empty state:** "No Vehicles Found" / "Try adjusting…", with a "Clear All Filters" button.
6. **Dark sell banner:** "Sell your exotic car with us." / "Get Started →"

### C2. Car detail `/cars/[id]` 🟢

1. **Photo gallery** (full-width, dark, swipe or scroll)
   - Overlays: "DrivioCars Assured" badge, "👁 N views", dot indicators, "1 / N" counter
2. **Main column (left):**
   - **Title block:**
     - Badges: "{Condition} Condition" and "VIN Validated"
     - H1 "{year} {brand} {model}", with "{variant} · {colour}" below it
     - Big ₹ price and "EMI from ₹XK/mo"
     - Buttons: **Book Test Drive**, **Chat with Seller** ⚪, Save ♡ ⚪, Share ⚪
   - **Key Specifications** (8 tiles with icons): Fuel · Transmission · Horsepower · Mileage (km) · Year · Colour · Body Type · Owners
   - **DrivioCars Assured panel** (green), 4 checks:
     - Inspection Passed (N-point, score /100)
     - History Verified
     - 7-Day Return Window
     - Seller Verified
   - **About this Car** (description)
   - **Inspection Report card:** 5 ticked rows (Mechanical & Engine · Interior Electronics · Brakes & Suspension · Exterior & Body · AC & Electricals), "Overall Status: PASSED", and a ⬇ PDF link
   - **Vehicle History card:** No Accidents · VIN Validated (the VIN) · RC Verified · No Loan Pending
3. **Sidebar (right, stays in view; below the main column on mobile):**
   - **Finance Calculator:**
     - Down payment (20%)
     - Loan term: 36 / 48 / 60 / 72 months
     - Estimated monthly amount
     - "Get Pre-Approved →"
   - **Listed By:**
     - Avatar with the seller's initial, name and "★ 4.9 (124 deals)"
     - Location and "Identity Verified"
     - "Contact Seller" button ⚪
   - **Dark card:** "Assured Buyer Protection" / "7-day returns, escrow payments, and RC transfer support."
4. **States:** a 404 page if the car isn't found, and placeholders for missing photos or data.

### C3. Compare cars `/compare` 🟡

- **Header:** "SIDE-BY-SIDE" / "Vehicle Comparison".
- **Car header row:** "Comparing 2 Models", then each car's image, name and price (Porsche Taycan vs BMW M3 Comp.).
- **POWERTRAIN & PERFORMANCE rows:** Engine type (with Electric or Gasoline pill) · Horsepower (with "WINNER" tag) · 0–100 km/h (with "FASTER ACCEL" tag).
- **EFFICIENCY & RANGE rows:** Range / Fuel · DrivioCars Score (⭐ x/10).
- **Buttons:** 2 × "Book Test Drive".
- **"Other Rivals to Consider":** 3 cards, each with a photo, name, price and spec.
- **Missing:** a way to add, remove or choose cars.

---

## D. Car services

### D1. Finance / EMI calculator `/finance` 🟢 (the calculator works; offers are demo)

1. **Hero:** "TAILORED FINANCING" / "Your Next Ride, *Perfectly Financed*." plus one paragraph.
2. **Calculator** (3 input cards):
   - Loan Amount (slider)
   - Tenure: 12 / 24 / 36 / 48 / 60 months
   - Interest Rate (slider, % p.a.)
3. **Result panel (blue):**
   - "ESTIMATED MONTHLY EMI", with a big ₹ figure and a disclaimer
   - Buttons: **Apply Now** ⚪ and **Check Eligibility** ⚪
4. **Payment Breakdown:** Principal · Total Interest · **Total Payable**.
5. **Partner Bank Offers:** 3 bank cards, each with a name, rate and 3 ticked features. "Select Offer" fills in that bank's rate; the chosen card is highlighted and its button reads "Selected".
6. **Info panel:**
   - "Everything you need to know about Financing." with 2 points: Pre-Approval and Trade-In Credit
   - "Download Finance Guide" button

### D2. Insurance `/insurance` 🟡

- **Header:** "Car Insurance" / "Compare cover options, renewal pricing, and add-on protections…"
- **"INSTANT RENEWAL CHECK" form:**
  - Registration Number*
  - Policy expiry date*
  - Cover type: Third-party / Comprehensive / Zero dep
  - **Get Quotes** button (shows "Fetching..." while loading)
  - Error: "Registration number and policy expiry are required."
- **3 plan cards:**
  - Before submitting: plan types (Third-Party, Comprehensive, Zero Dep)
  - After submitting: quotes, each with insurer, cover, ₹ premium, IDV and add-ons
- **Next-action panel:** a recommended plan, plus buttons **Check Challans First** and **Run Car Check**.
- **"Talk to Support"** button.

### D3. Traffic challan check `/challan` 🟡

- **Header:** "Traffic Challan" / "Check pending challans…"
- **"QUICK CHECK" form:**
  - Registration Number*
  - Engine / Chassis Number*
  - **Check Challan Status** button
  - Error message if fields are empty
- **3 result tiles:** VEHICLE (reg no. and time checked) · PENDING CHALLANS (count) · TOTAL DUE (₹).
- **Status banner:**
  - Amber: "Action Required", or green: "No Pending Challans"
  - Buttons: Continue to Insurance and Run Car Check
- **Remove before launch:** a developer note ("What's next in v2…") that shows on the page.

### D4. Car valuation result `/valuation` 🟡 (no input form on this page)

1. **Status pill:** "✓ VALUATION COMPLETE".
2. **Value hero:**
   - "Your car is worth", then a big price range
   - "Based on 1,420 similar transactions… valid for 7 days"
   - Buttons: **Get Instant Offer →** and **List in Auction**
3. **Photo banner:** "YOUR CAR", with the car name.
4. **Valuation Breakdown** (3 cards, each with an icon, text and a ± amount impact): Market Demand · Car Condition · Mileage Impact.
5. **"Why trust DrivioCars?"** (3 points): Direct Market Integration · No-Obligation Offers · Price Protection.
6. **Inspection prompt:** "Want a more precise figure?", with a "Book Professional Inspection" button.

### D5. Vehicle history (RC / VIN check) `/history/[vin]` 🟢

1. **Search panel:**
   - "Vehicle History Check" / "Run a VIN check before you buy or sell…"
   - VIN input ("Enter 17-character VIN") and a **Check VIN** button
2. **States:**
   - Loading
   - "Report unavailable", with Retry and Contact Support
   - "No timeline records yet", with Check Insurance and Check Challans
3. **Report:**
   - Status pill: "CLEAN TITLE SIGNAL" (green) or "ATTENTION NEEDED" (amber)
   - Car name and VIN
   - **4 stat tiles:** Total Events · Accidents · Latest Odometer · Verified Entries
   - **TRUST NOTES:** the sources checked, the date, and whether there are open recalls
   - **Timeline "Chronological Events"**: each event shows type, title, description, a VERIFIED tag and other tags, date, odometer and location

### D6. Inspection summary `/inspection/[id]` 🟡

1. **Tags:** "LUXURY SEDAN", "✓ VERIFIED PRE-PURCHASE", and the inspector ID.
2. **Title:** car name, and "150-point inspection by our master technicians…"
3. **2 tiles:** GRADE (EXCEPTIONAL) and INSPECTOR (name).
4. **Category cards:**
   - Powertrain & Battery: "42/42 PASSED", with ticked rows
   - Overall Summary: a big "A+" and a paragraph
   - Body & Exterior: rows, plus an amber "⚠ Minor Flag" box
   - Electronics & Interior: ticked rows
5. **"The Full 150-Point Audit"** (dark section): expandable categories. Each item has a status: PASSED (green), or FAIR / REPLACED (amber).
6. **"Documented Wear":** 2 photo cards, each with a title, note and reference ID.

### D7. Full inspection report `/inspection/report/[id]` 🟡

1. **Tags:** "CERTIFIED PRE-OWNED" and "Report #…".
2. **Title:** car name, with "year • miles • owners".
3. **Score card:** "DRIVIOCARS INSPECTION SCORE", an EXCEPTIONAL pill, "9.4 /10", and "Top 3% of inspected vehicles…"
4. **3 category tiles:** Mechanical & Engine · Exterior & Body · Interior & Features, each with a rating.
5. **Technical Vital Signs:** battery health (with progress bar) · brake pad life % · tyre tread depth.
6. **Inspection Highlights:** 2 captioned photos (one with a "MINOR WEAR" badge) and "View all 42 photos".
7. **Detailed 150-Point Audit:** 3 rows, each with a status (42/42 PASSED, 35/35 PASSED, Minor Flag).
8. **Inspector signature:** avatar, name ✓, role, number of inspections, a quote, a digital signature and the audit date.
9. **Fixed bottom purchase bar:** "PURCHASE PRICE" ₹, "7-Day Return Policy", and buttons **Inquire** and **Book Test Drive**.

---

## E. Sell

### E1. Sell hub `/sell` 🟢

1. **Hero:**
   - "Digital Concierge Service" / "Sell your car in 3 *simple steps*. Fast, fair, and free."
   - Social-proof line: "★ Recent: Sold Honda Civic… 2 days"
2. **Valuation form card** (2 columns):
   - Brand* (dropdown)
   - Model* (text)
   - Year* (number, 1980 to this year)
   - Mileage* (text)
   - **Start Your Valuation** button (shows "Processing..." while loading)
   - Helper text: "…No obligations."
   - **Errors:**
     - A message under each field (e.g. "Please select a brand")
     - "Please log in to get your valuation." (the user must be logged in, but no login link is shown)
     - A general error
3. **Dark banner:** "Looking to sell spare parts?", with a **List a Part Now** button.
4. **Photo banner:** "★ Trusted by 50k+ Sellers".
5. **How it works** (3 numbered steps): 01 Enter details · 02 Get Instant Valuation · 03 Schedule & Get Paid.
6. **3 trust cards:** Highest Price Guaranteed · Instant Payment · Free Home Inspection.
7. **FAQ "Your questions, answered":** 3 questions ⚪ (they don't expand and have no answers yet).

### E2. Valuation result `/sell/details?valuationId=` 🟢

- **Header:** "STEP 2 OF 3" / "Your Instant Valuation".
- **States:**
  - Loading: "Fetching your valuation..."
  - Error card, with a "Start Valuation Again" button. Errors: not found, please log in, or couldn't load.
- **Price card:**
  - Car title
  - **Price range**, with the market average and "Valid through {date}"
- **"Why this price":**
  - A paragraph and a "Confidence: NN/100" line
  - Factor cards, each with a label, a ± amount (blue when it raises the price, red when it lowers it) and a description
- **"Actionable Next Step"** card, with buttons **Book Inspection** and **List in Auction**.
- Prices here show in **$ instead of ₹**, which needs fixing.

### E3. List a part (4-step wizard) `/sell/part` 🟢

- **Header:**
  - "← Back to Selling Hub"
  - "Marketplace Listing" pill
  - "Turn your spare parts into cash." / "…simple 4-step wizard…"
- **Progress bar:** 1. Details → 2. Photos → 3. Pricing → 4. Review.
- **Step 1, Details:**
  - Part Name* ("e.g. Porsche 911 GT3 Carbon Ceramic Brake Rotor")
  - Category (dropdown)
  - Condition: Brand New / Like New–Open Box / Used–Salvaged / Refurbished
  - Description (textarea)
  - "Genuine OEM Part" checkbox card
- **Step 2, Photos:**
  - Drag & drop area: "Upload High-Quality Images… at least 3 photos"
  - Thumbnail grid; the first image is labelled "Cover", and each has a × to remove it
- **Step 3, Pricing:**
  - Big ₹ price input, with "Drivio takes a 5% commission"
  - Quantity and Manufacturer SKU
  - "Shipping Protocol" info card
- **Step 4, Review:**
  - "Ready to Publish" summary card: cover image, OEM badge, name, price, condition, stock and SKU
  - Amber terms warning
- **Footer buttons:**
  - ← Back
  - Continue →
  - **Publish Listing** on the last step (shows "Publishing..." while loading)
  - An error toast if publishing fails

---

## F. Parts marketplace

### F1. Parts landing `/parts` 🟢

1. **Dark hero:**
   - "The Marketplace" / "Precision / Automotive / Parts."
   - Buttons: **Explore Parts** and **Become a Seller**
2. **"Select Your Car" widget** (overlaps the hero):
   - Make (dropdown)
   - Model (text)
   - Year (dropdown, last 25 years)
   - **Find Parts** button
3. **Browse Categories:** square tiles (2, 4 or 6 per row), each with an icon and name. Empty state: "No categories available."
4. **Dark promo:** "Guaranteed Fitment. Zero Guesswork." / "30-day perfect-fit money-back guarantee", with **Start Shopping**.
5. **Trending Components:** "Hot Deals", "View All Parts", and up to 8 **part cards** (see section J).
6. **Popular Fitments:** brand chips (Porsche, BMW, Mercedes-Benz, Audi, Aston Martin, Ferrari).

### F2. Alternate parts home `/parts/home` 🟢 (duplicate of F1; decide whether to keep it)

1. **Hero:** "Premium Genuine Parts" / "Precision Engineering *At Your Fingertips*".
2. **Vehicle selector** ⚪: brand/model and year, with **Find Parts**.
3. **Strip:** "15,000+ Parts Ready for Dispatch".
4. **Shop by Category:** full-width image banners.
5. **3 trust badges:** Verified Sellers · Express Delivery · Easy Returns.
6. **Featured Performance Parts:** compact cards with an add-to-cart icon.
7. **Blue banner:** "Need help finding the right part?", with **Chat with Expert** ⚪.

### F3. Parts directory `/parts/list` 🟢

1. **Sticky filter bar:**
   - "Parts Directory", with a count
   - **Sort:** Relevance · Newest · Price Low→High · Price High→Low
   - Filters and Clear buttons
2. **Filter panel "Refine Parts":**
   - Keyword or Part #
   - Category
   - Min ₹ and Max ₹
   - Condition chips: New / Used / Refurbished
   - Clear and **Apply Filters** buttons
3. **Result line:** "Showing N of M parts."
4. **Grid:** 1–3 columns of part cards.
5. **Empty state:** "No Parts Found", with a **Clear Filters** button.
6. **Missing:** pagination and chips showing which filters are active.

### F4. Part detail `/parts/[id]` 🟢

- **Breadcrumb:** Parts › Category › Part name.
- **Left column:**
  - Image gallery: a big square image with a thumbnail strip
  - 2 trust tiles: "Free Delivery / On orders over ₹250" and "30-Day Returns / Fitment Guarantee"
- **Right column:**
  - Badges: Genuine OEM and "SKU: …"
  - H1 with the part name
  - ★ rating (N reviews) and "N in stock" / "Out of stock"
  - Big ₹ price
  - **Quantity stepper**, **Add to Cart** (turns green with "✓ Added" on success) and **Buy It Now**
    - Out of stock: a single grey "Out of Stock" block
    - Logged out: goes to login
  - **Product Overview:** the description, or a fallback note
- **Reviews section** (2 tabs):
  - **Customer Reviews:**
    - Summary: big rating, stars, "Based on N reviews"
    - Review cards: avatar, name, "Verified Buyer", date, stars, text (currently dummy content)
  - **Verified Fitment:** a green guarantee card
- **Missing:** seller info, condition, and a list of compatible cars.

### F5. My parts inventory (seller) `/dashboard/parts` 🟢 (requires login)

- **Header:**
  - "← Back to Profile"
  - "Parts Inventory" / "Manage your active listings, track sales, and adjust pricing."
  - **+ List New Part** button
- **3 stat cards:** Active Listings · Total Sales (30d) ⚪ · Profile Views ⚪.
- **"Your Listings"**, with a status filter ⚪ (All / Active / Sold / Draft).
- **Each listing row:** thumbnail, "Active" badge, SKU, name, ₹ price, stock (red when 0), views, and **Edit** ⚪ / **Delete** ⚪.
- **Empty state:** "No Parts Listed Yet" / "Ready to clear out your garage?", with a "Create your first listing" link.

---

## G. Auctions & vendors

### G1. Auctions listing `/auctions` 🟢

1. **Live ticker** (dark scrolling bar): "Live: 2019 Porsche 911 (Frontal) – Current Bid: ₹42,500" and similar items ⚪.
2. **3 stat tiles:** Live Auctions · Upcoming · Total Listings.
3. **Sticky filter bar:**
   - "Damaged Car Auctions", with a count
   - **Sort:** Bid Ends Soon · Newest Listed · Highest Bid · Lowest Bid
   - Filters and Clear buttons
4. **Filter panel "Refine Auctions":**
   - Damage: All / Front-end Impact / Structural / Water
   - Location ("Zip or City")
   - Status: All / Live / Upcoming / Closed
5. **Auction grid:** 1–3 columns of **auction cards** (see section J).
6. **Empty state:** "No Active Auctions Found" / "…updated daily from our insurance partners…", with **Clear Filters**.
7. **Dark CTA band:**
   - "Ready to scale your repair business?" / "Join 12,000+ certified vendors…"
   - Buttons: **Register as Vendor** and **Request Inspection Guide**

### G2. Auction detail & bidding `/auctions/[id]` 🟢 (live updates)

1. **Hero photo:** "Lot #N", the car name, and a glass box showing the **Current Bid** (or Starting Bid).
2. **Status tags:** "● LIVE" (red, pulsing), UPCOMING or CLOSED, plus "LOT #N".
3. **Meta row:** yard · damage severity and type (red) · mileage · location.
4. **4 spec tiles:** Year · Fuel · Transmission · Watchers.
5. **Countdown card:** "Time Remaining" or "Time Until Start", counting down live as HH:MM:SS, then "Ended".
6. **Damage Assessment:** Primary Damage · Severity · Reserve (Met / Not Met).
7. **2 tiles:** Estimated Repair Cost ₹ and Activity (N views).
8. **Bid History (N):**
   - Scrolling list; each row has an avatar, bidder, time, amount and a "Proxy" or "Direct" tag
   - New bids appear at the top in real time
   - Empty state: "No bids yet."
9. **Place Bid card:**
   - "Current High Bid" (big) and "Minimum increment: ₹N"
   - "Enable Proxy Maximum Bid" checkbox
   - ₹ amount input
   - **Place Bid** button (reads **Set Proxy Limit** when the checkbox is on)
   - Trust lines: "Binding Legal Agreement" and "Pickup required within 3 days post-win"
   - When the auction isn't live: "Auction Closed" / "This auction is no longer accepting bids."
10. **Toasts:** "Bid placed successfully!" · "Please log in to place a bid." (then goes to login) · an error message.

### G3. Live control room (seller view) `/auctions/live` 🟡 ⚪

1. **Header:**
   - Red pulsing "Live Control Room" and the auction ID
   - Car name and location / engine / colour
2. **Countdown:** "Time Remaining 04:12:09", with **Accept Current Bid** and **Extend +2m**.
3. **Hero photo with 4 glass stats:** Current Bid · Reserve (MET) · Views · Watchers.
4. **Incoming Bids:** "Real-time update active". Each row has an avatar, name, city · time ago, amount and a tag (NEW LEADER / OUTBID).
5. **Session Performance:** Engagement Velocity · Bid Frequency · Active Bidders · Average Increment.
6. **Top Bidders:** ranked 1–4 by name, type (Verified Collector, Top Dealer…) and amount. Button: "View Full Bidder Analytics".
7. **Vendor Tip card:** "Extending the clock by 2 minutes often yields a 3-5% increase…"

### G4. Vendor registration (3 steps) `/vendor/register` ⚪

- **Step indicator:** Business Info → Documents → Review.
- **Step 1, "Company Foundation":**
  - Fields: Legal Entity Name · GST/Tax ID · Primary Contact Person · Business Email · Contact Phone
  - A "Documentation Readiness" info box
  - **Continue to Documents →** button
- **Step 2, "Upload Documents":**
  - Drop zone: "PDF, JPG, PNG up to 10MB"
  - **Back** and **Review Application →** buttons
- **Step 3, Success:**
  - "Application Submitted!" / "…you will hear from our partnership team within 24-48 hours."
  - **Go to Dashboard** button
- **Always shown alongside the steps:**
  - "Elite Auction Network" card, with 3 ticked benefits
  - "Secure Verification" (ISO 27001) note

### G5. Vendor dashboard `/vendor/dashboard` 🟡 ⚪

- **Header:** "Vendor Dashboard" / "Manage your salvage inventory and monitor real-time auction performance."
- **+ List New Damaged Car** button (full width).
- **Total Earnings card:** "₹1,42,85,000", "+12.5% from last month".
- **2 stats:** Live Auctions and Sold Vehicles.
- **Bidding Activity:** a 7-day bar chart (MON–SUN).
- **Active Listings:** each row has a thumbnail, LOT #, car, damage note and status pill (Ending Soon / Active).
- **Drafts (N):** each row has a car, the missing item, and ›.
- **Recent Activity:** a timeline of new bids, payouts and draft changes.
- **"Need Help?" card:** Contact Support.

---

## H. Cart & checkout

### H1. Cart `/cart` 🟢 (requires login)

- **Header:** "Shopping Cart" / "You have N items ready for checkout."
- **Item cards:** image, type pill (part or car), name, delete 🗑, quantity stepper and line total.
- **Order Summary:**
  - Subtotal
  - Estimated Shipping ₹25
  - Taxes (8%)
  - **Total**
  - **Proceed to Checkout** 🔒 button
- **Guarantee card:** "30-Day Fitment Guarantee".
- **Empty state:** "Your cart is empty", with **Start Shopping**.

### H2. Checkout `/checkout` 🟢 (requires login and a non-empty cart)

- **Header:** "Secure Checkout" / "Finalize your premium automotive acquisition".
- **Left column:**
  1. **Shipping Address:**
     - Selectable address cards: name, Home/Office icon and address; the selected card is outlined with a ✓
     - "Add New" link
     - **Add-address form:** Full Name* · Street* · City* · State* · Zip* · Label (Home / Office / Other), with **Save Address** and Cancel
  2. **Delivery Options** (radio cards):
     - Standard: 3–5 days, Free
     - Express: 1–2 days, +₹25
  3. **Payment Method:** a mock card visual (•••• 4242), with the note "Payment processing is simulated…"
- **Right sidebar (stays in view):**
  - **Order Summary:** item list, then Subtotal, Shipping, Tax and **Total**
  - **Complete Purchase** 🔒 button
  - Trust lines: "Drivio Shield Protection" and "256-bit Secure Encrypted Checkout"
- **After purchase:** goes to the order tracking page.

### H3. Booking checkout (mockup) `/checkout/booking` 🟡 ⚪

This is where "Book Test Drive" and "Book Inspection" lead today, but it's a parts-style checkout, not a booking form. **A real booking screen needs designing**: date/slot picker, location, contact details.

- **Review Order:** product, SKU, quantity, "Remove" and price.
- **Shipping Address** cards.
- **Delivery Method:** Express or Standard.
- **Payment:**
  - Credit Card tab: card number, MM/YY and CVV
  - Digital Wallet
  - Pay in Installments (EMI, "0% INTEREST" badge)
- **Summary:** Subtotal, Shipping, Tax, and Total (INR).
- **Fixed bottom bar:** Total and **Place Order**.

### H4. Order tracking `/orders/[id]` 🟢 (requires login)

- **Header:** "Track Order" / "Order ID: # • Estimated arrival: … • Payment: …"
- **Shipping Status stepper:**
  - Steps: Order Placed → Shipped → Out for Delivery → Delivered
  - Each step has a description and timestamp
- **Map placeholder:** "Live GPS Tracking" pill, with a driver-name and tracking-number chip.
- **Order Summary:** items and totals (Shipping shows "FREE" when it costs nothing).
- **Delivery Address**.
- **"Need Help?" card:** Contact Support ⚪.
- **"Return to Profile"** link.

---

## I. Account

### I1. Login `/login` 🟢 (no site shell)

- **Dark hero** (car photo):
  - DRIVIOCARS wordmark
  - "India's Most Trusted Platform" badge
  - **"Sign In To Your Garage."** / "Manage saved cars, auctions, orders, and offers in one place."
- **Left card:**
  - Chips: 50,000+ Assured Cars · 200+ Cities · Secure Escrow · 7-Day Returns
  - "Fast Checkout" box
- **Right card (form):**
  - "Account Login / Welcome Back / Sign in to continue."
  - Email* and Password* (with a 👁 show/hide toggle)
  - "Forgot password?" link
  - **Sign In** button (shows "Signing in..." while loading)
  - "New user? Create account" link
  - Error banner for wrong credentials

### I2. Register `/register` 🟢

- **Hero:** "Car Marketplace Account" / **"Create Your Account."** / "Save your dream cars, compare deals…"
- **Form card:**
  - "Join DrivioCars / It takes less than a minute."
  - Full name*, Email*, Password* and Confirm password*
  - **Create Account** button
  - "Already registered? Sign in" link
  - Error banner
- **Info card:**
  - Stats: 50K+ Listings · 4.8★ · 200+ Cities · 7-Day Returns
  - Chips: Verified Sellers · Secure Payments · Inspection Reports · Title-Clear Inventory
  - "Buyer Protection" box

### I3. Forgot password `/forgot-password` 🟢

- One centred card: "Forgot your password?" / "Enter your email and we will send a reset link."
- Email* field and **Send Reset Link** button.
- Success banner: "If an account exists, we sent a password reset link."
- Error message.
- "Back to login" link.

### I4. Reset password `/reset-password` 🟢

- "Set a new password", with New password* and Confirm* fields.
- **Update Password** button; on success a banner shows and the page goes to login.
- Invalid-link state: "Invalid reset link", with "Request a new reset link".

### Profile shell (applies to I5–I9; no site shell)

- **Top row:** "← Go Back" on the left and **Logout** on the right.
- **Heading:** "MY ACCOUNT" / **Profile** / "Manage account details, orders, saved addresses, and preferences."
- **Tabs (pills):** Overview · Orders · Settings · Notifications · Saved Searches.

### I5. Profile overview `/profile` 🟢

1. **Account Details:** Username · Email · Phone · Role · Verification (Verified / Pending) · Member Since, with **Edit Profile**.
2. **Wallet:** ₹ completed total, Pending ₹ and order count (plus a developer footnote to remove).
3. **Address Book:** address cards, each with a label and a "Default" badge, plus a "Manage" link. Empty state: "No addresses saved yet."
4. **Order History:** up to 6 rows (#, date • items • delivery, total, status • payment), plus a "View Full Orders" link.
5. **My Garage (N):** car cards (currently image only; add name and price). Empty state: "You don't have any cars listed yet.", with "Start selling today".
6. **Recent Valuations:** car, date and ₹ range. Empty state: "You haven't requested any valuations yet.", with **Check Car Value**.
7. **Active Bids on My Auctions** (only when there are any): bidder, time and amount.

### I6. My orders `/profile/orders` 🟢

- **Status filter chips:** ALL · PLACED · CONFIRMED · SHIPPED · OUT FOR DELIVERY · DELIVERED · CANCELLED.
- **Order rows:** #, date • items • method, status • payment, total ₹, and **View**.
- **Side drawer "Order Details":** order no. and status, items, totals, shipping address, and **Open Full Tracking Page**.
- **States:** loading, "No orders found for this filter." (with Browse Cars), and an error banner.

### I7. Saved searches `/profile/saved` 🟢

- **Header:** "Search Intelligence" / "Saved Searches" / "Track demand-specific car filters and get match alerts automatically."
- **Create Tracker:** text input ("e.g. BMW M3 under 50L") and a **Save** button.
- **Active Trackers:** pill showing "N Active · M New".
- **Tracker cards:**
  - Name, "N NEW" badge and the filters used
  - **Mark Seen** button
  - 🔔 push and ✉ email alert icons
  - Delete 🗑
- **States:** loading, success and error banners, and empty ("No active saved searches yet.", with Browse Cars).

### I8. Notifications `/profile/notifications` 🟢

- **Header:** "Activity Feed" / "Notifications" / "Updates on bids, market moves, orders, and account activity.", with the unread count.
- **Tabs:** All · Bids · Market · Account · Orders, plus a "Mark all read" link.
- **Notification cards:**
  - Unread: white card, blue border, a dot and **Mark read**
  - Read: grey card
  - Each has a title, message, date and an **Open** button
- **States:** loading, empty ("No notifications in this category."), and success and error banners.

### I9. Settings `/profile/settings` 🟢

- **Profile Details form:**
  - Username*, Phone ("+91…") and Email (read-only)
  - **Save Changes** button
- **Account Snapshot** (dark card): Role · Verified · Addresses · Default Address.
- **Address Book:**
  - Cards, each with a label, name, Default badge, address, and **Edit** / **Delete**
  - **+ Add Address** button
- **Address popup (Add or Edit):**
  - Label · Full Name* · Street* · City* · State* · Postal Code* · Country (defaults to India)
  - "Set as default address" checkbox
  - Save and Cancel buttons
- **States:** loading ("Loading account center..."), plus success and error banners.

---

## J. Reusable cards & patterns to design once

| Component | Where used | Content |
|---|---|---|
| **Car card** | Home, /cars, search | 4:3 photo · ✓ ASSURED badge (+ "Top Pick") · ♡ save · "YEAR · BRAND" · model + variant · pills (km, fuel, transmission) · ₹ price · "EMI ₹XK/mo" · arrow |
| **Part card** | /parts, /parts/list, /parts/home, search | photo · Genuine OEM badge · In Stock / Sold Out badge · category · ★ rating · name (2 lines) · N reviews · ₹ price · "View Part" |
| **Auction card** | /auctions | photo · damage badge (red if major) · LIVE NOW / end date · title · Lot no. · Current / Starting Bid · 4 tiles (Status, Bids, Mileage, Location) · "View Auction" |
| **Filter bar + filter panel** | /cars, /parts/list, /auctions | sticky title + count · Sort dropdown · Filters (count badge) · Clear · panel is a bottom sheet on mobile and a centred popup on desktop, with Clear / Apply |
| **Empty state** | everywhere | icon · title · one line · action button |
| **Stat tile** | home, auctions, dashboards, history | icon · number · label |
| **Status badges** | orders, auctions, notifications | order: placed / confirmed / shipped / out for delivery / delivered / cancelled · auction: live / upcoming / closed · reserve: met / not met |
| **Stepper / wizard** | sell part (4), vendor register (3), order tracking (4) | numbered steps + progress |
| **Address card + form** | checkout, settings, profile | label · name · address · default badge · edit / delete |
| **Quantity stepper** | part detail, cart | − N + |

**States every data screen needs:** loading (skeletons; today only plain "Loading…" text exists), empty, error, logged out (prompt to sign in), and success toasts.

---

## K. Things to fix or decide in the redesign

1. **Logged-in state is missing from the shell.** The navbar never shows the user, the cart never shows a count, and the drawer always says "Sign In". Design both signed-out and signed-in versions of the header.
2. **Pages that need real design, not just a restyle:**
   - A **test-drive / inspection booking** flow (date, time slot, location)
   - A **valuation input** for `/valuation`
   - **Choosing cars** on `/compare`
   - The **vendor inspection guide** page (linked, but missing)
   - The **About, Privacy, Terms and Careers** pages
3. **Duplicates to merge:**
   - `/parts` and `/parts/home`
   - Two seller dashboards (`/dashboard/parts` for parts, `/vendor/dashboard` for auctions)
   - Three different part-card designs
   - Two car-card designs
4. **Currency and units:** use ₹ with Indian number grouping everywhere (`/sell/details` shows $), km everywhere (the valuation and inspection pages use miles), Indian phone and address formats (vendor form and checkout use US examples), and a default country of India.
5. **Copy that disagrees between pages:**
   - "250-point" vs "150-point" inspection
   - "Assured" vs "Certified Guarantee"
   - "All India" vs "All Cities"
   - "10 Lakh+" vs "10L+"
6. **Developer text showing to users:** the challan "What's next in v2" note and the wallet footnote.
7. **Mobile:**
   - The heart (save) button only appears on hover, so touch users never see it
   - `/compare` keeps 3 columns on phones
   - The homepage stats section repeats the footer's stats strip
8. **Many buttons don't work yet (⚪).** Designs should still cover their next screen:
   - Chat with Seller and Contact Seller
   - Apply Now and Check Eligibility
   - Help chat and tickets
   - FAQ answers
   - Edit and Delete on listings

## Required frontend and animation architecture

Use this recommended combination:

* **Lenis** for global smooth scrolling
* **Motion** for normal React component animations
* **GSAP ScrollTrigger** only for advanced scroll-linked sequences
* **shadcn/ui** only for accessible interactive primitives
* **Existing Tailwind/CSS design system** for the actual visual appearance

Do not use Webflow-generated code.

Do not use GSAP ScrollSmoother because Lenis is responsible for smooth scrolling. Lenis and ScrollSmoother must never be initialized together.

### Technology responsibility map

| Requirement                                             | Technology                                         |
| ------------------------------------------------------- | -------------------------------------------------- |
| Smooth mouse-wheel scrolling                            | Lenis                                              |
| Section entrance animations                             | Motion                                             |
| Card stagger animations                                 | Motion                                             |
| Button hover and tap feedback                           | Motion                                             |
| Tabs and filter transitions                             | Motion                                             |
| Favourite and comparison animations                     | Motion                                             |
| Dialog, drawer and mobile-menu transitions              | Motion                                             |
| Hero image parallax                                     | GSAP ScrollTrigger                                 |
| Hero floating information cards                         | GSAP ScrollTrigger                                 |
| Hero headline entrance timeline                         | GSAP ScrollTrigger                                 |
| Auction-section sequence                                | GSAP ScrollTrigger                                 |
| Subtle background scroll movement                       | GSAP ScrollTrigger                                 |
| Tabs, Select, Slider, Sheet and Dialog behavior         | shadcn/ui                                          |
| Colors, layout, typography and exact screenshot styling | Tailwind CSS and existing project styles           |
| Icons                                                   | Existing Material Symbols or existing Lucide setup |

Do not use GSAP for ordinary buttons, cards, dropdowns, tabs, hover effects, or simple section reveals. Motion should handle those interactions.

Do not use Motion and GSAP to animate the same CSS property on the same element. If a component needs both systems, use separate wrapper elements:

* Outer wrapper: GSAP scroll-linked animation
* Inner element: Motion hover or interaction animation

This prevents transform conflicts.

## 1. Lenis — global smooth scrolling

Use the current `lenis` package and its React integration.

Create one reusable client component such as:

* `SmoothScrollProvider`
* `LenisProvider`

Use Lenis only for the scrolling experience. Do not use Lenis to create card or section animations.

Scope Lenis to the public website layout or homepage. Do not apply it automatically to login, registration, profile, dashboard, checkout, or other application-style screens unless those pages are tested and confirmed compatible.

Lenis responsibilities:

* Smooth mouse-wheel scrolling
* Smooth trackpad scrolling
* Smooth anchor navigation
* Scroll-to-section behavior
* Synchronization with ScrollTrigger
* Correct scroll restoration after route changes

Lenis must not interfere with:

* Sticky navigation
* Dialogs
* Dropdowns
* Mobile drawers
* Form fields
* Keyboard navigation
* Browser history
* Native touch scrolling
* Route transitions

### Lenis configuration

Use a restrained configuration. Scrolling should feel smooth and premium, but still responsive.

Recommended behavior:

* Enable smooth wheel scrolling on desktop.
* Keep touch scrolling native or use very limited smoothing.
* Avoid a long or delayed scrolling feeling.
* Preserve normal scrollbar behavior.
* Do not create a fake scrollbar.
* Do not add CSS `scroll-behavior: smooth` when Lenis is active.
* Destroy the Lenis instance during cleanup.

If GSAP ScrollTrigger is enabled, use one coordinated animation loop. Do not create duplicate `requestAnimationFrame` loops.

Use the equivalent of:

```ts
lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
```

If this manual GSAP ticker integration is used, disable Lenis `autoRaf`.

Remove the GSAP ticker callback and Lenis event listeners during cleanup.

Follow the installed Lenis version’s API if its configuration differs.

## 2. Motion — primary React animation system

Use Motion from:

```ts
import { motion } from "motion/react";
```

Motion should handle most animations across the homepage.

Use Motion for:

* Fade-up section reveals
* Staggered card entrances
* Button hover states
* Button tap feedback
* Card hover elevation
* Vehicle-image hover scale
* Search-tab indicator movement
* Active filter-chip transitions
* Favourite-button feedback
* Comparison-tray additions and removals
* Layout changes
* Dropdown content transitions
* Mobile navigation transitions
* Dialog and drawer content transitions
* Form success and error messages
* Testimonial transitions
* Statistics reveal or count-up behavior

### Standard section reveal

Create a reusable component such as `Reveal` with approximately:

* Initial opacity: `0`
* Initial vertical position: `24px`
* Final opacity: `1`
* Final vertical position: `0`
* Duration: `0.45–0.65s`
* Ease: smooth ease-out
* Viewport margin: trigger slightly before the content reaches the centre
* Run once by default

Do not create a separate Intersection Observer for every small element if a parent stagger animation can handle the group.

### Standard card stagger

Create a reusable component such as `StaggerGroup`.

Recommended behavior:

* Parent controls the viewport trigger.
* Children reveal with `0.06–0.1s` stagger.
* Use opacity and transform only.
* Do not repeatedly replay the animation during minor scrolling.

### Hover behavior

Keep hover effects subtle:

* Card vertical movement: approximately `-4px`
* Image scale: approximately `1.02–1.04`
* Button scale: approximately `1.01–1.02`
* Shadow increase: subtle
* Duration: approximately `0.2–0.3s`

Do not apply large zoom, rotation, bounce, or elastic movement to standard marketplace components.

### Motion layout animations

Use Motion layout animations for:

* Comparison-tray vehicle additions
* Comparison-tray removal
* Filter-chip selection
* Search-tab indicator
* Expandable content
* Responsive card reordering

Preserve component accessibility and DOM order.

## 3. GSAP ScrollTrigger — advanced scroll animation only

Use GSAP and ScrollTrigger selectively.

Create GSAP animations only inside dedicated client components and scope them using `useGSAP()` or `gsap.context()`.

Use ScrollTrigger for these sections:

### Hero section

Use GSAP for:

* Hero headline reveal timeline
* Blue SUV parallax
* Floating inspection, price, and EMI cards
* Very subtle background movement

Suggested behavior:

* Headline and copy reveal once during initial page load.
* SUV moves only a small distance as the user scrolls.
* Floating information cards use slightly different scroll speeds.
* Text must remain readable throughout.
* Do not create an infinite floating loop.
* Do not pin the entire hero unless the reference design truly requires it.

### Auction section

Use GSAP for:

* Dark auction background entrance
* Gavel entrance with restrained rotation
* Countdown-container reveal
* Main auction-card reveal
* Upcoming-card stagger
* Subtle diagonal-background movement

Do not connect the actual countdown logic to the GSAP timeline. The countdown must continue to use real application state and accurate time calculations.

### Parts and Service Hub

GSAP may be used for a very subtle background or image parallax effect.

Use Motion—not GSAP—for individual parts-card hover states.

### GSAP restrictions

* Do not use GSAP for every homepage section.
* Do not create one ScrollTrigger per small text label.
* Do not use aggressive pinning.
* Do not animate layout properties such as width, height, top or left.
* Prefer `transform` and `opacity`.
* Refresh ScrollTrigger after responsive layout or image changes.
* Kill all triggers during component cleanup.
* Confirm triggers do not duplicate during React development mode.
* Confirm sticky navigation still works.
* Confirm mobile performance remains smooth.

## 4. Reduced-motion support

Respect `prefers-reduced-motion`.

When reduced motion is enabled:

* Disable Lenis smoothing.
* Disable GSAP parallax.
* Disable large positional animations.
* Disable animated counters where appropriate.
* Remove stagger delays.
* Show content immediately.
* Preserve all interactions and functionality.
* Do not hide content behind an animation state.

Create a reusable reduced-motion check and apply it consistently across Lenis, Motion, and GSAP.

## 5. shadcn/ui — accessible behavior only

Use shadcn/ui only when the project does not already have an equivalent reusable component.

Do not replace working project components unnecessarily.

Use shadcn/ui for:

| Homepage feature              | shadcn/ui component                                         |
| ----------------------------- | ----------------------------------------------------------- |
| Mobile navigation             | `Sheet`                                                     |
| Vehicle search modes          | `Tabs`                                                      |
| Brand, model, budget and city | `Select` or `Combobox`                                      |
| Body type and fuel filters    | `Select`                                                    |
| EMI amount and tenure         | `Slider` and `Select`                                       |
| Filters on tablet/mobile      | `Drawer`                                                    |
| Desktop modal interactions    | `Dialog`                                                    |
| Icon-only button labels       | `Tooltip`                                                   |
| Loading placeholders          | `Skeleton`                                                  |
| Toast notifications           | Existing toast system first; shadcn `Sonner` only if needed |
| Accessible forms              | Existing form system or shadcn form primitives              |
| Confirmation actions          | `AlertDialog`                                               |

Customize all shadcn components to match the DrivioCars design.

Do not leave default shadcn appearance unchanged.

Customize:

* Primary blue
* Dark navy
* Trust green
* Auction amber
* Typography
* Heights
* Padding
* Borders
* Border radiuses
* Focus rings
* Hover states
* Shadows
* Disabled states
* Loading states

The final UI must look like the five screenshots, not like a default shadcn dashboard.

### shadcn installation rules

* First check whether shadcn/ui is already configured.
* Reuse the existing `components.json`.
* Do not run `shadcn init` again if configuration already exists.
* Add only the components required for this homepage.
* Do not install the complete shadcn component collection.
* Preserve the project’s existing import aliases.
* Do not replace existing working components without a clear reason.

## 6. Icons

Use one consistent icon family.

Priority:

1. Reuse Material Symbols Outlined because it is already part of the existing DrivioCars design system.
2. If the project has already migrated to Lucide, use Lucide consistently.
3. Do not mix Material Symbols, Lucide, Heroicons, and other icon libraries on the same homepage.
4. Do not use emojis as icons.

Icons should use consistent:

* Stroke weight
* Size
* Container shape
* Alignment
* Color
* Hover behavior

## 7. Do not use Webflow code

Do not copy or export Webflow-generated HTML, JavaScript, or CSS into this project.

Webflow may be used only as visual inspiration.

The existing project already has:

* Next.js routing
* React components
* Backend integrations
* Authentication
* API services
* Application state
* Responsive layouts

Implement the reference design natively using:

* Next.js
* React
* TypeScript
* Tailwind CSS or the existing styling system
* Existing reusable components
* shadcn/ui primitives where necessary
* Motion
* Lenis
* Selective GSAP ScrollTrigger

## Final implementation rule

Use the technologies according to these boundaries:

* **Lenis controls scrolling**
* **Motion controls React UI animations**
* **GSAP ScrollTrigger controls advanced scroll-linked visual sequences**
* **shadcn/ui provides accessible component behavior**
* **Tailwind and the existing design system control the visual appearance**
* **Existing APIs and application state control the data**
* **Next.js controls routing, rendering, and image optimization**

Do not allow two libraries to control the same responsibility.
