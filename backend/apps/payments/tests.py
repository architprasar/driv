from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.orders.models import Order, OrderTimeline
from apps.payments.models import Payment

User = get_user_model()


@override_settings(DEBUG=True, PAYMENTS_MODE="test")
class PaymentLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="buyer@example.com",
            username="buyer",
            password="testpassword123",
            role="buyer",
        )
        self.order = Order.objects.create(
            user=self.user,
            status="placed",
            delivery_method="pickup",
            inventory_reserved=True,
            subtotal=Decimal("200.00"),
            shipping_cost=Decimal("0.00"),
            tax=Decimal("16.00"),
            total=Decimal("216.00"),
        )
        OrderTimeline.objects.create(
            order=self.order,
            status="placed",
            title="Order Placed",
            description="Your order has been successfully placed.",
        )

    def test_create_payment_and_confirm_happy_path(self):
        self.client.force_authenticate(user=self.user)

        create_response = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": self.order.id, "method": "card"},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.data["order_status"], "placed")
        self.assertTrue(create_response.data["requires_confirmation"])
        self.assertEqual(create_response.data["payment"]["status"], "processing")

        payment_id = create_response.data["payment"]["id"]
        confirm_response = self.client.post(
            "/api/payments/confirm/",
            {"payment_id": payment_id},
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_response.data["payment"]["status"], "completed")
        self.assertEqual(confirm_response.data["order"]["status"], "confirmed")

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "confirmed")
        self.assertTrue(
            self.order.timeline.filter(status="confirmed", title="Payment Confirmed").exists()
        )

    def test_create_payment_rejects_non_placed_order(self):
        self.order.status = "confirmed"
        self.order.save(update_fields=["status"])

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": self.order.id, "method": "card"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["detail"], "Payment can only be initiated for placed orders.")

    def test_create_payment_requires_emi_months_for_emi_method(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": self.order.id, "method": "emi"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("emi_months", response.data)

    def test_duplicate_processing_payment_is_rejected(self):
        Payment.objects.create(
            order=self.order,
            method="card",
            amount=self.order.total,
            status="processing",
            stripe_payment_id="pi_existing",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/payments/create-intent/",
            {"order_id": self.order.id, "method": "card"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"],
            "Payment is already in progress or completed for this order.",
        )

    def test_confirm_rejects_non_confirmable_payment_status(self):
        payment = Payment.objects.create(
            order=self.order,
            method="card",
            amount=self.order.total,
            status="failed",
            stripe_payment_id="pi_failed",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/payments/confirm/",
            {"payment_id": payment.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"],
            "Only pending or processing payments can be confirmed.",
        )


@override_settings(
    DEBUG=False,
    PAYMENTS_MODE="cashfree",
    CASHFREE_APP_ID="app",
    CASHFREE_SECRET_KEY="secret",
    CASHFREE_ENV="sandbox",
)
class CashfreePaymentTests(TestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone

        self.client = APIClient()
        self.user = User.objects.create_user(
            email="cf@example.com", username="cf", password="testpassword123", role="buyer"
        )
        self.client.force_authenticate(self.user)
        self.order = Order.objects.create(
            user=self.user,
            status="placed",
            delivery_method="pickup",
            inventory_reserved=True,
            subtotal=Decimal("200.00"),
            shipping_cost=Decimal("0.00"),
            tax=Decimal("16.00"),
            total=Decimal("216.00"),
            reservation_expires_at=timezone.now() + timedelta(minutes=30),
        )

    def _create(self):
        from unittest.mock import patch

        with patch(
            "apps.payments.cashfree.request",
            return_value={"payment_session_id": "session_abc"},
        ) as call:
            response = self.client.post(
                "/api/payments/create-intent/",
                {"order_id": self.order.pk, "method": "card"},
                format="json",
            )
        return response, call

    def test_create_returns_payment_session_for_cashfree(self):
        response, call = self._create()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["mode"], "cashfree")
        self.assertEqual(response.data["payment_session_id"], "session_abc")
        body = call.call_args.args[2]
        self.assertEqual(body["order_amount"], 216.0)
        self.assertEqual(body["order_tags"]["order_id"], str(self.order.pk))

    def test_confirm_requires_provider_paid_status(self):
        from unittest.mock import patch

        self._create()
        payment = Payment.objects.get(order=self.order)
        with patch("apps.payments.cashfree.request", return_value={"order_status": "ACTIVE"}):
            response = self.client.post(
                "/api/payments/confirm/", {"payment_id": payment.pk}, format="json"
            )
        self.assertEqual(response.status_code, 400)
        paid = {
            "order_status": "PAID",
            "order_id": payment.checkout_session_id or f"drivio-{payment.pk}-1",
            "order_amount": 216.0,
            "order_currency": "INR",
            "order_tags": {"order_id": str(self.order.pk)},
        }
        with patch("apps.payments.cashfree.request", return_value=paid):
            response = self.client.post(
                "/api/payments/confirm/", {"payment_id": payment.pk}, format="json"
            )
        self.assertEqual(response.status_code, 200, response.content)
        payment.refresh_from_db()
        self.assertEqual(payment.status, "completed")

    def test_confirm_rejects_amount_mismatch(self):
        from unittest.mock import patch

        self._create()
        payment = Payment.objects.get(order=self.order)
        wrong = {
            "order_status": "PAID",
            "order_id": payment.checkout_session_id,
            "order_amount": 1.0,
            "order_currency": "INR",
            "order_tags": {"order_id": str(self.order.pk)},
        }
        with patch("apps.payments.cashfree.request", return_value=wrong):
            response = self.client.post(
                "/api/payments/confirm/", {"payment_id": payment.pk}, format="json"
            )
        self.assertEqual(response.status_code, 400)

    def test_webhook_rejects_bad_signature_and_accepts_valid(self):
        import base64, hashlib, hmac, json
        from unittest.mock import patch

        self._create()
        payment = Payment.objects.get(order=self.order)
        body = json.dumps(
            {
                "type": "PAYMENT_SUCCESS_WEBHOOK",
                "data": {
                    "order": {"order_id": payment.checkout_session_id},
                    "payment": {"cf_payment_id": 1},
                },
            }
        ).encode()
        bad = self.client.post(
            "/api/payments/cashfree/webhook/",
            body,
            content_type="application/json",
            HTTP_X_WEBHOOK_TIMESTAMP="1",
            HTTP_X_WEBHOOK_SIGNATURE="nope",
        )
        self.assertEqual(bad.status_code, 400)
        sig = base64.b64encode(
            hmac.new(b"secret", b"1" + body, hashlib.sha256).digest()
        ).decode()
        paid = {
            "order_status": "PAID",
            "order_id": payment.checkout_session_id,
            "order_amount": 216.0,
            "order_currency": "INR",
            "order_tags": {"order_id": str(self.order.pk)},
        }
        with patch("apps.payments.cashfree.request", return_value=paid):
            ok = self.client.post(
                "/api/payments/cashfree/webhook/",
                body,
                content_type="application/json",
                HTTP_X_WEBHOOK_TIMESTAMP="1",
                HTTP_X_WEBHOOK_SIGNATURE=sig,
            )
        self.assertEqual(ok.status_code, 200, ok.content)
        payment.refresh_from_db()
        self.assertEqual(payment.status, "completed")
