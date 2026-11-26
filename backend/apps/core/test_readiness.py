from unittest.mock import patch
from types import SimpleNamespace
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.cars.models import Car, CarBrand, CarModel
from apps.parts.models import Part, PartCategory
from apps.orders.models import Order
from apps.support.models import SupportTicket, SupportReply
from apps.notifications.models import Notification
from apps.auctions.models import Auction

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class MarketplaceReadinessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user(
            email="seller@ready.test", username="seller"
        )
        cls.buyer = User.objects.create_user(email="buyer@ready.test", username="buyer")
        cls.other = User.objects.create_user(email="other@ready.test", username="other")
        cls.brand = CarBrand.objects.create(name="Ready Motors", slug="ready")
        cls.model = CarModel.objects.create(
            brand=cls.brand, name="Tourer", slug="tourer"
        )
        cls.category = PartCategory.objects.create(name="Brakes", slug="brakes")
        cls.part = Part.objects.create(
            seller=cls.seller,
            category=cls.category,
            name="Ready brake kit",
            sku="READY-B",
            price=100,
            stock=3,
            condition="new",
            rating=5,
            review_count=500,
        )
        cls.part.compatible_brands.add(cls.brand)
        cls.second = Part.objects.create(
            seller=cls.seller,
            category=cls.category,
            name="Used brake kit",
            sku="READY-U",
            price=50,
            stock=0,
            condition="used",
        )
        cls.car = Car.objects.create(
            seller=cls.seller,
            brand=cls.brand,
            model=cls.model,
            year=2024,
            price=500000,
            mileage=1000,
            fuel_type="petrol",
            transmission="manual",
            color="Blue",
            vin="READYCAR000000001",
            location="Mumbai",
            status="draft",
        )

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_public_search_does_not_disclose_drafts_or_active_auction_vehicles(self):
        self.assertEqual(
            self.client.get("/api/dashboard/search/?q=Ready").data["cars"], []
        )
        Car.objects.filter(pk=self.car.pk).update(status="active")
        self.assertEqual(
            len(self.client.get("/api/dashboard/search/?q=Ready").data["cars"]), 1
        )
        Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="READY-1",
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=1000,
            reserve_price=2000,
        )
        self.assertEqual(
            self.client.get("/api/dashboard/search/?q=Ready").data["cars"], []
        )

    def test_parts_filters_price_condition_fitment_sort_and_stock_are_applied(self):
        response = self.client.get(
            "/api/parts/?q=brake&min_price=75&condition=new&make=Ready%20Motors&in_stock=true"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([p["id"] for p in response.data["results"]], [self.part.pk])
        sorted_parts = self.client.get("/api/parts/?sort=price_asc").data["results"]
        self.assertEqual(
            [p["id"] for p in sorted_parts], [self.second.pk, self.part.pk]
        )
        self.assertEqual(
            self.client.get("/api/parts/?min_price=invalid").status_code, 400
        )

    def test_seeded_rating_counters_do_not_become_verified_reviews(self):
        response = self.client.get(f"/api/parts/{self.part.pk}/")
        self.assertEqual(response.data["rating"], 0)
        self.assertEqual(response.data["review_count"], 0)

    def test_checkout_attempt_recovery_is_private_and_returns_the_saved_order(self):
        order = Order.objects.create(
            user=self.buyer,
            subtotal=100,
            total=100,
            checkout_key="recover-response-key",
        )
        self.client.force_authenticate(self.buyer)
        response = self.client.get(
            "/api/orders/checkout-attempt/?key=recover-response-key"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["id"], order.pk)
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.get(
                "/api/orders/checkout-attempt/?key=recover-response-key"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get("/api/orders/checkout-attempt/").status_code, 400
        )

    def test_unexpected_error_has_safe_json_and_matching_support_reference(self):
        with patch(
            "apps.parts.views.PartViewSet.list",
            side_effect=RuntimeError("sensitive internal detail"),
        ):
            response = self.client.get("/api/parts/")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("sensitive internal detail", str(response.data))
        self.assertEqual(response.data["request_id"], response["X-Request-ID"])

    def test_invalid_json_shapes_are_rejected_without_internal_errors(self):
        for value in [[], [1, 2], True, "bad", None]:
            response = self.client.generic(
                "POST",
                "/api/auth/login/",
                data=__import__("json").dumps(value),
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400, response.data)

    def test_support_replies_are_visible_to_owner_and_cannot_be_spoofed(self):
        ticket = SupportTicket.objects.create(
            user=self.buyer,
            subject="Delivery issue",
            message="Please help",
            status="resolved",
        )
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.post(
                f"/api/support/tickets/{ticket.pk}/replies/",
                {"body": "Not my ticket"},
                format="json",
            ).status_code,
            404,
        )
        self.client.force_authenticate(self.buyer)
        response = self.client.post(
            f"/api/support/tickets/{ticket.pk}/replies/",
            {"body": "Please follow up my delivery", "from_staff": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data["replies"][0]["from_staff"])
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "open")
        self.assertEqual(SupportReply.objects.get().author_id, self.buyer.pk)

    def test_staff_support_reply_records_author_and_notifies_customer(self):
        from apps.support.admin import SupportTicketAdmin
        from django.contrib.admin.sites import AdminSite

        staff = User.objects.create_user(
            email="staff@ready.test", username="staff", is_staff=True
        )
        ticket = SupportTicket.objects.create(
            user=self.buyer, subject="Payment issue", message="Please help"
        )
        reply = SupportReply(
            ticket=ticket, body="We have reviewed your payment reference."
        )
        formset = SimpleNamespace(save=lambda commit: [reply], save_m2m=lambda: None)
        SupportTicketAdmin(SupportTicket, AdminSite()).save_formset(
            SimpleNamespace(user=staff), None, formset, False
        )
        self.assertEqual(SupportReply.objects.get().author_id, staff.pk)
        self.assertTrue(
            Notification.objects.filter(
                user=self.buyer, title="Support replied to your request"
            ).exists()
        )

    @override_settings(REQUIRE_WORKER_HEALTH=True, SECURE_SSL_REDIRECT=False)
    def test_readiness_fails_for_stale_worker_but_liveness_remains_available(self):
        self.assertEqual(self.client.get("/api/health/live/").status_code, 200)
        self.assertEqual(self.client.get("/api/health/ready/").status_code, 503)
        cache.set("marketplace:lifecycle:last_ok", timezone.now().timestamp())
        self.assertEqual(self.client.get("/api/health/ready/").status_code, 200)

    @override_settings(RETURN_WINDOW_DAYS=14, MARKETPLACE_EXPRESS_FEE="55.00")
    def test_public_policy_uses_actual_configured_checkout_terms(self):
        response = self.client.get("/api/policies/")
        self.assertEqual(
            response.data if hasattr(response, "data") else response.json(),
            {**response.json(), "return_window_days": 14, "express_fee": "55.00"},
        )

    def test_cache_outage_returns_recoverable_unavailable_response(self):
        from redis.exceptions import ConnectionError

        with patch(
            "apps.parts.views.PartViewSet.list",
            side_effect=ConnectionError("cache down"),
        ):
            response = self.client.get("/api/parts/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("request_id", response.data)
        self.assertNotIn("cache down", str(response.data))

    def test_photo_owner_can_upload_change_primary_and_remove_without_losing_primary(
        self,
    ):
        import tempfile, io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        with (
            tempfile.TemporaryDirectory() as directory,
            override_settings(MEDIA_ROOT=directory),
        ):
            buffer = io.BytesIO()
            Image.new("RGB", (16, 16)).save(buffer, format="PNG")
            self.client.force_authenticate(self.seller)
            photos = []
            for i in range(2):
                response = self.client.post(
                    f"/api/parts/{self.part.pk}/images/",
                    {
                        "image": SimpleUploadedFile(
                            f"photo-{i}.png",
                            buffer.getvalue(),
                            content_type="image/png",
                        )
                    },
                    format="multipart",
                )
                self.assertEqual(response.status_code, 201, response.data)
                photos.append(response.data["id"])
            self.client.force_authenticate(self.other)
            path = f"/api/parts/{self.part.pk}/images/{photos[1]}/"
            self.assertEqual(
                self.client.patch(
                    path, {"is_primary": True}, format="json"
                ).status_code,
                404,
            )
            self.assertEqual(self.client.delete(path).status_code, 404)
            self.client.force_authenticate(self.seller)
            self.assertEqual(
                self.client.patch(
                    path, {"is_primary": True}, format="json"
                ).status_code,
                200,
            )
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.delete(path).status_code, 204)
            self.assertTrue(self.part.images.get(pk=photos[0]).is_primary)
            self.assertEqual(self.part.images.count(), 1)

    def test_listing_photo_limit_is_enforced_by_the_api(self):
        import tempfile, io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.parts.models import PartImage

        for i in range(10):
            PartImage.objects.create(
                part=self.part, image=f"parts/test-{i}.png", is_primary=i == 0
            )
        buffer = io.BytesIO()
        Image.new("RGB", (16, 16)).save(buffer, format="PNG")
        self.client.force_authenticate(self.seller)
        with (
            tempfile.TemporaryDirectory() as directory,
            override_settings(MEDIA_ROOT=directory),
        ):
            response = self.client.post(
                f"/api/parts/{self.part.pk}/images/",
                {
                    "image": SimpleUploadedFile(
                        "extra.png", buffer.getvalue(), content_type="image/png"
                    )
                },
                format="multipart",
            )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.part.images.count(), 10)
