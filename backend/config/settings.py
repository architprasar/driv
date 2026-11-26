"""
DrivioCars Backend — Django Settings
"""
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-driviocars-dev-key-change-in-production-2024",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ── Installed Apps ──────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Wagtail CMS (editor UI at /cms/)
    "wagtail.contrib.settings",
    "wagtail.contrib.redirects",
    "wagtail.embeds",
    "wagtail.sites",
    "wagtail.users",
    "wagtail.snippets",
    "wagtail.documents",
    "wagtail.images",
    "wagtail.search",
    "wagtail.admin",
    "wagtail",
    "modelcluster",
    "taggit",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "storages",
    "django_celery_beat",
    # Project apps
    "apps.core",
    "apps.accounts",
    "apps.cars",
    "apps.auctions",
    "apps.parts",
    "apps.cart",
    "apps.orders",
    "apps.payments",
    "apps.vendors",
    "apps.inspections",
    "apps.valuations",
    "apps.notifications",
    "apps.search",
    "apps.support",
    "apps.cms",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WAGTAIL_SITE_NAME = "DrivioCars"
WAGTAILADMIN_BASE_URL = os.environ.get("WAGTAILADMIN_BASE_URL", "http://localhost:8001")
WAGTAILIMAGES_EXTENSIONS = ["gif", "jpg", "jpeg", "png", "webp"]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ── Database ────────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": os.environ.get("DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.environ.get("DB_NAME", BASE_DIR / "db.sqlite3"),
        "USER": os.environ.get("DB_USER", ""),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", ""),
        "PORT": os.environ.get("DB_PORT", ""),
    }
}

# ── Auth ────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalization ────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static / Media ─────────────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", BASE_DIR / "media")
PRIVATE_MEDIA_ROOT = os.environ.get("PRIVATE_MEDIA_ROOT", BASE_DIR / "private-media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS ────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002",
).split(",")

# ── Django REST Framework ───────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_PARSER_CLASSES": ["apps.core.parsers.ObjectJSONParser", "rest_framework.parsers.FormParser", "rest_framework.parsers.MultiPartParser"],
    "EXCEPTION_HANDLER": "apps.core.exceptions.marketplace_exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ── SimpleJWT ───────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "CHECK_REVOKE_TOKEN": True,
    "TOKEN_REFRESH_SERIALIZER": "apps.accounts.serializers.SessionRefreshSerializer",
}

# ── drf-spectacular ─────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "DrivioCars API",
    "DESCRIPTION": "Full-stack automotive marketplace API powering DrivioCars",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"],
    # Schema diagnostics are separate from the runtime launch gate.
    "ENABLE_DJANGO_DEPLOY_CHECK": False,
}

# ── Channels ────────────────────────────────────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
        # For production, use:
        # "BACKEND": "channels_redis.core.RedisChannelLayer",
        # "CONFIG": {"hosts": [os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")]},
    }
}

# ── Celery ──────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# ── Email / Frontend URLs ──────────────────────────────────────────────
SITE_NAME = os.environ.get("SITE_NAME", "DrivioCars")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@driviocars.com")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "DrivioCars <no-reply@driviocars.com>")
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False").lower() in ("true", "1", "yes")

# ── Stripe ──────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# ── Cashfree (set PAYMENTS_MODE=cashfree to use it) ────────────────────
CASHFREE_APP_ID = os.environ.get("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.environ.get("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = os.environ.get("CASHFREE_ENV", "sandbox")
CASHFREE_API_VERSION = os.environ.get("CASHFREE_API_VERSION", "2025-01-01")
# Public https URL Cashfree can call (e.g. an ngrok tunnel); empty disables webhooks.
CASHFREE_NOTIFY_URL = os.environ.get("CASHFREE_NOTIFY_URL", "")

# Marketplace policy. Values are configuration, not client-provided prices.
MARKETPLACE_CURRENCY = os.environ.get("MARKETPLACE_CURRENCY", "INR")
MARKETPLACE_TAX_RATE = os.environ.get("MARKETPLACE_TAX_RATE", "0.08")
MARKETPLACE_EXPRESS_FEE = os.environ.get("MARKETPLACE_EXPRESS_FEE", "25.00")
CART_RESERVATION_MINUTES = int(os.environ.get("CART_RESERVATION_MINUTES", "35"))
AUCTION_PAYMENT_HOURS = int(os.environ.get("AUCTION_PAYMENT_HOURS", "24"))
RETURN_WINDOW_DAYS = int(os.environ.get("RETURN_WINDOW_DAYS", "7"))
PAYMENTS_MODE = os.environ.get("PAYMENTS_MODE", "test" if DEBUG else "stripe")
CELERY_BEAT_SCHEDULE = {"marketplace-lifecycle": {"task": "apps.core.tasks.tick_marketplace", "schedule": 10.0}}

STRIPE_CONNECT_COUNTRY = os.environ.get("STRIPE_CONNECT_COUNTRY", "IN")

if os.environ.get("REDIS_URL"):
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": [os.environ["REDIS_URL"]]}}}

# Shared cache backs API throttles in production; local development stays standalone.
if os.environ.get("REDIS_URL"):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": os.environ["REDIS_URL"]}}
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"]
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"anon": "300/min", "user": "1200/min", "auth": "30/min", "recovery": "10/hour"}
EMAIL_TIMEOUT = 10
PASSWORD_RESET_TIMEOUT = 3600
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
CSRF_TRUSTED_ORIGINS = [origin for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if origin]

LEGAL_BUSINESS_NAME = os.environ.get("LEGAL_BUSINESS_NAME", "")
LEGAL_BUSINESS_ADDRESS = os.environ.get("LEGAL_BUSINESS_ADDRESS", "")

EMAIL_FILE_PATH = os.environ.get("EMAIL_FILE_PATH", BASE_DIR / "mail")
REQUIRE_WORKER_HEALTH = os.environ.get("REQUIRE_WORKER_HEALTH", "False" if DEBUG else "True").lower() in ("true", "1", "yes")

REQUIRE_VERIFIED_EMAIL_FOR_BIDDING = os.environ.get("REQUIRE_VERIFIED_EMAIL_FOR_BIDDING", "False" if DEBUG else "True").lower() in ("true", "1", "yes")
