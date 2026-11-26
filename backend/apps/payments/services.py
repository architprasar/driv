"""Provider-verified checkout and idempotent refunds."""

from decimal import Decimal
from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError, APIException
from . import cashfree
from .models import Payment, PaymentRefund


class ProviderUnavailable(APIException):
    status_code = 503
    default_detail = "The payment provider is unavailable. Your order is saved; try again from your orders page."


def stripe_client():
    if not settings.STRIPE_SECRET_KEY:
        raise ProviderUnavailable(
            "Live checkout is not configured. Contact support; no payment has been collected."
        )
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    stripe.max_network_retries = 2
    return stripe


def test_enabled():
    """Simulated checkout: local development, or an explicitly labelled public demo."""
    demo = getattr(settings, "DEMO_MODE", False)
    return (settings.DEBUG or demo) and settings.PAYMENTS_MODE == "test"


def active_mode():
    if test_enabled():
        return "test"
    return "cashfree" if settings.PAYMENTS_MODE == "cashfree" else "stripe"


def provider_available():
    mode = active_mode()
    if mode == "test":
        return True
    return cashfree.configured() if mode == "cashfree" else bool(settings.STRIPE_SECRET_KEY)


def verify_cashfree_payment(payment, require_paid=True):
    if not payment.checkout_session_id:
        raise ValidationError("No provider checkout is associated with this payment.")
    try:
        order = cashfree.get_order(payment.checkout_session_id)
    except cashfree.CashfreeUnavailable as error:
        raise ProviderUnavailable(error.detail) from error
    if order.get("order_status") != "PAID":
        if require_paid:
            raise ValidationError("Payment has not been confirmed by the provider yet.")
        return False
    tags = order.get("order_tags") or {}
    if (
        Decimal(str(order.get("order_amount", "0"))) != payment.amount
        or str(order.get("order_currency", "")).upper() != payment.currency.upper()
        or str(tags.get("order_id", "")) != str(payment.order_id)
        or order.get("order_id") != payment.checkout_session_id
    ):
        raise ValidationError(
            "Provider payment details do not match this order. Contact support."
        )
    return True


def verify_provider_payment(payment, require_paid=True):
    if payment.mode == "cashfree":
        return verify_cashfree_payment(payment, require_paid)
    stripe = stripe_client()
    try:
        if payment.checkout_session_id:
            session = stripe.checkout.Session.retrieve(payment.checkout_session_id)
            paid = session.payment_status == "paid"
            amount, currency = session.amount_total, session.currency
            order_id = str(session.metadata.get("order_id", ""))
            if session.payment_intent:
                payment.stripe_payment_id = session.payment_intent
                payment.save(update_fields=["stripe_payment_id"])
        elif payment.stripe_payment_id.startswith("pi_"):
            intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_id)
            paid = intent.status == "succeeded"
            amount, currency = intent.amount_received, intent.currency
            order_id = str(intent.metadata.get("order_id", ""))
        else:
            raise ValidationError(
                "No provider checkout is associated with this payment."
            )
    except stripe.StripeError as error:
        raise ProviderUnavailable() from error
    if not paid:
        if require_paid:
            raise ValidationError("Payment has not been confirmed by the provider yet.")
        return False
    if (
        amount != int(payment.amount * 100)
        or currency.upper() != payment.currency.upper()
        or order_id != str(payment.order_id)
    ):
        raise ValidationError(
            "Provider payment details do not match this order. Contact support."
        )
    return True


