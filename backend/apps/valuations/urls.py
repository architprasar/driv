from django.urls import path
from .views import CreateValuationView, ValuationDetailView, VehicleHistoryView

urlpatterns = [
    path("", CreateValuationView.as_view(), name="create-valuation"),
    path("<int:pk>/", ValuationDetailView.as_view(), name="valuation-detail"),
    path("history/<str:vin>/", VehicleHistoryView.as_view(), name="vehicle-history"),
]
