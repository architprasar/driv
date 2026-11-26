# DrivioCars — Phase-Wise Django REST API Implementation Plan

> Full-stack backend for the DrivioCars automotive marketplace using **Django 5 + Django REST Framework + PostgreSQL + Redis + Celery + Channels**.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend (27 Screens)                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  REST + WebSocket
┌────────────────────────────────▼─────────────────────────────────────┐
│                    Django REST Framework API                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth &   │ │  Cars &  │ │ Auctions │ │  Parts & │ │ Vendor & │  │
│  │  Users    │ │ Listings │ │ & Bids   │ │  Orders  │ │  Reports │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │  Payments│ │  Notifs  │ │  Help &  │                            │
│  │  & Cart  │ │ & Alerts │ │  Support │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
├──────────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis (Cache + WS)  │  Celery (Async)  │  S3/Media │
└──────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Django 5.x + DRF 3.15 |
| Database | PostgreSQL 16 |
| Cache / Broker | Redis 7 |
| Async Tasks | Celery 5 + django-celery-beat |
| Real-time | Django Channels (WebSocket for live auctions) |
| Auth | `djangorestframework-simplejwt` (JWT) + Social Auth |
| File Storage | django-storages + AWS S3 (or local in dev) |
| API Docs | drf-spectacular (OpenAPI 3.1) |
| Search | django-filter + PostgreSQL full-text search |
| Payments | Stripe SDK / Razorpay |
| Email | django-anymail (SendGrid / Mailgun) |
| Containerization | Docker + docker-compose |

### Django Project Structure

```
drivio_backend/
├── manage.py
├── config/                  # Project settings
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── asgi.py              # Channels entry
│   └── wsgi.py
├── apps/
│   ├── accounts/            # Phase 1 — Users & Auth
│   ├── cars/                # Phase 2 — Car Listings & Comparison
│   ├── auctions/            # Phase 3 — Auctions & Live Bidding
│   ├── parts/               # Phase 4 — Parts Marketplace
│   ├── cart/                # Phase 5 — Cart & Checkout
│   ├── orders/              # Phase 5 — Orders & Tracking
│   ├── payments/            # Phase 5 — Payment Processing
│   ├── vendors/             # Phase 6 — Vendor Management
│   ├── inspections/         # Phase 7 — Inspection Reports
│   ├── valuations/          # Phase 7 — Car Valuations
│   ├── notifications/       # Phase 8 — Notifications & Alerts
│   ├── search/              # Phase 8 — Saved Searches
│   ├── support/             # Phase 9 — Help & Support
│   └── core/                # Shared utils, permissions, mixins
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Phase 1 — Project Setup & Authentication

**Duration:** 3–4 days · **Screens served:** `/login`, User sessions across all pages

### 1.1 Project Scaffolding

```bash
django-admin startproject config .
python manage.py startapp accounts
```

- Configure split settings (`base/development/production`)
- Set up PostgreSQL, Redis, Celery, and CORS
- Install & configure `drf-spectacular` for auto API docs at `/api/docs/`
- Set up Docker + docker-compose (Django, Postgres, Redis)

### 1.2 Custom User Model — `apps/accounts/`

```python
# models.py
class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    role = models.CharField(choices=ROLE_CHOICES, default='buyer')
    # ROLE_CHOICES: buyer, seller, vendor, admin
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class UserAddress(models.Model):
    user = models.ForeignKey(User, related_name='addresses')
    label = models.CharField(max_length=20)  # home, office
    full_name = models.CharField(max_length=100)
    street = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)
```

### 1.3 Auth Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| POST | `/api/auth/register/` | User registration | `/login` (Sign Up tab) |
| POST | `/api/auth/login/` | JWT token pair | `/login` (Sign In tab) |
| POST | `/api/auth/token/refresh/` | Refresh access token | All authenticated |
| POST | `/api/auth/social/google/` | Google OAuth | `/login` |
| POST | `/api/auth/social/apple/` | Apple Sign-In | `/login` |
| GET | `/api/auth/me/` | Current user profile | `/dashboard` |
| PATCH | `/api/auth/me/` | Update profile | `/dashboard` |
| POST | `/api/auth/password/reset/` | Password reset email | `/login` |
| GET | `/api/auth/addresses/` | List addresses | `/checkout/booking` |
| POST | `/api/auth/addresses/` | Create address | `/checkout/booking` |

---

## Phase 2 — Car Listings & Detail

**Duration:** 4–5 days · **Screens served:** `/`, `/cars`, `/cars/[id]`, `/compare`, `/sell`, `/sell/details`

### 2.1 Models — `apps/cars/`

```python
class CarBrand(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='brands/')

