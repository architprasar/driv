"""Eligible earnings, connected-account onboarding and retry-safe transfers."""

from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import views, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.payments.services import stripe_client, test_enabled, ProviderUnavailable
from .models import VendorProfile, VendorEarning, VendorPayout, VendorActivity
from .serializers import VendorPayoutSerializer


def account_state(profile):
    if test_enabled():
        return {
            "mode": "test",
            "connected": profile.stripe_account_id.startswith("test_account_"),
            "requires_live_setup": False,
        }
    if not profile.stripe_account_id or profile.stripe_account_id.startswith("test_"):
        return {"mode": "stripe", "connected": False, "requires_live_setup": True}
    stripe = stripe_client()
    try:
        account = stripe.Account.retrieve(profile.stripe_account_id)
    except stripe.StripeError as error:
        raise ProviderUnavailable() from error
    return {
        "mode": "stripe",
        "connected": bool(
            account.payouts_enabled
            and account.capabilities.get("transfers") == "active"
        ),
        "requires_live_setup": not account.details_submitted,
    }


class EarningsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.core.lifecycle import tick_marketplace

        # Only mature this seller's eligible earnings; do not trigger other owners' auctions.
        VendorEarning.objects.filter(
            seller=request.user,
            status="pending",
            available_at__lte=timezone.now(),
            item__fulfillment_status="delivered",
        ).exclude(
            item__return_request__status__in=[
                "requested",
                "approved",
                "received",
                "refunded",
            ]
        ).update(status="available")
        profile = VendorProfile.objects.filter(user=request.user).first()
        balances = list(
            VendorEarning.objects.filter(seller=request.user)
            .values("currency", "status")
            .annotate(amount=Sum("amount"))
            .order_by("currency", "status")
        )
        return Response(
            {
                "balances": [{**row, "amount": str(row["amount"])} for row in balances],
                "account": account_state(profile) if profile else None,
                "vendor_verified": bool(
                    profile and profile.verification_status == "verified"
                ),
            }
        )


class ConnectAccountView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = get_object_or_404(VendorProfile, user=request.user)
        if test_enabled():
            profile.stripe_account_id = f"test_account_{profile.pk}"
            profile.save(update_fields=["stripe_account_id"])
            return Response({"mode": "test", "connected": True})
        stripe = stripe_client()
        try:
            if not profile.stripe_account_id or profile.stripe_account_id.startswith(
                "test_"
            ):
                account = stripe.Account.create(
                    type="express",
                    country=getattr(settings, "STRIPE_CONNECT_COUNTRY", "IN"),
                    email=profile.business_email,
                    capabilities={"transfers": {"requested": True}},
                    metadata={"vendor_id": str(profile.pk)},
                    idempotency_key=f"vendor-connect-{profile.pk}",
                )
                profile.stripe_account_id = account.id
                profile.save(update_fields=["stripe_account_id"])
            link = stripe.AccountLink.create(
                account=profile.stripe_account_id,
                type="account_onboarding",
                refresh_url=f"{settings.FRONTEND_URL.rstrip('/')}/vendor/dashboard/payouts?connect=retry",
                return_url=f"{settings.FRONTEND_URL.rstrip('/')}/vendor/dashboard/payouts?connect=returned",
            )
        except stripe.StripeError as error:
            raise ProviderUnavailable(
                "Connected-account onboarding is not available. Check the payment account configuration or contact support."
            ) from error
        return Response({"mode": "stripe", "url": link.url})


class RequestPayoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = get_object_or_404(VendorProfile, user=request.user)
        if profile.verification_status != "verified":
            raise ValidationError(
                "Complete business verification before requesting settlements."
            )
        key = request.data.get("request_key")
        if not isinstance(key, str) or not 8 <= len(key) <= 80:
            raise ValidationError("Provide a unique settlement request key.")
        state = account_state(profile)
        if not state["connected"]:
            raise ValidationError("Connect your settlement account first.")
        currency = str(
            request.data.get("currency", settings.MARKETPLACE_CURRENCY)
        ).upper()
        with transaction.atomic():
            payout = (
                VendorPayout.objects.select_for_update().filter(request_key=key).first()
            )
            if payout and payout.vendor_id != profile.pk:
                raise ValidationError("This settlement request key is already in use.")
            if not payout:
                earnings = list(
                    VendorEarning.objects.select_for_update(of=("self",))
                    .filter(
                        seller=request.user,
                        currency=currency,
                        status="available",
                        payout__isnull=True,
                    )
                    .exclude(
                        item__return_request__status__in=[
                            "requested",
                            "approved",
                            "received",
                            "refunded",
                        ]
                    )
                )
                amount = sum((earning.amount for earning in earnings), Decimal(0))
                if amount <= 0:
                    raise ValidationError(
                        "There are no eligible earnings in this currency yet."
                    )
                payout = VendorPayout.objects.create(
                    vendor=profile,
                    amount=amount,
                    currency=currency,
                    request_key=key,
                    mode=state["mode"],
                )
                VendorEarning.objects.filter(pk__in=[e.pk for e in earnings]).update(
                    payout=payout, status="processing"
                )
        # The request record is committed before the provider call. Network retries use
        # its stable ID, so a lost provider response cannot create a second transfer.
        if payout.status == "completed":
            return Response(VendorPayoutSerializer(payout).data)
        if state["mode"] == "test":
            reference = f"test_transfer_{payout.pk}"
        else:
            stripe = stripe_client()
            try:
                transfer = stripe.Transfer.create(
                    amount=int(payout.amount * 100),
                    currency=payout.currency.lower(),
                    destination=profile.stripe_account_id,
                    metadata={"payout_id": str(payout.pk)},
                    idempotency_key=f"settlement-{payout.pk}",
                )
                reference = transfer.id
            except stripe.StripeError as error:
                raise ProviderUnavailable(
                    "The transfer could not be completed. This request is saved; retry it without creating a new request."
                ) from error
        with transaction.atomic():
            payout = VendorPayout.objects.select_for_update().get(pk=payout.pk)
            if payout.status != "completed":
                payout.status = "completed"
                payout.transfer_reference = reference
                payout.save(update_fields=["status", "transfer_reference"])
                payout.earnings.update(status="paid")
                VendorActivity.objects.create(
                    vendor=profile,
                    event_type="settlement_transferred",
                    description=f"{'Test settlement' if state['mode'] == 'test' else 'Connected-account transfer'} of {payout.amount} {payout.currency} completed.",
                )
        return Response(VendorPayoutSerializer(payout).data)