def cancel_checkout_session(payment):
    if not payment.checkout_session_id:
        raise ValidationError(
            "An existing payment is still processing. Contact support before cancelling."
        )
    if payment.mode == "cashfree":
        try:
            if cashfree.get_order(payment.checkout_session_id).get("order_status") == "PAID":
                raise ValidationError(
                    "Payment has completed. Refresh the order before requesting a cancellation."
                )
            cashfree.terminate_order(payment.checkout_session_id)
        except cashfree.CashfreeUnavailable as error:
            raise ProviderUnavailable(error.detail) from error
        payment.status = "failed"
        payment.save(update_fields=["status"])
        return
    stripe = stripe_client()
    try:
        session = stripe.checkout.Session.retrieve(payment.checkout_session_id)
        if session.payment_status == "paid":
            raise ValidationError(
                "Payment has completed. Refresh the order before requesting a cancellation."
            )
        if session.status == "open":
            stripe.checkout.Session.expire(payment.checkout_session_id)
    except stripe.StripeError as error:
        raise ProviderUnavailable() from error
    payment.status = "failed"
    payment.save(update_fields=["status"])


@transaction.atomic
def refund_payment(payment, amount, key, reason):
    from apps.orders.models import Order

    Order.objects.select_for_update().get(pk=payment.order_id)
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    existing = PaymentRefund.objects.filter(key=key).first()
    if existing and existing.status not in {"failed", "canceled"}:
        return existing
    attempt = existing.attempt + 1 if existing else 1
    remaining = payment.amount - payment.refunded_amount
    amount = min(Decimal(amount), remaining)
    if amount <= 0:
        raise ValidationError("There is no refundable balance remaining.")
    provider_id = ""
    state = "succeeded"
    if payment.mode == "test":
        if not test_enabled():
            raise ValidationError("Test refunds are disabled in this environment.")
        provider_id = f"test-refund-{key}"
    elif payment.mode == "cashfree":
        refund_id = f"{key}-{attempt}"[:40]
        try:
            result = cashfree.create_refund(
                payment.checkout_session_id, refund_id, amount, reason or "Refund"
            )
        except cashfree.CashfreeUnavailable as error:
            raise ProviderUnavailable(
                "The provider could not initiate this refund. No order state was changed; retry or contact support."
            ) from error
        provider_id = result.get("cf_refund_id") or refund_id
        state = {"SUCCESS": "succeeded", "CANCELLED": "canceled"}.get(
            result.get("refund_status"), "pending"
        )
        if state == "canceled":
            raise ValidationError(
                "The refund was not accepted by the provider. Contact support."
            )
    else:
        stripe = stripe_client()
        try:
            result = stripe.Refund.create(
                payment_intent=payment.stripe_payment_id,
                amount=int(amount * 100),
                metadata={"order_id": str(payment.order_id), "refund_key": key},
                idempotency_key=f"{key}-{attempt}",
            )
        except stripe.StripeError as error:
            raise ProviderUnavailable(
                "The provider could not initiate this refund. No order state was changed; retry or contact support."
            ) from error
        provider_id, state = result.id, result.status
        if state in {"failed", "canceled"}:
            raise ValidationError(
                "The refund was not accepted by the provider. Contact support."
            )
    if existing:
        existing.attempt = attempt
        existing.amount = amount
        existing.provider_id = provider_id
        existing.status = state
        existing.save(update_fields=["attempt", "amount", "provider_id", "status"])
        refund = existing
    else:
        refund = PaymentRefund.objects.create(
            payment=payment,
            key=key,
            amount=amount,
            reason=reason,
            provider_id=provider_id,
            status=state,
        )
    payment.refunded_amount += amount
    payment.status = (
        "refunded"
        if payment.refunded_amount >= payment.amount
        else "partially_refunded"
    )
    payment.save(update_fields=["refunded_amount", "status"])
    return refund


def accept_paid_payment(payment):
    from apps.orders.services import complete_payment

    if payment.status in {"completed", "refunded", "partially_refunded"}:
        return payment.order
    if payment.order.status == "cancelled" or payment.order.inventory_released:
        payment.status = "completed"
        payment.save(update_fields=["status"])
        refund_payment(
            payment,
            payment.amount - payment.refunded_amount,
            f"late-payment-{payment.pk}",
            "Payment arrived after the inventory reservation ended.",
        )
        return payment.order
    return complete_payment(payment)
