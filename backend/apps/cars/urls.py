from apps.core.listing_media import CarListingImageView
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .commerce import EnquiryListView, EnquiryDetailView, SavedCarListView, SavedCarView
from .views import CarViewSet, CarBrandViewSet, CarImageUploadView

router = DefaultRouter()
router.register("brands", CarBrandViewSet, basename="brand")
router.register("", CarViewSet, basename="car")

urlpatterns = [
    path("<int:listing_id>/images/<int:image_id>/", CarListingImageView.as_view()),
    path("enquiries/", EnquiryListView.as_view(), name="car-enquiries"),
    path("enquiries/<int:pk>/", EnquiryDetailView.as_view(), name="car-enquiry-detail"),
    path("saved/", SavedCarListView.as_view(), name="saved-cars"),
    path("<int:pk>/save/", SavedCarView.as_view(), name="save-car"),
    path("<int:car_id>/images/", CarImageUploadView.as_view(), name="car-image-upload"),
    path("", include(router.urls)),
]
