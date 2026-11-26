from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, SellerSaleView, ConfirmReceiptView, ReturnsViewSet

router = DefaultRouter()
router.register("returns", ReturnsViewSet, basename="return-request")
router.register("", OrderViewSet, basename="order")
urlpatterns = [
    path("sales/<int:pk>/", SellerSaleView.as_view(), name="seller-sale"),
    path("items/<int:pk>/received/", ConfirmReceiptView.as_view(), name="confirm-item-receipt"),
    path("", include(router.urls)),
]
