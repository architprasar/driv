"""Fail the launch check with actionable configuration errors, never secret values."""

from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
from django.conf import settings
from django.core.checks import Error, register


@register(deploy=True)
def marketplace_launch_checks(app_configs, **kwargs):
    errors = []

    def require(condition, code, message):
        if not condition:
            errors.append(Error(message, id=f"marketplace.{code}"))

    require(not settings.DEBUG, "E001", "Set DJANGO_DEBUG=False for a public launch.")
    require(
        len(settings.SECRET_KEY) >= 50
        and not settings.SECRET_KEY.startswith("django-insecure")
        and "replace-with" not in settings.SECRET_KEY,
        "E002",
        "Set a strong, private DJANGO_SECRET_KEY.",
    )
    require(
        settings.PAYMENTS_MODE == "stripe"
        and settings.STRIPE_SECRET_KEY.startswith(("sk_live_", "rk_live_"))
        and settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_"),
        "E003",
        "Configure provider checkout and signed webhooks; local test checkout cannot be launched publicly.",
    )
    require(
        urlparse(settings.FRONTEND_URL).scheme == "https"
        and urlparse(settings.FRONTEND_URL).hostname
        not in {"localhost", "127.0.0.1", None}
        and "replace-with" not in settings.FRONTEND_URL,
        "E004",
        "Set FRONTEND_URL to the public HTTPS website.",
    )
    require(
        settings.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql",
        "E005",
        "Use PostgreSQL with row locking for concurrent marketplace transactions.",
    )
    require(
        "redis" in settings.CACHES["default"]["BACKEND"].lower(),
        "E006",
        "Configure shared Redis cache for multi-process throttling and worker health.",
    )
    require(
        "console" not in settings.EMAIL_BACKEND
        and "locmem" not in settings.EMAIL_BACKEND
        and "dummy" not in settings.EMAIL_BACKEND
        and "filebased" not in settings.EMAIL_BACKEND,
        "E007",
        "Configure a delivering email backend; account recovery and order emails need real transport.",
    )
    require(
        bool(getattr(settings, "CSRF_TRUSTED_ORIGINS", [])),
        "E008",
        "Set CSRF_TRUSTED_ORIGINS for the public admin and website origins.",
    )
    require("*" not in settings.ALLOWED_HOSTS, "E009", "Set explicit allowed hosts.")
    try:
        valid = (
            Decimal("0") <= Decimal(settings.MARKETPLACE_TAX_RATE) <= Decimal("1")
            and Decimal(settings.MARKETPLACE_EXPRESS_FEE) >= 0
        )
    except (InvalidOperation, ValueError):
        valid = False
    require(
        valid,
        "E010",
        "Configure a tax rate between zero and one and a non-negative delivery fee.",
    )
    require(
        bool(settings.LEGAL_BUSINESS_NAME.strip())
        and bool(settings.LEGAL_BUSINESS_ADDRESS.strip())
        and "replace-with" not in settings.LEGAL_BUSINESS_NAME,
        "E011",
        "Configure the operator business name and contact address before public launch.",
    )
    if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend"):
        require(
            bool(settings.EMAIL_HOST) and "replace-with" not in settings.EMAIL_HOST,
            "E012",
            "Configure the SMTP host and a verified sender before launch.",
        )
    from pathlib import Path

    require(
        not Path(settings.PRIVATE_MEDIA_ROOT)
        .resolve()
        .is_relative_to(Path(settings.MEDIA_ROOT).resolve()),
        "E013",
        "Private identity documents must be stored outside publicly served media.",
    )
    require(
        settings.REQUIRE_VERIFIED_EMAIL_FOR_BIDDING,
        "E014",
        "Require verified customer email addresses for public auction bidding.",
    )
    require(
        urlparse(settings.FRONTEND_URL).hostname in settings.ALLOWED_HOSTS,
        "E015",
        "Include the public frontend host in DJANGO_ALLOWED_HOSTS for gateway and media URLs.",
    )
    return errors
