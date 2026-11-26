from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from types import SimpleNamespace

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserAddress
from apps.auctions.models import Auction, Bid
from apps.auctions.services import advance_auction
from apps.cars.models import Car, CarBrand, CarModel
from apps.cart.models import Cart, CartItem
from apps.parts.models import Part, PartCategory
from apps.payments.models import Payment, PaymentRefund
from apps.vendors.models import VendorProfile, VendorEarning, VendorPayout
from apps.core.lifecycle import tick_marketplace
from .models import Order, OrderItem, ReturnRequest

User = get_user_model()


@override_settings(
    DEBUG=True,
    PAYMENTS_MODE="test",
    MARKETPLACE_CURRENCY="INR",
    MARKETPLACE_TAX_RATE="0.08",
    MARKETPLACE_EXPRESS_FEE="25.00",
)
class MarketplacePipelineTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.seller = User.objects.create_user(
            email="seller@pipeline.test", username="seller"
        )
        cls.seller_two = User.objects.create_user(
            email="seller2@pipeline.test", username="seller2"
        )
        cls.buyer = User.objects.create_user(
            email="buyer@pipeline.test", username="buyer"
        )
        cls.other = User.objects.create_user(
            email="other@pipeline.test", username="other"
        )
        cls.category = PartCategory.objects.create(name="Engine", slug="engine")
        cls.part = Part.objects.create(
            seller=cls.seller,
            category=cls.category,
            name="Turbo kit",
            description="Turbo kit",
            sku="PIPE-1",
            price=100,
            stock=5,
        )
        cls.brand = CarBrand.objects.create(name="Test Motors", slug="test-motors")
        cls.model = CarModel.objects.create(
            brand=cls.brand, name="Tourer", slug="tourer"
        )
        cls.car = Car.objects.create(
            seller=cls.seller,
            brand=cls.brand,
            model=cls.model,
            year=2024,
            price=500000,
            mileage=1000,
            fuel_type="petrol",
            transmission="automatic",
            color="Blue",
            vin="PIPELINE000000001",
            location="Mumbai",
            status="active",
        )
        cls.address = UserAddress.objects.create(
            user=cls.buyer,
            label="Home",
            full_name="Buyer",
            street="12 Marine Drive",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400020",
            country="India",
        )
        cls.profile = VendorProfile.objects.create(
            user=cls.seller,
            business_name="Pipeline Garage",
            contact_person="Seller",
            business_email="garage@pipeline.test",
            phone="9876543210",
            verification_status="verified",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)

    def add(self, quantity=1, product=None, kind="part"):
        product = product or self.part
        return self.client.post(
            "/api/cart/items/",
            {"item_type": kind, "item_id": product.pk, "quantity": quantity},
            format="json",
        )

    def checkout(self, key="pipeline-checkout", **extra):
        data = {
            "checkout_key": key,
            "shipping_address_id": self.address.pk,
            "delivery_method": "express",
            **extra,
        }
        return self.client.post("/api/orders/create_from_cart/", data, format="json")

    def pay(self, order_id):
        created = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": order_id, "method": "card"},
            format="json",
        )
        self.assertEqual(created.status_code, 200, created.data)
        confirmed = self.client.post(
            "/api/payments/confirm/",
            {"payment_id": created.data["payment"]["id"]},
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200, confirmed.data)
        return Payment.objects.get(order_id=order_id)

    def paid_part(self):
        self.assertEqual(self.add(2).status_code, 201)
        response = self.checkout()
        self.assertEqual(response.status_code, 201, response.data)
        self.pay(response.data["id"])
        return Order.objects.get(pk=response.data["id"])

    def deliver(self, item):
        self.client.force_authenticate(self.seller)
        first = self.client.patch(
            f"/api/orders/sales/{item.pk}/", {"status": "processing"}, format="json"
        )
        self.assertEqual(first.status_code, 200, first.data)
        second = self.client.patch(
            f"/api/orders/sales/{item.pk}/",
            {
                "status": "shipped",
                "tracking_number": "TRACK-1",
                "carrier": "Test courier",
            },
            format="json",
        )
        self.assertEqual(second.status_code, 200, second.data)
        self.client.force_authenticate(self.buyer)
        self.assertEqual(
            self.client.post(f"/api/orders/items/{item.pk}/received/").status_code, 200
        )

    def test_part_cart_merge_quantity_validation_and_no_product_swap(self):
        first = self.add(2)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(self.add(2).status_code, 200)
        self.assertEqual(CartItem.objects.get().quantity, 4)
        self.assertEqual(self.add(2).status_code, 400)
        self.assertEqual(
            self.client.patch(
                f"/api/cart/items/{first.data['id']}/", {"quantity": 0}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/cart/items/{first.data['id']}/",
                {"item_type": "car", "car": self.car.pk},
                format="json",
            ).status_code,
            400,
        )
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.add().status_code, 400)

    def test_cart_never_accepts_invalid_target_combinations(self):
        response = self.client.post(
            "/api/cart/items/",
            {
                "item_type": "part",
                "part": self.part.pk,
                "car": self.car.pk,
                "quantity": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.add(2, self.car, "car").status_code, 400)
        self.assertEqual(self.add(1, self.car, "car").status_code, 201)
        self.assertEqual(self.add(1, self.car, "car").status_code, 200)
        self.assertEqual(CartItem.objects.get().quantity, 1)

    def test_checkout_reserves_stock_once_and_replay_returns_same_order(self):
        self.add(2)
        first = self.checkout()
        self.assertEqual(first.status_code, 201, first.data)
        second = self.checkout()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["id"], second.data["id"])
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 3)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(CartItem.objects.count(), 0)
        self.assertEqual(Decimal(str(first.data["total"])), Decimal("241.00"))

    def test_checkout_revalidates_inventory_and_rolls_back_all_items(self):
        self.add(5)
        Part.objects.filter(pk=self.part.pk).update(stock=1)
        response = self.checkout()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(CartItem.objects.count(), 1)

    def test_vehicle_direct_checkout_is_pickup_and_cannot_be_double_sold(self):
        first = self.checkout(car_id=self.car.pk)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["delivery_method"], "pickup")
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, "reserved")
        self.client.force_authenticate(self.other)
        second = self.checkout(key="other-checkout", car_id=self.car.pk)
        self.assertEqual(second.status_code, 400)
        self.client.force_authenticate(self.buyer)
        self.pay(first.data["id"])
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, "sold")
        self.assertEqual(self.client.get("/api/cars/").data["count"], 0)

    def test_auction_vehicle_cannot_be_purchased_in_normal_checkout(self):
        Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="LIVE",
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=1000,
            reserve_price=1500,
        )
        self.assertEqual(self.add(1, self.car, "car").status_code, 400)
        self.assertEqual(self.checkout(car_id=self.car.pk).status_code, 400)

    def test_price_and_address_snapshots_do_not_change_with_source_records(self):
        self.add()
        response = self.checkout()
        order = Order.objects.get(pk=response.data["id"])
        self.part.price = 900
        self.part.save(update_fields=["price"])
        self.address.street = "Different street"
        self.address.save(update_fields=["street"])
        data = self.client.get(f"/api/orders/{order.pk}/").data
        self.assertEqual(data["shipping_address"]["street"], "12 Marine Drive")
        self.assertEqual(Decimal(data["items"][0]["unit_price"]), Decimal("100"))
        self.assertEqual(order.currency, "INR")
        self.assertEqual(order.items.get().seller_id, self.seller.pk)

    def test_expiry_and_cancel_release_inventory_once(self):
        self.add(2)
        response = self.checkout()
        order = Order.objects.get(pk=response.data["id"])
        Order.objects.filter(pk=order.pk).update(
            reservation_expires_at=timezone.now() - timedelta(seconds=1)
        )
        tick_marketplace()
        tick_marketplace()
        self.part.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.part.stock, 5)
        self.assertEqual(order.status, "cancelled")
        self.assertEqual(
            self.client.post(f"/api/orders/{order.pk}/cancel/").status_code, 200
        )
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 5)

    def test_decline_can_be_retried_without_new_order_or_double_stock_reservation(self):
        self.add()
        order = self.checkout().data
        intent = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": order["id"], "method": "card"},
            format="json",
        ).data
        decline = self.client.post(
            "/api/payments/confirm/",
            {"payment_id": intent["payment"]["id"], "result": "decline"},
            format="json",
        )
        self.assertEqual(decline.status_code, 402)
        self.pay(order["id"])
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 4)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(VendorEarning.objects.count(), 1)

    def test_paid_cancellation_refunds_and_releases_once(self):
        order = self.paid_part()
        first = self.client.post(
            f"/api/orders/{order.pk}/cancel/",
            {"reason": "Changed my mind"},
            format="json",
        )
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(
            self.client.post(f"/api/orders/{order.pk}/cancel/").status_code, 200
        )
        order.refresh_from_db()
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 5)
        self.assertEqual(order.payment.status, "refunded")
        self.assertEqual(PaymentRefund.objects.count(), 1)
        self.assertEqual(VendorEarning.objects.get().status, "reversed")

    def test_seller_cannot_dispatch_unpaid_or_another_sellers_item(self):
        self.add()
        order = self.checkout().data
        item_id = order["items"][0]["id"]
        self.client.force_authenticate(self.seller)
        self.assertEqual(
            self.client.patch(
                f"/api/orders/sales/{item_id}/", {"status": "processing"}, format="json"
            ).status_code,
            400,
        )
        self.client.force_authenticate(self.seller_two)
        self.assertEqual(
            self.client.get(f"/api/orders/sales/{item_id}/").status_code, 404
        )

    def test_fulfilment_tracking_receipt_and_invalid_transition_guards(self):
        order = self.paid_part()
        item = order.items.get()
        self.client.force_authenticate(self.seller)
        self.assertEqual(
            self.client.patch(
                f"/api/orders/sales/{item.pk}/", {"status": "delivered"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/orders/sales/{item.pk}/", {"status": "processing"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/orders/sales/{item.pk}/", {"status": "shipped"}, format="json"
            ).status_code,
            400,
        )
        shipped = self.client.patch(
            f"/api/orders/sales/{item.pk}/",
            {"status": "shipped", "tracking_number": "TRACK"},
            format="json",
        )
        self.assertEqual(shipped.status_code, 200)
        self.client.force_authenticate(self.buyer)
        self.assertEqual(
            self.client.post(f"/api/orders/{order.pk}/cancel/").status_code, 400
        )
        self.assertEqual(
            self.client.post(f"/api/orders/items/{item.pk}/received/").status_code, 200
        )
        self.assertEqual(
            self.client.post(f"/api/orders/items/{item.pk}/received/").status_code, 200
        )
        order.refresh_from_db()
        self.assertEqual(order.status, "delivered")
        self.assertEqual(VendorEarning.objects.get().status, "pending")
        self.assertIsNotNone(VendorEarning.objects.get().available_at)

    def test_return_review_refunds_and_restocks_after_physical_receipt(self):
        order = self.paid_part()
        item = order.items.get()
        self.assertEqual(
            self.client.post(
                "/api/orders/returns/",
                {"item": item.pk, "reason": "Not the right fit"},
                format="json",
            ).status_code,
            400,
        )
        self.deliver(item)
        result = self.client.post(
            "/api/orders/returns/",
            {"item": item.pk, "reason": "Not the right fit"},
            format="json",
        )
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(
            self.client.post(
                "/api/orders/returns/",
                {"item": item.pk, "reason": "Duplicate"},
                format="json",
            ).status_code,
            400,
        )
        return_id = result.data["id"]
        self.client.force_authenticate(self.seller_two)
        self.assertEqual(
            self.client.post(
                f"/api/orders/returns/{return_id}/decision/",
                {"status": "approved", "seller_note": "Return it"},
                format="json",
            ).status_code,
            404,
        )
        self.client.force_authenticate(self.seller)
        self.assertEqual(
            self.client.post(
                f"/api/orders/returns/{return_id}/decision/",
                {"status": "approved", "seller_note": "Return it"},
                format="json",
            ).status_code,
            200,
        )
        received = self.client.post(
            f"/api/orders/returns/{return_id}/decision/",
            {"status": "received", "seller_note": "Item checked and received"},
            format="json",
        )
        self.assertEqual(received.status_code, 200, received.data)
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 5)
        self.assertEqual(PaymentRefund.objects.get().amount, Decimal("216"))
        self.assertEqual(VendorEarning.objects.get().status, "reversed")
        self.assertEqual(received.data["status"], "refunded")

    def test_settlement_eligibility_and_retry_safe_test_transfer(self):
        order = self.paid_part()
        item = order.items.get()
        self.deliver(item)
        self.client.force_authenticate(self.seller)
        self.client.post("/api/vendors/connect/")
        unavailable = self.client.post(
            "/api/vendors/request-payout/",
            {"request_key": "settlement-unique", "currency": "INR"},
            format="json",
        )
        self.assertEqual(unavailable.status_code, 400)
        VendorEarning.objects.filter(item=item).update(
            available_at=timezone.now() - timedelta(seconds=1)
        )
        tick_marketplace()
        result = self.client.post(
            "/api/vendors/request-payout/",
            {"request_key": "settlement-unique", "currency": "INR"},
            format="json",
        )
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data["mode"], "test")
        self.assertEqual(result.data["amount"], "200.00")
        again = self.client.post(
            "/api/vendors/request-payout/",
            {"request_key": "settlement-unique", "currency": "INR"},
            format="json",
        )
        self.assertEqual(again.data["id"], result.data["id"])
        self.assertEqual(VendorPayout.objects.count(), 1)
        self.assertEqual(VendorEarning.objects.get().status, "paid")

    def test_auto_auction_open_close_and_winner_payment_order(self):
        now = timezone.now()
        auction = Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="SCHEDULED",
            start_time=now - timedelta(minutes=1),
            end_time=now + timedelta(minutes=5),
            starting_bid=1000,
            reserve_price=1200,
            lifecycle_managed=True,
        )
        tick_marketplace()
        auction.refresh_from_db()
        self.assertEqual(auction.status, "live")
        bid = self.client.post(
            f"/api/auctions/{auction.pk}/place_bid/", {"amount": "1300"}, format="json"
        )
        self.assertEqual(bid.status_code, 201, bid.data)
        Auction.objects.filter(pk=auction.pk).update(
            end_time=timezone.now() - timedelta(seconds=1)
        )
        tick_marketplace()
        tick_marketplace()
        order = Order.objects.get(auction=auction)
        self.assertEqual(order.user_id, self.buyer.pk)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(order.source, "auction")
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, "reserved")
        self.pay(order.pk)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, "sold")

    def test_public_auction_never_exposes_proxy_maximum_or_reserve_price(self):
        auction = Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="PRIVATE",
            start_time=timezone.now() - timedelta(minutes=1),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=100,
            reserve_price=500,
            status="live",
        )
        self.client.post(
            f"/api/auctions/{auction.pk}/proxy-bid/", {"proxy_max": 900}, format="json"
        )
        self.client.force_authenticate(self.other)
        detail = self.client.get(f"/api/auctions/{auction.pk}/").data
        self.assertNotIn("reserve_price", detail)
        self.assertTrue(all("proxy_max" not in bid for bid in detail["bids"]))
        bad = self.client.post(
            f"/api/auctions/{auction.pk}/proxy-bid/",
            {"proxy_max": "NaN"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

    def test_live_payment_cannot_be_self_asserted(self):
        order = self.paid_part()
        payment = order.payment
        payment.status = "processing"
        payment.mode = "stripe"
        payment.checkout_session_id = "cs_unpaid"
        payment.save()
        with (
            override_settings(
                DEBUG=False,
                PAYMENTS_MODE="stripe",
                STRIPE_SECRET_KEY="sk_test_placeholder",
            ),
            patch(
                "stripe.checkout.Session.retrieve",
                return_value=SimpleNamespace(
                    payment_status="unpaid",
                    amount_total=int(order.total * 100),
                    currency="inr",
                    metadata={"order_id": str(order.pk)},
                    payment_intent="pi_unpaid",
                ),
            ),
        ):
            result = self.client.post(
                "/api/payments/confirm/", {"payment_id": payment.pk}, format="json"
            )
        self.assertEqual(result.status_code, 400)
        payment.refresh_from_db()
        self.assertEqual(payment.status, "processing")

    def test_two_sellers_cancel_only_own_line_and_replay_never_restocks_twice(self):
        second = Part.objects.create(
            seller=self.seller_two,
            category=self.category,
            name="Second kit",
            sku="PIPE-2",
            price=50,
            stock=3,
        )
        self.add(2)
        self.add(1, second)
        order = Order.objects.get(pk=self.checkout().data["id"])
        self.pay(order.pk)
        item = order.items.get(seller=self.seller)
        self.client.force_authenticate(self.seller)
        for _ in range(2):
            result = self.client.patch(
                f"/api/orders/sales/{item.pk}/",
                {
                    "status": "cancelled",
                    "fulfillment_note": "Unable to supply this item",
                },
                format="json",
            )
            self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(Part.objects.get(pk=self.part.pk).stock, 5)
        self.assertEqual(Part.objects.get(pk=second.pk).stock, 2)
        self.assertEqual(PaymentRefund.objects.count(), 1)
        self.assertEqual(PaymentRefund.objects.get().amount, Decimal("216"))
        self.client.force_authenticate(self.buyer)
        self.assertEqual(
            self.client.post(f"/api/orders/{order.pk}/cancel/").status_code, 200
        )
        self.assertEqual(Part.objects.get(pk=self.part.pk).stock, 5)
        self.assertEqual(Part.objects.get(pk=second.pk).stock, 3)
        self.assertEqual(Payment.objects.get(order=order).refunded_amount, order.total)

    def test_quote_rejects_changed_prices_before_reserving_stock(self):
        self.add()
        quote = self.client.get("/api/orders/quote/").data
        Part.objects.filter(pk=self.part.pk).update(price=200)
        result = self.checkout(quote_token=quote["quote_token"])
        self.assertEqual(result.status_code, 400)
        self.assertFalse(Order.objects.exists())
        self.assertEqual(Part.objects.get(pk=self.part.pk).stock, 5)

    def test_handover_requires_keys_and_transfer_documents(self):
        order = Order.objects.get(pk=self.checkout(car_id=self.car.pk).data["id"])
        self.pay(order.pk)
        item = order.items.get()
        self.client.force_authenticate(self.seller)
        path = f"/api/orders/sales/{item.pk}/"
        self.assertEqual(
            self.client.patch(
                path, {"status": "processing"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(
                path,
                {
                    "status": "ready_for_pickup",
                    "fulfillment_note": "Collect keys and documents at our garage",
                },
                format="json",
            ).status_code,
            200,
        )
        self.client.force_authenticate(self.buyer)
        path = f"/api/orders/items/{item.pk}/received/"
        self.assertEqual(self.client.post(path, {}, format="json").status_code, 400)
        self.assertEqual(
            self.client.post(
                path,
                {"handover": {"keys_received": True, "documents_received": True}},
                format="json",
            ).status_code,
            200,
        )

    def test_provider_amount_mismatch_never_completes_an_order(self):
        self.add()
        order = Order.objects.get(pk=self.checkout().data["id"])
        payment = Payment.objects.create(
            order=order,
            amount=order.total,
            currency="INR",
            mode="stripe",
            status="processing",
            method="card",
            checkout_session_id="cs_wrong",
        )
        with (
            override_settings(
                DEBUG=False,
                PAYMENTS_MODE="stripe",
                STRIPE_SECRET_KEY="sk_test_placeholder",
            ),
            patch(
                "stripe.checkout.Session.retrieve",
                return_value=SimpleNamespace(
                    payment_status="paid",
                    amount_total=1,
                    currency="inr",
                    metadata={"order_id": str(order.pk)},
                    payment_intent="pi_wrong",
                ),
            ),
        ):
            result = self.client.post(
                "/api/payments/confirm/", {"payment_id": payment.pk}, format="json"
            )
        self.assertEqual(result.status_code, 400)
        self.assertEqual(Order.objects.get(pk=order.pk).status, "placed")
        self.assertFalse(VendorEarning.objects.exists())

    def test_expired_live_auction_cannot_be_extended(self):
        auction = Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="EXPIRED",
            status="live",
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() - timedelta(seconds=1),
            starting_bid=100,
            reserve_price=500,
        )
        self.client.force_authenticate(self.seller)
        self.assertEqual(
            self.client.post(
                f"/api/auctions/{auction.pk}/extend/", {"minutes": 10}, format="json"
            ).status_code,
            400,
        )

    def test_verified_review_requires_own_delivered_purchase_and_is_unique(self):
        order = self.paid_part()
        data = {
            "item": order.items.get().pk,
            "rating": 5,
            "body": "Arrived as described and fits correctly",
        }
        path = f"/api/parts/{self.part.pk}/reviews/"
        self.assertIn(
            self.client.post(path, data, format="json").status_code, [400, 404]
        )
        self.deliver(order.items.get())
        self.client.force_authenticate(self.other)
        self.assertIn(
            self.client.post(path, data, format="json").status_code, [400, 404]
        )
        self.client.force_authenticate(self.buyer)
        self.assertEqual(self.client.post(path, data, format="json").status_code, 201)
        self.assertEqual(self.client.post(path, data, format="json").status_code, 400)

    def test_signed_webhook_is_idempotent_and_invalid_signature_is_rejected(self):
        import hmac, hashlib, json, time

        self.add()
        order = Order.objects.get(pk=self.checkout().data["id"])
        payment = Payment.objects.create(
            order=order,
            amount=order.total,
            currency="INR",
            mode="stripe",
            status="processing",
            method="card",
            checkout_session_id="cs_webhook",
        )
        event = {
            "id": "evt_verified",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_webhook",
                    "object": "checkout.session",
                    "payment_status": "paid",
                    "metadata": {"payment_id": str(payment.pk)},
                }
            },
        }
        body = json.dumps(event)
        timestamp = int(time.time())
        signature = hmac.new(
            b"whsec_test", (str(timestamp) + "." + body).encode(), hashlib.sha256
        ).hexdigest()
        with (
            override_settings(
                DEBUG=False,
                PAYMENTS_MODE="stripe",
                STRIPE_SECRET_KEY="sk_test_placeholder",
                STRIPE_WEBHOOK_SECRET="whsec_test",
            ),
            patch(
                "stripe.checkout.Session.retrieve",
                return_value=SimpleNamespace(
                    payment_status="paid",
                    amount_total=int(order.total * 100),
                    currency="inr",
                    metadata={"order_id": str(order.pk)},
                    payment_intent="pi_webhook",
                ),
            ),
        ):
            self.assertEqual(
                self.client.post(
                    "/api/payments/webhook/",
                    body,
                    content_type="application/json",
                    HTTP_STRIPE_SIGNATURE="invalid",
                ).status_code,
                400,
            )
            for _ in range(2):
                response = self.client.post(
                    "/api/payments/webhook/",
                    body,
                    content_type="application/json",
                    HTTP_STRIPE_SIGNATURE=f"t={timestamp},v1={signature}",
                )
                self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(VendorEarning.objects.count(), 1)
        self.assertEqual(Order.objects.get(pk=order.pk).status, "confirmed")

    def test_seller_cannot_reactivate_a_paid_vehicle_or_expose_a_draft_in_compare(self):
        order = Order.objects.get(pk=self.checkout(car_id=self.car.pk).data["id"])
        self.pay(order.pk)
        self.client.force_authenticate(self.seller)
        response = self.client.patch(
            f"/api/cars/{self.car.pk}/", {"status": "active"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Car.objects.get(pk=self.car.pk).status, "sold")
        Car.objects.filter(pk=self.car.pk).update(status="draft")
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.get(f"/api/cars/compare/?ids={self.car.pk}").data, []
        )

    def signed_webhook(self, event):
        import hmac, hashlib, json, time

        body = json.dumps(event)
        timestamp = int(time.time())
        signature = hmac.new(
            b"whsec_readiness", (str(timestamp) + "." + body).encode(), hashlib.sha256
        ).hexdigest()
        return self.client.post(
            "/api/payments/webhook/",
            body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=f"t={timestamp},v1={signature}",
        )

    def test_late_provider_payment_after_release_is_refunded_once_without_reselling_stock(
        self,
    ):
        self.add()
        order = Order.objects.get(pk=self.checkout().data["id"])
        created = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": order.pk, "method": "card"},
            format="json",
        )
        self.assertEqual(created.status_code, 200)
        self.assertEqual(
            self.client.post(f"/api/orders/{order.pk}/cancel/").status_code, 200
        )
        payment = Payment.objects.get(order=order)
        payment.mode = "stripe"
        payment.status = "processing"
        payment.checkout_session_id = "cs_late"
        payment.stripe_payment_id = "pi_late"
        payment.save()
        event = {
            "id": "evt_late",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_late",
                    "object": "checkout.session",
                    "payment_status": "paid",
                    "metadata": {"payment_id": str(payment.pk)},
                }
            },
        }
        with (
            override_settings(
                DEBUG=False,
                PAYMENTS_MODE="stripe",
                STRIPE_SECRET_KEY="sk_test_placeholder",
                STRIPE_WEBHOOK_SECRET="whsec_readiness",
            ),
            patch(
                "stripe.checkout.Session.retrieve",
                return_value=SimpleNamespace(
                    payment_status="paid",
                    amount_total=int(order.total * 100),
                    currency="inr",
                    metadata={"order_id": str(order.pk)},
                    payment_intent="pi_late",
                ),
            ),
            patch(
                "stripe.Refund.create",
                return_value=SimpleNamespace(id="re_late", status="succeeded"),
            ) as refund,
        ):
            self.assertEqual(self.signed_webhook(event).status_code, 200)
            event["id"] = "evt_late_duplicate_delivery"
            self.assertEqual(self.signed_webhook(event).status_code, 200)
            self.assertEqual(refund.call_count, 1)
        self.assertEqual(Order.objects.get(pk=order.pk).status, "cancelled")
        self.assertEqual(Part.objects.get(pk=self.part.pk).stock, 5)
        self.assertEqual(Payment.objects.get(pk=payment.pk).status, "refunded")
        self.assertFalse(VendorEarning.objects.exists())

    def test_stale_refund_event_uses_provider_status_and_does_not_regress_success(self):
        order = self.paid_part()
        payment = Payment.objects.get(order=order)
        payment.mode = "stripe"
        payment.status = "refunded"
        payment.refunded_amount = payment.amount
        payment.save()
        refund = PaymentRefund.objects.create(
            payment=payment,
            key="cancel-order-readiness",
            amount=payment.amount,
            status="succeeded",
            provider_id="re_stale",
            reason="Cancelled",
        )
        event = {
            "id": "evt_stale_refund",
            "object": "event",
            "type": "refund.failed",
            "data": {
                "object": {"id": "re_stale", "object": "refund", "status": "failed"}
            },
        }
        with (
            override_settings(
                DEBUG=False,
                PAYMENTS_MODE="stripe",
                STRIPE_SECRET_KEY="sk_test_placeholder",
                STRIPE_WEBHOOK_SECRET="whsec_readiness",
            ),
            patch(
                "stripe.Refund.retrieve",
                return_value=SimpleNamespace(id="re_stale", status="succeeded"),
            ),
        ):
            self.assertEqual(self.signed_webhook(event).status_code, 200)
        refund.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(refund.status, "succeeded")
        self.assertEqual(payment.refunded_amount, payment.amount)
        self.assertEqual(payment.status, "refunded")

    def test_broadcast_failure_does_not_turn_an_accepted_bid_into_a_failed_response(
        self,
    ):
        from unittest.mock import AsyncMock

        auction = Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="BROADCAST-FAIL",
            status="live",
            start_time=timezone.now() - timedelta(minutes=1),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=100,
            reserve_price=500,
        )
        layer = SimpleNamespace(
            group_send=AsyncMock(side_effect=ConnectionError("broadcast unavailable"))
        )
        with (
            patch("apps.auctions.services.get_channel_layer", return_value=layer),
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                f"/api/auctions/{auction.pk}/place_bid/", {"amount": 600}, format="json"
            )
        self.assertEqual(response.status_code, 201, response.data)
        auction.refresh_from_db()
        self.assertEqual(auction.current_bid, 600)

    @override_settings(REQUIRE_VERIFIED_EMAIL_FOR_BIDDING=True)
    def test_public_bidding_requires_verified_contact_before_accepting_money_commitments(
        self,
    ):
        auction = Auction.objects.create(
            car=self.car,
            vendor=self.seller,
            lot_number="VERIFY-BID",
            status="live",
            start_time=timezone.now() - timedelta(minutes=1),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=100,
            reserve_price=500,
        )
        path = f"/api/auctions/{auction.pk}/place_bid/"
        response = self.client.post(path, {"amount": 600}, format="json")
        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Bid.objects.exists())
        self.buyer.email_verified_at = timezone.now()
        self.buyer.save(update_fields=["email_verified_at"])
        self.assertEqual(
            self.client.post(path, {"amount": 600}, format="json").status_code, 201
        )
