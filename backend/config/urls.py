"""DrivioCars — Root URL Configuration."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from wagtail.admin import urls as wagtailadmin_urls
from wagtail import urls as wagtail_urls
from wagtail.documents import urls as wagtaildocs_urls
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.health import live, ready, policies

urlpatterns = [
    path("api/policies/", policies),
    path("api/health/live/", live),
    path("api/health/ready/", ready),
    path("admin/", admin.site.urls),
    path("cms/", include(wagtailadmin_urls)),
    path("cms-documents/", include(wagtaildocs_urls)),
    path("api/cms/", include("apps.cms.urls")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # App APIs
    path("api/auth/", include("apps.accounts.urls")),
    # Backward-compatible alias used by some frontend screens
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/cars/", include("apps.cars.urls")),
    path("api/auctions/", include("apps.auctions.urls")),
    path("api/parts/", include("apps.parts.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/vendors/", include("apps.vendors.urls")),
    path("api/inspections/", include("apps.inspections.urls")),
    path("api/valuations/", include("apps.valuations.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/saved-searches/", include("apps.search.urls")),
    path("api/support/", include("apps.support.urls")),
    path("api/dashboard/", include("apps.core.urls")),
    # Backward-compatible alias used by some frontend screens
    path("api/core/", include("apps.core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Wagtail page serving (previews redirect to the Next.js site); keep last.
urlpatterns += [path("site/", include(wagtail_urls))]