class CarModel(models.Model):
    brand = models.ForeignKey(CarBrand, related_name='models')
    name = models.CharField(max_length=100)

class Car(models.Model):
    seller = models.ForeignKey(User, related_name='cars')
    brand = models.ForeignKey(CarBrand)
    model = models.ForeignKey(CarModel)
    variant = models.CharField(max_length=100, blank=True)
    year = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    mileage = models.PositiveIntegerField()          # km or miles
    fuel_type = models.CharField(choices=FUEL_CHOICES)
    transmission = models.CharField(choices=TRANS_CHOICES)
    body_type = models.CharField(choices=BODY_CHOICES)
    color = models.CharField(max_length=50)
    engine = models.CharField(max_length=100)
    horsepower = models.PositiveIntegerField(null=True)
    drivetrain = models.CharField(max_length=20)
    vin = models.CharField(max_length=17, unique=True)
    location = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    condition = models.CharField(choices=CONDITION_CHOICES)
    status = models.CharField(choices=STATUS_CHOICES)  # active, sold, draft
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class CarImage(models.Model):
    car = models.ForeignKey(Car, related_name='images')
    image = models.ImageField(upload_to='cars/')
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

class CarFeature(models.Model):
    car = models.ForeignKey(Car, related_name='features')
    category = models.CharField(max_length=50)  # safety, comfort, tech
    name = models.CharField(max_length=100)
```

### 2.2 Car Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/cars/` | List with filters, sort, pagination | `/cars` |
| GET | `/api/cars/:id/` | Full car detail | `/cars/[id]` |
| GET | `/api/cars/featured/` | Featured/trending cars | `/` (landing) |
| GET | `/api/cars/compare/?ids=1,2` | Side-by-side comparison data | `/compare` |
| POST | `/api/cars/` | Create listing (seller) | `/sell/details` |
| PATCH | `/api/cars/:id/` | Update listing | `/sell/details` |
| DELETE | `/api/cars/:id/` | Remove listing | Dashboard |
| GET | `/api/cars/brands/` | All brands | `/sell/details`, `/cars` |
| GET | `/api/cars/brands/:id/models/` | Models for brand | `/sell/details` |
| POST | `/api/cars/:id/images/` | Upload images | `/sell` flow |

#### Filters (via `django-filter`)
```
?brand=porsche&min_price=20000&max_price=80000&fuel_type=electric
&transmission=automatic&year_min=2020&body_type=sedan&sort=-price
```

---

## Phase 3 — Auction System

**Duration:** 5–7 days · **Screens served:** `/auctions`, `/auctions/[id]`, `/auctions/live`

### 3.1 Models — `apps/auctions/`

```python
class Auction(models.Model):
    car = models.OneToOneField(Car, related_name='auction')
    vendor = models.ForeignKey(User, related_name='auctions')
    lot_number = models.CharField(max_length=20, unique=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    starting_bid = models.DecimalField(max_digits=12, decimal_places=2)
    reserve_price = models.DecimalField(max_digits=12, decimal_places=2)
    current_bid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_increment = models.DecimalField(max_digits=8, decimal_places=2, default=100)
    damage_type = models.CharField(choices=DAMAGE_CHOICES)
    damage_severity = models.CharField(choices=SEVERITY_CHOICES)
    estimated_repair_cost = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(choices=AUCTION_STATUS)  # upcoming, live, ended, sold
    views_count = models.PositiveIntegerField(default=0)
    watchers_count = models.PositiveIntegerField(default=0)

class Bid(models.Model):
    auction = models.ForeignKey(Auction, related_name='bids')
    bidder = models.ForeignKey(User, related_name='bids')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_proxy = models.BooleanField(default=False)
    proxy_max = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class AuctionWatcher(models.Model):
    auction = models.ForeignKey(Auction, related_name='watchers')
    user = models.ForeignKey(User)
```

### 3.2 WebSocket — Live Auction (Django Channels)

```python
# consumers.py
class AuctionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.auction_id = self.scope['url_route']['kwargs']['auction_id']
        self.group_name = f'auction_{self.auction_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def new_bid(self, event):
        await self.send_json(event['data'])
```

