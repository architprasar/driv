from datetime import timedelta, timezone as dt_timezone
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.orders.models import Order
from .models import Payment, PaymentWebhook, PaymentRefund
from .serializers import (
    ConfirmPaymentSerializer,
    CreatePaymentIntentSerializer,
    EMICalculatorSerializer,
    PaymentSerializer,
)
from . import cashfree
from .services import (
    stripe_client,
    test_enabled,
    active_mode,
    provider_available,
    verify_provider_payment,
    accept_paid_payment,
    ProviderUnavailable,
)


class PaymentConfigView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "mode": active_mode(),
                "available": provider_available(),
                "environment": settings.CASHFREE_ENV,
                "currency": settings.MARKETPLACE_CURRENCY,
            }
        )


class CreatePaymentIntentView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(
            Order.objects.select_for_update(),
            pk=serializer.validated_data["order_id"],
            user=request.user,
        )
        if order.status != "placed":
            return Response(
                {"detail": "Payment can only be initiated for placed orders."},
                status=409,
            )
        if (
            order.reservation_expires_at
            and order.reservation_expires_at <= timezone.now()
        ):
            raise ValidationError(
                "This order reservation has expired. Return to the marketplace to check current availability."
            )
        if (
            order.delivery_method != "pickup"
            and not order.shipping_snapshot
            and not order.shipping_address_id
        ):
            raise ValidationError(
                "Add a delivery address before paying for this order."
            )
        if not order.inventory_reserved:
            raise ValidationError(
                "This older order has no inventory reservation. Start a new checkout to verify current availability."
            )
        mode = active_mode()
        if mode == "stripe" and serializer.validated_data["method"] != "card":
            raise ValidationError(
                "Hosted checkout currently supports card payments. Other payment methods are not enabled."
            )
        payment, created = Payment.objects.get_or_create(
            order=order,
            defaults={
                "method": serializer.validated_data["method"],
                "amount": order.total,
                "currency": order.currency,
                "mode": mode,
                "emi_months": serializer.validated_data.get("emi_months"),
            },
        )
        if not created and payment.status in {
            "completed",
            "partially_refunded",
            "refunded",
        }:
            return Response(
                {"detail": "This order already has a completed payment."}, status=409
            )
        if not created and payment.status == "processing":
            if payment.checkout_url or (
                payment.mode == "test" and payment.stripe_payment_id.startswith("test_")
            ):
                return Response(self.payload(payment))
            return Response(
                {
                    "detail": "Payment is already in progress or completed for this order."
                },
                status=409,
            )
        if not created:
            payment.attempt += 1
        payment.mode, payment.currency, payment.amount = (
            mode,
            order.currency,
            order.total,
        )
        payment.method = serializer.validated_data["method"]
        payment.status = "processing"
        if mode == "test":
            payment.stripe_payment_id = f"test_{payment.pk}_{payment.attempt}"
        elif mode == "cashfree":
            expires = order.reservation_expires_at or timezone.now() + timedelta(
                hours=1
            )
            if expires < timezone.now() + timedelta(minutes=5):
                raise ValidationError(
                    "The remaining payment window is too short. Cancel this unpaid order and start checkout again."
                )
            cf_order_id = f"drivio-{payment.pk}-{payment.attempt}"
            return_url = f"{settings.FRONTEND_URL.rstrip('/')}/profile/orders/{order.pk}?payment=verify"
            phone = "".join(c for c in request.user.phone if c.isdigit())[-10:]
            try:
                cf = cashfree.create_order(
                    order_id=cf_order_id,
                    amount=order.total,
                    currency=payment.currency,
                    customer={
                        "customer_id": f"user-{request.user.pk}",
                        "customer_email": request.user.email,
                        "customer_phone": phone if len(phone) == 10 else "9999999999",
                    },
                    return_url=return_url,
                    notify_url=settings.CASHFREE_NOTIFY_URL,
                    expires_at=expires.astimezone(dt_timezone.utc),
                    tags={"order_id": str(order.pk), "payment_id": str(payment.pk)},
                )
            except cashfree.CashfreeUnavailable as error:
                raise ProviderUnavailable(error.detail) from error
            payment.checkout_session_id = cf_order_id
            payment.payment_session_id = cf["payment_session_id"]
        else:
            stripe = stripe_client()
            expires = order.reservation_expires_at or timezone.now() + timedelta(
                hours=1
            )
            # Stripe requires at least 30 minutes; the inventory hold must cover it.
            if expires < timezone.now() + timedelta(minutes=31):
                raise ValidationError(
                    "The remaining payment window is too short. Cancel this unpaid order and start checkout again."
                )
            try:
                session = stripe.checkout.Session.create(
                    mode="payment",
                    payment_method_types=["card"],
                    customer_email=request.user.email,
                    line_items=[
                        {
                            "price_data": {
                                "currency": payment.currency.lower(),
                                "unit_amount": int(order.total * 100),
                                "product_data": {
                                    "name": f"DrivioCars order {order.order_number}"
                                },
                            },
                            "quantity": 1,
                        }
                    ],
                    metadata={"order_id": str(order.pk), "payment_id": str(payment.pk)},
                    payment_intent_data={
                        "metadata": {
                            "order_id": str(order.pk),
                            "payment_id": str(payment.pk),
                        }
                    },
                    success_url=f"{settings.FRONTEND_URL.rstrip('/')}/profile/orders/{order.pk}?payment=verify",
                    cancel_url=f"{settings.FRONTEND_URL.rstrip('/')}/profile/orders/{order.pk}?payment=cancelled",
                    expires_at=int(expires.timestamp()),
                    idempotency_key=f"checkout-{payment.pk}-{payment.attempt}",
                )
            except stripe.StripeError as error:
                raise ProviderUnavailable() from error
            payment.checkout_session_id, payment.checkout_url = session.id, session.url
        payment.save()
        return Response(self.payload(payment))

    @staticmethod
    def payload(payment):
        return {
            "payment": PaymentSerializer(payment).data,
            "order_status": "placed",
            "mode": payment.mode,
            "checkout_url": payment.checkout_url or None,
            "payment_session_id": payment.payment_session_id or None,
            "requires_confirmation": payment.mode == "test",
        }


