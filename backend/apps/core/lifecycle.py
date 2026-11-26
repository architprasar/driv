from django.db.models import Q
from django.utils import timezone


def tick_marketplace():
    from apps.auctions.services import advance_due_auctions
    from apps.orders.services import expire_unpaid_orders
    from apps.vendors.models import VendorEarning

    auctions = advance_due_auctions()
    expired = expire_unpaid_orders()
    earnings = VendorEarning.objects.filter(
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
    )
    matured = earnings.update(status="available")
    from apps.notifications.delivery import deliver_due_emails

    emails = deliver_due_emails()
    from django.core.cache import cache

    cache.set("marketplace:lifecycle:last_ok", timezone.now().timestamp(), timeout=300)
    return {
        "emails_sent": emails,
        "auctions_checked": auctions,
        "orders_expired": expired,
        "earnings_matured": matured,
    }