### 3.3 Auction Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/auctions/` | List auctions with filters | `/auctions` |
| GET | `/api/auctions/:id/` | Auction detail + damage report | `/auctions/[id]` |
| GET | `/api/auctions/:id/bids/` | Bid history | `/auctions/[id]` |
| POST | `/api/auctions/:id/bids/` | Place bid (validates increment) | `/auctions/[id]` |
| POST | `/api/auctions/:id/proxy-bid/` | Place proxy (auto) bid | `/auctions/[id]` |
| POST | `/api/auctions/:id/watch/` | Toggle watch status | `/auctions/[id]` |
| GET | `/api/auctions/:id/live-stats/` | Views, watchers, bid velocity | `/auctions/live` |
| POST | `/api/auctions/:id/extend/` | Extend timer (vendor) | `/auctions/live` |
| POST | `/api/auctions/:id/accept/` | Accept current bid (vendor) | `/auctions/live` |
| WS | `ws/auctions/:id/` | Real-time bid stream | `/auctions/live` |

#### Celery Tasks
- `check_auction_expiry` — periodic task to close ended auctions
- `process_proxy_bids` — auto-bid when outbid
- `send_bid_notifications` — notify watchers of new bids

---

## Phase 4 — Parts Marketplace

**Duration:** 3–4 days · **Screens served:** `/parts`, `/parts/home`

### 4.1 Models — `apps/parts/`

```python
class PartCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    image = models.ImageField(upload_to='part_categories/')
    description = models.TextField(blank=True)

class Part(models.Model):
    seller = models.ForeignKey(User, related_name='parts')
    category = models.ForeignKey(PartCategory, related_name='parts')
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    compatible_brands = models.ManyToManyField(CarBrand, blank=True)
    compatible_models = models.ManyToManyField(CarModel, blank=True)
    is_genuine = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)

class PartImage(models.Model):
    part = models.ForeignKey(Part, related_name='images')
    image = models.ImageField(upload_to='parts/')
    is_primary = models.BooleanField(default=False)
```

### 4.2 Parts Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/parts/` | List with filters & search | `/parts` |
| GET | `/api/parts/:id/` | Part detail | Part detail |
| GET | `/api/parts/categories/` | All categories with images | `/parts/home` |
| GET | `/api/parts/featured/` | Featured performance parts | `/parts/home` |
| GET | `/api/parts/compatible/?brand=X&model=Y&year=Z` | Compatible parts for vehicle | `/parts/home` |

---

## Phase 5 — Cart, Checkout & Orders

**Duration:** 5–6 days · **Screens served:** `/cart`, `/checkout`, `/checkout/booking`, `/orders/[id]`

### 5.1 Models — `apps/cart/`, `apps/orders/`, `apps/payments/`

```python
# cart/models.py
class Cart(models.Model):
    user = models.OneToOneField(User, related_name='cart')

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items')
    part = models.ForeignKey(Part, null=True)
    car = models.ForeignKey(Car, null=True)  # for car purchases
    quantity = models.PositiveIntegerField(default=1)
    item_type = models.CharField(choices=[('part','Part'),('car','Car')])

# orders/models.py
class Order(models.Model):
    user = models.ForeignKey(User, related_name='orders')
    order_number = models.CharField(max_length=20, unique=True)
    status = models.CharField(choices=ORDER_STATUS)
    # placed, confirmed, shipped, out_for_delivery, delivered, cancelled
    shipping_address = models.ForeignKey(UserAddress)
    delivery_method = models.CharField(choices=DELIVERY_CHOICES)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=8, decimal_places=2)
    tax = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    driver_name = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    estimated_delivery = models.DateField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items')
    part = models.ForeignKey(Part, null=True)
    car = models.ForeignKey(Car, null=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

class OrderTimeline(models.Model):
    order = models.ForeignKey(Order, related_name='timeline')
    status = models.CharField(max_length=30)
    title = models.CharField(max_length=100)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

# payments/models.py
class Payment(models.Model):
    order = models.OneToOneField(Order, related_name='payment')
    stripe_payment_id = models.CharField(max_length=100)
    method = models.CharField(choices=PAYMENT_METHODS)
    # card, digital_wallet, emi
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(choices=PAYMENT_STATUS)
    emi_months = models.PositiveIntegerField(null=True)
```