class ConfirmPaymentView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = get_object_or_404(
            Payment.objects.select_related("order"),
            pk=serializer.validated_data["payment_id"],
            order__user=request.user,
        )
        Order.objects.select_for_update().get(pk=payment.order_id)
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status in {"completed", "partially_refunded", "refunded"}:
            return Response(
                {
                    "payment": PaymentSerializer(payment).data,
                    "order": {
                        "id": payment.order_id,
                        "status": payment.order.status,
                        "order_number": payment.order.order_number,
                    },
                }
            )
        if payment.status not in {"pending", "processing"}:
            return Response(
                {"detail": "Only pending or processing payments can be confirmed."},
                status=409,
            )
        if payment.mode == "test":
            if not test_enabled() or not payment.stripe_payment_id.startswith("test_"):
                raise ValidationError(
                    "Test payment confirmation is not enabled for this payment."
                )
            if serializer.validated_data.get("result") == "decline":
                payment.status = "failed"
                payment.save(update_fields=["status"])
                return Response(
                    {
                        "detail": "Test payment declined. Your order is saved and can be retried.",
                        "payment": PaymentSerializer(payment).data,
                    },
                    status=402,
                )
            if (
                payment.order.reservation_expires_at
                and payment.order.reservation_expires_at <= timezone.now()
            ):
                raise ValidationError("This payment reservation has expired.")
        else:
            verify_provider_payment(payment)
        order = accept_paid_payment(payment)
        payment.refresh_from_db()
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "order": {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                },
            }
        )


class CashfreeWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        if not cashfree.configured():
            raise ProviderUnavailable("The payment webhook is not configured.")
        if not cashfree.valid_signature(
            request.body,
            request.headers.get("x-webhook-timestamp", ""),
            request.headers.get("x-webhook-signature", ""),
        ):
            return Response({"detail": "Invalid webhook signature."}, status=400)
        event = request.data if isinstance(request.data, dict) else {}
        data = event.get("data") or {}
        cf_order_id = (data.get("order") or {}).get("order_id", "")
        cf_payment = (data.get("payment") or {}).get("cf_payment_id", "")
        event_type = event.get("type", "")
        with transaction.atomic():
            _, created = PaymentWebhook.objects.get_or_create(
                event_id=f"cf-{event_type}-{cf_order_id}-{cf_payment}"[:150],
                defaults={"event_type": event_type[:100]},
            )
            if not created:
                return Response({"received": True})
            payment = Payment.objects.filter(
                checkout_session_id=cf_order_id, mode="cashfree"
            ).first()
            if payment:
                Order.objects.select_for_update().get(pk=payment.order_id)
                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if event_type == "PAYMENT_SUCCESS_WEBHOOK":
                    # Re-verify with Cashfree rather than trusting the payload.
                    verify_provider_payment(payment)
                    accept_paid_payment(payment)
                elif (
                    event_type in {"PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"}
                    and payment.status == "processing"
                ):
                    payment.status = "failed"
                    payment.save(update_fields=["status"])
        return Response({"received": True})


class StripeWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise ProviderUnavailable("The payment webhook is not configured.")
        stripe = stripe_client()
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                request.headers.get("Stripe-Signature", ""),
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.SignatureVerificationError):
            return Response({"detail": "Invalid webhook signature."}, status=400)
        with transaction.atomic():
            _, created = PaymentWebhook.objects.get_or_create(
                event_id=event.id, defaults={"event_type": event.type}
            )
            if not created:
                return Response({"received": True})
            obj = event.data.object
            if event.type in {
                "checkout.session.completed",
                "checkout.session.async_payment_succeeded",
            }:
                payment = Payment.objects.filter(
                    checkout_session_id=obj.id, mode="stripe"
                ).first()
                if payment:
                    Order.objects.select_for_update().get(pk=payment.order_id)
                    payment = Payment.objects.select_for_update().get(pk=payment.pk)
                if not payment and obj.metadata.get("payment_id"):
                    raise ProviderUnavailable(
                        "The payment record is not ready. Retry this event."
                    )
                if payment and obj.payment_status == "paid":
                    verify_provider_payment(payment)
                    accept_paid_payment(payment)
            elif event.type in {
                "checkout.session.expired",
                "checkout.session.async_payment_failed",
            }:
                Payment.objects.filter(
                    checkout_session_id=obj.id, status="processing"
                ).update(status="failed")
            elif event.type in {"refund.updated", "refund.failed"}:
                candidate = (
                    PaymentRefund.objects.select_related("payment")
                    .filter(provider_id=obj.id)
                    .first()
                )
                if candidate:
                    try:
                        current = stripe.Refund.retrieve(obj.id)
                    except stripe.StripeError as error:
                        raise ProviderUnavailable(
                            "The refund status could not be verified. Retry this event."
                        ) from error
                    Order.objects.select_for_update().get(pk=candidate.payment.order_id)
                    payment = Payment.objects.select_for_update().get(
                        pk=candidate.payment_id
                    )
                    refund = (
                        PaymentRefund.objects.select_for_update()
                        .filter(pk=candidate.pk, provider_id=obj.id)
                        .first()
                    )
                    if refund:
                        previous = refund.status
                        refund.status = current.status
                        refund.save(update_fields=["status"])
                        failed = {"failed", "canceled"}
                        if (previous in failed) != (current.status in failed):
                            delta = (
                                -refund.amount
                                if current.status in failed
                                else refund.amount
                            )
                            payment.refunded_amount = min(
                                payment.amount,
                                max(Decimal(0), payment.refunded_amount + delta),
                            )
                            payment.status = (
                                "refunded"
                                if payment.refunded_amount >= payment.amount
                                else "partially_refunded"
                                if payment.refunded_amount
                                else "completed"
                            )
                            payment.save(update_fields=["refunded_amount", "status"])
                        if refund.key.startswith("return-"):
                            from apps.orders.models import ReturnRequest

                            state = (
                                "refund_failed"
                                if current.status in failed
                                else "refunded"
                                if current.status == "succeeded"
                                else "refund_pending"
                            )
                            ReturnRequest.objects.filter(
                                pk=refund.key.split("-")[-1]
                            ).update(status=state)
        return Response({"received": True})


class EMICalculatorView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        serializer = EMICalculatorSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        principal, annual_rate, months = (
            float(d["principal"]),
            float(d.get("rate", 8.5)),
            int(d["tenure_months"]),
        )
        rate = annual_rate / 1200
        emi = (
            principal * rate * (1 + rate) ** months / ((1 + rate) ** months - 1)
            if rate > 0
            else principal / months
        )
        return Response(
            {
                "emi": round(emi, 2),
                "total_payment": round(emi * months, 2),
                "total_interest": round(emi * months - principal, 2),
                "principal": principal,
                "rate": annual_rate,
                "tenure_months": months,
            }
        )
