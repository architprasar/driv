from django.urls import path
from .settlements import EarningsView, ConnectAccountView, RequestPayoutView
from .views import (
    VendorRegisterView, VendorDocumentUploadView, VendorDocumentDownloadView,
    VendorDashboardView, VendorListingsView,
    VendorAnalyticsView, VendorPayoutsView,
)

urlpatterns = [
    path("documents/<int:profile_id>/<str:kind>/", VendorDocumentDownloadView.as_view(), name="vendor-document-download"),
    path("earnings/", EarningsView.as_view(), name="vendor-earnings"),
    path("connect/", ConnectAccountView.as_view(), name="vendor-connect"),
    path("request-payout/", RequestPayoutView.as_view(), name="vendor-request-payout"),
    path("register/", VendorRegisterView.as_view(), name="vendor-register"),
    path("register/documents/", VendorDocumentUploadView.as_view(), name="vendor-docs"),
    path("dashboard/", VendorDashboardView.as_view(), name="vendor-dashboard"),
    path("dashboard/listings/", VendorListingsView.as_view(), name="vendor-listings"),
    path("dashboard/analytics/", VendorAnalyticsView.as_view(), name="vendor-analytics"),
    path("dashboard/payouts/", VendorPayoutsView.as_view(), name="vendor-payouts"),
]
