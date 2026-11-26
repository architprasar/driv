from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserAddress
from apps.auctions.models import Auction
from apps.cars.models import Car, CarBrand, CarModel
from apps.orders.models import Order, OrderItem
from apps.parts.models import Part, PartCategory
from apps.payments.models import Payment
from apps.search.models import SavedSearch
from apps.vendors.models import VendorProfile, VendorPayout

User = get_user_model()


class WorkspaceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(username="owner", email="owner@example.com", password="Original-safe-password-547!", role="seller")
        cls.other = User.objects.create_user(username="other", email="other@example.com", password="Other-safe-password-547!")
        cls.brand = CarBrand.objects.create(name="BMW", slug="bmw")
        cls.model = CarModel.objects.create(brand=cls.brand, name="M3", slug="m3")
        cls.category = PartCategory.objects.create(name="Brakes", slug="brakes")
        cls.part = Part.objects.create(seller=cls.owner, category=cls.category, name="Brake kit", sku="KIT-1", price="100", stock=2)
        cls.cars = []
        for i in range(13):
            cls.cars.append(Car.objects.create(seller=cls.owner, brand=cls.brand, model=cls.model, year=2023, price="500000", mileage=1000, color="Blue", vin=f"VIN{i:014d}", fuel_type="petrol", transmission="automatic", location="Mumbai", status="draft" if i == 12 else "active", views_count=5))
        cls.foreign = Car.objects.create(seller=cls.other, brand=cls.brand, model=cls.model, year=2020, price="100000", mileage=1000, color="Black", vin="OTHER000000000001", fuel_type="diesel", transmission="manual", location="Delhi", status="active")
        cls.order = Order.objects.create(user=cls.other, subtotal="200", total="200", status="confirmed")
        OrderItem.objects.create(order=cls.order, part=cls.part, name="Brake kit", unit_price="100", quantity=2)
        Payment.objects.create(order=cls.order, method="card", amount="200", currency="INR", status="completed")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_workspace_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/dashboard/workspace/summary/").status_code, 401)

    def test_summary_uses_full_owner_counts_and_actual_paid_line_items(self):
        data = self.client.get("/api/dashboard/workspace/summary/").data
        self.assertEqual(data["cars"], 13)
        self.assertEqual(data["active_cars"], 12)
        self.assertEqual(data["views"], 65)
        self.assertEqual(data["parts"], 1)
        self.assertEqual(Decimal(data["paid_sales_value"]), Decimal("200"))
        self.assertEqual(data["sales_currency"], "INR")
        self.assertEqual(data["orders"], 0)

    def test_inventory_search_filter_and_pagination_are_owner_scoped(self):
        first = self.client.get("/api/dashboard/workspace/cars/").data
        self.assertEqual(first["count"], 13)
        self.assertEqual(len(first["results"]), 10)
        second = self.client.get("/api/dashboard/workspace/cars/?page=2").data
        self.assertEqual(len(second["results"]), 3)
        self.assertNotIn(self.foreign.pk, [row["id"] for row in first["results"] + second["results"]])
        filtered = self.client.get("/api/dashboard/workspace/cars/?status=draft&search=BMW").data
        self.assertEqual(filtered["count"], 1)
        self.assertEqual(self.client.get("/api/dashboard/workspace/parts/?status=low_stock").data["count"], 1)

    def test_other_user_cannot_update_or_delete_owned_listings(self):
        self.client.force_authenticate(self.other)
        for domain, instance in (("cars", self.cars[0]), ("parts", self.part)):
            self.assertEqual(self.client.patch(f"/api/{domain}/{instance.pk}/", {"price": "1"}, format="json").status_code, 403)
            self.assertEqual(self.client.delete(f"/api/{domain}/{instance.pk}/").status_code, 403)
        self.part.refresh_from_db()
        self.assertEqual(self.part.price, Decimal("100"))

    def test_owner_can_edit_inventory(self):
        response = self.client.patch(f"/api/parts/{self.part.pk}/", {"stock": 7, "price": "125"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 7)
        response = self.client.patch(f"/api/cars/{self.cars[0].pk}/", {"status": "archived"}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_listing_with_order_history_cannot_be_deleted(self):
        self.assertEqual(self.client.delete(f"/api/parts/{self.part.pk}/").status_code, 400)
        self.assertTrue(Part.objects.filter(pk=self.part.pk).exists())

    def test_live_auction_vehicle_cannot_change_price_or_availability(self):
        Auction.objects.create(car=self.cars[0], vendor=self.owner, lot_number="SAFE-1", start_time=timezone.now(), end_time=timezone.now()+timedelta(days=1), starting_bid=100, reserve_price=200, status="live")
        self.assertEqual(self.client.patch(f"/api/cars/{self.cars[0].pk}/", {"price": "1"}, format="json").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/cars/{self.cars[0].pk}/").status_code, 400)

    def test_sales_show_only_owner_line_items_and_payments_stay_private(self):
        foreign_part = Part.objects.create(seller=self.other, category=self.category, name="Other item", sku="OTHER-2", price=300)
        OrderItem.objects.create(order=self.order, part=foreign_part, name="Other item", quantity=1, unit_price=300)
        sales = self.client.get("/api/dashboard/workspace/sales/").data
        self.assertEqual(sales["count"], 1)
        self.assertEqual(sales["results"][0]["amount"], "200.00")
        self.assertEqual(self.client.get("/api/dashboard/workspace/payments/").data["count"], 0)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/dashboard/workspace/payments/").data["count"], 1)

    def test_user_cannot_change_own_role_or_register_as_admin(self):
        response = self.client.patch("/api/auth/me/", {"role": "admin"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.role, "seller")
        self.client.force_authenticate(None)
        response = self.client.post("/api/auth/register/", {"email": "bad@example.com", "username": "bad", "password": "Some-strong-password-683!", "password2": "Some-strong-password-683!", "role": "admin"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_updating_default_address_clears_previous_default(self):
        first = UserAddress.objects.create(user=self.owner, label="Home", full_name="Owner", street="Road 1", city="Mumbai", state="MH", postal_code="400001", is_default=True)
        second = UserAddress.objects.create(user=self.owner, label="Office", full_name="Owner", street="Road 2", city="Mumbai", state="MH", postal_code="400002")
        response = self.client.patch(f"/api/auth/addresses/{second.pk}/", {"is_default": True}, format="json")
        self.assertEqual(response.status_code, 200)
        first.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertEqual(UserAddress.objects.filter(user=self.owner, is_default=True).count(), 1)

    def test_password_change_requires_current_password(self):
        bad = self.client.post("/api/auth/password/change/", {"current_password": "wrong", "new_password": "Replacement-safe-password-983!"}, format="json")
        self.assertEqual(bad.status_code, 400)
        good = self.client.post("/api/auth/password/change/", {"current_password": "Original-safe-password-547!", "new_password": "Replacement-safe-password-983!"}, format="json")
        self.assertEqual(good.status_code, 200)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.check_password("Replacement-safe-password-983!"))

    def test_saved_search_matches_apply_real_criteria_and_exclude_drafts(self):
        saved = SavedSearch.objects.create(user=self.owner, name="BMW in Mumbai", filters={"brand": "bmw", "city": "Mumbai", "max_price": "600000"})
        response = self.client.get(f"/api/saved-searches/{saved.pk}/matches/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 12)
        self.assertEqual(len(response.data["results"]), 10)
        invalid = self.client.post("/api/saved-searches/", {"name": "Invalid", "filters": {"min_price": 600, "max_price": 100}}, format="json")
        self.assertEqual(invalid.status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/saved-searches/{saved.pk}/matches/").status_code, 404)

    def test_orders_filter_matches_server_side_and_supports_page_size(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/orders/?status=confirmed&page_size=10").data["count"], 1)
        self.assertEqual(self.client.get("/api/orders/?status=delivered").data["count"], 0)

    def test_vendor_business_payouts_and_activity_are_owner_scoped(self):
        self.assertEqual(self.client.get("/api/dashboard/workspace/business/").status_code, 404)
        vendor = VendorProfile.objects.create(user=self.owner, business_name="Garage", contact_person="Owner", business_email="business@example.com", phone="12345")
        VendorPayout.objects.create(vendor=vendor, amount=100, status="pending")
        response = self.client.patch("/api/vendors/dashboard/", {"phone": "98765", "verification_status": "verified"}, format="json")
        self.assertEqual(response.status_code, 200)
        vendor.refresh_from_db()
        self.assertEqual(vendor.phone, "98765")
        self.assertEqual(vendor.verification_status, "under_review")
        self.assertEqual(self.client.get("/api/dashboard/workspace/activity/").data["count"], 1)
        self.assertEqual(self.client.get("/api/dashboard/workspace/payouts/").data["count"], 1)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/dashboard/workspace/payouts/").status_code, 404)

    def test_auction_creation_uses_owner_and_can_be_started(self):
        now = timezone.now()
        payload = {"car": self.cars[0].pk, "vendor": self.other.pk, "lot_number": "NEW-LOT", "starting_bid": "100", "reserve_price": "200", "start_time": (now-timedelta(minutes=1)).isoformat(), "end_time": (now+timedelta(hours=1)).isoformat()}
        response = self.client.post("/api/auctions/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        auction = Auction.objects.get(pk=response.data["id"])
        self.assertEqual(auction.vendor_id, self.owner.pk)
        self.assertEqual(auction.status, "upcoming")
        self.assertEqual(self.client.post(f"/api/auctions/{auction.pk}/start/").status_code, 200)
        auction.refresh_from_db()
        self.assertEqual(auction.status, "live")
        self.assertEqual(self.client.post(f"/api/auctions/{auction.pk}/extend/", {"minutes": -5}, format="json").status_code, 400)
        self.assertEqual(self.client.post(f"/api/auctions/{auction.pk}/extend/", {"minutes": "invalid"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(f"/api/auctions/{auction.pk}/extend/", {"minutes": 15}, format="json").status_code, 200)

    def test_auction_creation_rejects_foreign_vehicle_and_invalid_times(self):
        now = timezone.now()
        payload = {"car": self.foreign.pk, "lot_number": "INVALID-LOT", "starting_bid": "100", "reserve_price": "200", "start_time": now.isoformat(), "end_time": (now+timedelta(hours=1)).isoformat()}
        self.assertEqual(self.client.post("/api/auctions/", payload, format="json").status_code, 400)
        payload.update(car=self.cars[0].pk, end_time=(now-timedelta(hours=1)).isoformat())
        self.assertEqual(self.client.post("/api/auctions/", payload, format="json").status_code, 400)

    def test_auction_generic_update_cannot_mutate_another_owners_lot(self):
        auction = Auction.objects.create(car=self.cars[0], vendor=self.owner, lot_number="SECURE-LOT", start_time=timezone.now(), end_time=timezone.now()+timedelta(days=1), starting_bid=100, reserve_price=200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.patch(f"/api/auctions/{auction.pk}/", {"reserve_price": "1"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/auctions/{auction.pk}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/auctions/{auction.pk}/start/").status_code, 403)

    def test_revenue_never_combines_different_payment_currencies(self):
        order = Order.objects.create(user=self.other, subtotal=500, total=500)
        OrderItem.objects.create(order=order, part=self.part, name="Brake kit", unit_price=500, quantity=1)
        Payment.objects.create(order=order, method="card", amount=500, currency="USD", status="completed")
        inr = self.client.get("/api/dashboard/workspace/summary/?currency=INR").data
        usd = self.client.get("/api/dashboard/workspace/summary/?currency=USD").data
        self.assertEqual(Decimal(inr["paid_sales_value"]), Decimal("200"))
        self.assertEqual(Decimal(usd["paid_sales_value"]), Decimal("500"))
        self.assertCountEqual(usd["sales_currencies"], ["INR", "USD"])

    def test_brand_choices_are_not_shadowed_by_car_detail_route(self):
        response = self.client.get("/api/cars/brands/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["slug"], "bmw")

    def test_inventory_editor_detail_is_private_and_does_not_increment_views(self):
        response = self.client.get(f"/api/dashboard/workspace/cars/{self.cars[0].pk}/")
        self.assertEqual(response.status_code, 200)
        self.cars[0].refresh_from_db()
        self.assertEqual(self.cars[0].views_count, 5)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/dashboard/workspace/cars/{self.cars[0].pk}/").status_code, 404)

    def test_vendor_registration_creates_profile_once_and_updates_role(self):
        payload = {"business_name": "New Garage", "contact_person": "Owner", "business_email": "garage@example.com", "phone": "1234567890"}
        first = self.client.post("/api/vendors/register/", payload, format="multipart")
        self.assertEqual(first.status_code, 201)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.role, "vendor")
        self.assertEqual(self.client.post("/api/vendors/register/", payload, format="multipart").status_code, 400)
        self.assertEqual(VendorProfile.objects.filter(user=self.owner).count(), 1)