### 5.2 Cart & Order Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/cart/` | Get current cart + items | `/cart` |
| POST | `/api/cart/items/` | Add item to cart | `/parts`, `/cars/[id]` |
| PATCH | `/api/cart/items/:id/` | Update quantity | `/cart` |
| DELETE | `/api/cart/items/:id/` | Remove item | `/cart` |
| POST | `/api/orders/` | Create order from cart | `/checkout/booking` |
| GET | `/api/orders/` | List user's orders | `/dashboard` |
| GET | `/api/orders/:id/` | Order detail + timeline | `/orders/[id]` |
| GET | `/api/orders/:id/tracking/` | Live tracking data | `/orders/[id]` |
| POST | `/api/payments/create-intent/` | Stripe PaymentIntent | `/checkout/booking` |
| POST | `/api/payments/confirm/` | Confirm payment | `/checkout/booking` |
| GET | `/api/finance/calculate/` | EMI calculation | `/finance` |

### 5.3 Delivery & Tax Calculation

```python
# services.py
class CheckoutService:
    @staticmethod
    def calculate_shipping(method, address):
        if method == 'express': return Decimal('25.00')
        return Decimal('0.00')

    @staticmethod
    def calculate_tax(subtotal, state):
        TAX_RATES = {'CA': 0.08, 'TX': 0.0625, 'NY': 0.08}
        return subtotal * Decimal(str(TAX_RATES.get(state, 0.08)))
```

---

## Phase 6 — Vendor Management

**Duration:** 3–4 days · **Screens served:** `/vendor/register`, `/vendor/dashboard`

### 6.1 Models — `apps/vendors/`

```python
class VendorProfile(models.Model):
    user = models.OneToOneField(User, related_name='vendor_profile')
    business_name = models.CharField(max_length=200)
    tax_id = models.CharField(max_length=50)
    contact_person = models.CharField(max_length=100)
    business_email = models.EmailField()
    phone = models.CharField(max_length=20)
    business_license = models.FileField(upload_to='vendor_docs/')
    representative_id = models.FileField(upload_to='vendor_docs/')
    verification_status = models.CharField(choices=VERIFICATION_STATUS)
    # pending, under_review, verified, rejected
    tier = models.CharField(choices=TIER_CHOICES, default='standard')
    # standard, gold, platinum
    total_earnings = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class VendorPayout(models.Model):
    vendor = models.ForeignKey(VendorProfile, related_name='payouts')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(choices=PAYOUT_STATUS)
    initiated_at = models.DateTimeField(auto_now_add=True)

class VendorActivity(models.Model):
    vendor = models.ForeignKey(VendorProfile, related_name='activities')
    event_type = models.CharField(max_length=50)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.2 Vendor Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| POST | `/api/vendors/register/` | Submit registration (Step 1–3) | `/vendor/register` |
| PATCH | `/api/vendors/register/documents/` | Upload documents | `/vendor/register` |
| GET | `/api/vendors/dashboard/` | Stats, earnings, activity | `/vendor/dashboard` |
| GET | `/api/vendors/dashboard/listings/` | Active + draft listings | `/vendor/dashboard` |
| GET | `/api/vendors/dashboard/analytics/` | Bidding activity chart data | `/vendor/dashboard` |
| GET | `/api/vendors/dashboard/payouts/` | Payout history | `/vendor/dashboard` |

---

## Phase 7 — Inspections, Valuations & History

**Duration:** 4–5 days · **Screens served:** `/inspection/[id]`, `/inspection/report/[id]`, `/history/[vin]`, `/valuation`

### 7.1 Models — `apps/inspections/`, `apps/valuations/`

```python
# inspections/models.py
class Inspection(models.Model):
    car = models.ForeignKey(Car, related_name='inspections')
    inspector = models.ForeignKey(User, related_name='inspections')
    report_number = models.CharField(max_length=20, unique=True)
    overall_score = models.DecimalField(max_digits=3, decimal_places=1)  # 9.4
    grade = models.CharField(max_length=20)  # EXCEPTIONAL, GOOD, FAIR
    status = models.CharField(choices=INSPECTION_STATUS)
    inspection_date = models.DateField()
    inspector_notes = models.TextField()

class InspectionCategory(models.Model):
    inspection = models.ForeignKey(Inspection, related_name='categories')
    name = models.CharField(max_length=100)  # Powertrain, Body, Interior
    total_points = models.PositiveIntegerField()
    passed_points = models.PositiveIntegerField()
    grade = models.CharField(max_length=20)
    has_flag = models.BooleanField(default=False)
    flag_description = models.TextField(blank=True)

