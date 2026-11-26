"""Small dependency probes, without configuration or customer-data disclosure."""

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def live(request):
    return JsonResponse({"status": "ok"})


@require_GET
def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        heartbeat = cache.get("marketplace:lifecycle:last_ok")
        if getattr(settings, "REQUIRE_WORKER_HEALTH", not settings.DEBUG) and (
            not heartbeat or timezone.now().timestamp() - heartbeat > 120
        ):
            return JsonResponse({"status": "unavailable"}, status=503)
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready"})


@require_GET
def policies(request):
    return JsonResponse(
        {
            "currency": settings.MARKETPLACE_CURRENCY,
            "return_window_days": settings.RETURN_WINDOW_DAYS,
            "reservation_minutes": settings.CART_RESERVATION_MINUTES,
            "auction_payment_hours": settings.AUCTION_PAYMENT_HOURS,
            "express_fee": settings.MARKETPLACE_EXPRESS_FEE,
            "operator_name": getattr(settings, "LEGAL_BUSINESS_NAME", ""),
            "operator_address": getattr(settings, "LEGAL_BUSINESS_ADDRESS", ""),
        }
    )