class InspectionCheckpoint(models.Model):
    category = models.ForeignKey(InspectionCategory, related_name='checkpoints')
    name = models.CharField(max_length=100)
    status = models.CharField(choices=CHECK_STATUS)  # passed, fair, replaced, failed
    value = models.CharField(max_length=50, blank=True)  # "98.4%", "Factory Std"

class InspectionPhoto(models.Model):
    inspection = models.ForeignKey(Inspection, related_name='photos')
    image = models.ImageField(upload_to='inspections/')
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    has_flag = models.BooleanField(default=False)

# valuations/models.py
class Valuation(models.Model):
    user = models.ForeignKey(User, related_name='valuations')
    car = models.ForeignKey(Car, null=True, related_name='valuations')
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField()
    condition = models.CharField(max_length=20)
    min_value = models.DecimalField(max_digits=12, decimal_places=2)
    max_value = models.DecimalField(max_digits=12, decimal_places=2)
    similar_transactions = models.PositiveIntegerField()
    demand_premium = models.DecimalField(max_digits=8, decimal_places=2)
    mileage_adjustment = models.DecimalField(max_digits=8, decimal_places=2)
    valid_until = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

# Vehicle History (can be in cars/ or standalone)
class VehicleHistoryEvent(models.Model):
    car = models.ForeignKey(Car, related_name='history_events')
    event_type = models.CharField(choices=EVENT_TYPES)
    # registration, maintenance, accident, recall, factory_ship
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateField()
    odometer = models.PositiveIntegerField()
    location = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list)
    verified = models.BooleanField(default=False)
```

### 7.2 Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/inspections/:id/` | Full 150-point inspection detail | `/inspection/[id]` |
| GET | `/api/inspections/:id/report/` | CPO-style formatted report | `/inspection/report/[id]` |
| POST | `/api/inspections/book/` | Book an inspection | `/inspection/report/[id]` |
| GET | `/api/history/:vin/` | Full vehicle history timeline | `/history/[vin]` |
| GET | `/api/history/:vin/pdf/` | Download PDF report | `/history/[vin]` |
| POST | `/api/valuations/` | Request valuation | `/sell`, `/sell/details` |
| GET | `/api/valuations/:id/` | Valuation result + breakdown | `/valuation` |

---

## Phase 8 — Notifications, Saved Searches & Dashboard

**Duration:** 4–5 days · **Screens served:** `/notifications`, `/saved`, `/dashboard`

### 8.1 Models — `apps/notifications/`, `apps/search/`

```python
# notifications/models.py
class Notification(models.Model):
    user = models.ForeignKey(User, related_name='notifications')
    category = models.CharField(choices=NOTIF_CATEGORIES)
    # bids, market, account, orders
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# search/models.py
class SavedSearch(models.Model):
    user = models.ForeignKey(User, related_name='saved_searches')
    name = models.CharField(max_length=100)
    filters = models.JSONField()  # {brand, price_range, fuel, etc.}
    notify_push = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=True)
    new_matches_count = models.PositiveIntegerField(default=0)
    last_checked = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 8.2 Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/notifications/` | Paginated with category filter | `/notifications` |
| PATCH | `/api/notifications/:id/read/` | Mark as read | `/notifications` |
| POST | `/api/notifications/read-all/` | Mark all read | `/notifications` |
| GET | `/api/saved-searches/` | List saved searches | `/saved` |
| POST | `/api/saved-searches/` | Create search tracker | `/saved` |
| PATCH | `/api/saved-searches/:id/` | Update filters / alerts | `/saved` |
| DELETE | `/api/saved-searches/:id/` | Remove search | `/saved` |
| GET | `/api/dashboard/` | Aggregated user dashboard data | `/dashboard` |
| GET | `/api/dashboard/garage/` | User's cars | `/dashboard` |
| GET | `/api/dashboard/active-bids/` | User's active bids | `/dashboard` |

#### Celery Tasks
- `check_saved_searches` — Periodic: match new listings to saved filters, increment `new_matches_count`, push notifications
- `send_push_notification` — Firebase Cloud Messaging integration
- `send_email_notification` — Via django-anymail

---

## Phase 9 — Help & Support + Polish

**Duration:** 2–3 days · **Screens served:** `/help`, landing page (`/`)

### 9.1 Models — `apps/support/`

```python
class HelpCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50)
    article_count = models.PositiveIntegerField(default=0)

class HelpArticle(models.Model):
    category = models.ForeignKey(HelpCategory, related_name='articles')
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_faq = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)

class SupportTicket(models.Model):
    user = models.ForeignKey(User, related_name='tickets')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(choices=TICKET_STATUS)
    priority = models.CharField(choices=PRIORITY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

class Testimonial(models.Model):
    user_name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to='testimonials/', blank=True)
    text = models.TextField()
    rating = models.PositiveIntegerField()
    is_featured = models.BooleanField(default=False)
```

### 9.2 Endpoints

| Method | Endpoint | Purpose | Screen |
|---|---|---|---|
| GET | `/api/support/categories/` | Help categories | `/help` |
| GET | `/api/support/articles/` | Search articles | `/help` |
| GET | `/api/support/articles/:id/` | Article detail | `/help` |
| POST | `/api/support/tickets/` | Create support ticket | `/help` |
| GET | `/api/testimonials/` | Landing page testimonials | `/` |

---

## Phase 10 — Integration, Testing & Deployment

**Duration:** 5–7 days

### 10.1 Next.js Frontend Integration

```typescript
// lib/api.ts — API client configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Key integration points:**
- Replace all hardcoded data in pages with `useEffect` / React Query / SWR hooks
- Implement auth context provider (JWT token management)
- WebSocket client for `/auctions/live` page
- Form submissions for sell, checkout, vendor registration
- Image upload via multipart/form-data

### 10.2 Testing

| Type | Tool | Coverage Target |
|---|---|---|
| Unit Tests | `pytest` + `factory_boy` | Models, serializers, services |
| API Tests | DRF `APITestCase` | All endpoints, permissions, edge cases |
| Integration | `pytest` + test DB | Cart → Checkout → Order flow |
| Load Testing | `locust` | Auction bidding under concurrency |

### 10.3 Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              Production Stack               │
├─────────────────────────────────────────────┤
│  Vercel          → Next.js Frontend         │
│  AWS EC2 / ECS   → Django + Gunicorn        │
│  AWS RDS         → PostgreSQL               │
│  AWS ElastiCache → Redis                    │
│  AWS S3          → Media Files              │
│  AWS CloudFront  → CDN                      │
│  Daphne/Uvicorn  → WebSocket (Channels)     │
│  Stripe/Razorpay → Payment Processing       │
│  SendGrid        → Transactional Email      │
│  Firebase        → Push Notifications       │
└─────────────────────────────────────────────┘
```

---

## Summary — Phase Timeline

| Phase | Focus | Duration | Models | Endpoints |
|---|---|---|---|---|
| **1** | Setup + Auth | 3–4 days | User, Address | 10 |
| **2** | Cars & Listings | 4–5 days | Car, Brand, Model, Image, Feature | 10 |
| **3** | Auctions & Bidding | 5–7 days | Auction, Bid, Watcher + WebSocket | 10 |
| **4** | Parts Marketplace | 3–4 days | Part, Category, Image | 5 |
| **5** | Cart, Checkout, Orders | 5–6 days | Cart, Order, OrderItem, Timeline, Payment | 12 |
| **6** | Vendor Management | 3–4 days | VendorProfile, Payout, Activity | 6 |
| **7** | Inspections & History | 4–5 days | Inspection, Category, Checkpoint, Photo, Valuation, History | 7 |
| **8** | Notifications & Search | 4–5 days | Notification, SavedSearch + Celery jobs | 10 |
| **9** | Help & Support | 2–3 days | HelpCategory, Article, Ticket, Testimonial | 5 |
| **10** | Integration & Deploy | 5–7 days | — | — |
| | **Total** | **~40–50 days** | **~30 models** | **~75 endpoints** |

---

## Quick-Start Commands

```bash
# 1. Create project
mkdir drivio_backend && cd drivio_backend
python -m venv venv && source venv/bin/activate
pip install django djangorestframework psycopg2-binary django-cors-headers \
  djangorestframework-simplejwt django-filter drf-spectacular django-storages \
  celery redis channels channels-redis Pillow

# 2. Start project
django-admin startproject config .
python manage.py startapp accounts
python manage.py startapp cars
# ... repeat for each app

# 3. Docker
docker-compose up -d  # postgres + redis

# 4. Run
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# 5. API docs
# Visit http://localhost:8000/api/docs/
```
