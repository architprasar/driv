from apps.core.listing_media import PartListingImageView
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PartViewSet,
    PartCategoryViewSet,
    PartImageUploadView,
    PartReviewView,
    PartQuestionListView,
    PartQuestionDetailView,
)

router = DefaultRouter()
router.register("categories", PartCategoryViewSet, basename="part-category")
router.register("", PartViewSet, basename="part")

urlpatterns = [
    path("<int:listing_id>/images/<int:image_id>/", PartListingImageView.as_view()),
    path("questions/", PartQuestionListView.as_view(), name="part-questions"),
    path(
        "questions/<int:pk>/",
        PartQuestionDetailView.as_view(),
        name="part-question-detail",
    ),
    path("<int:part_id>/reviews/", PartReviewView.as_view(), name="part-reviews"),
    path(
        "<int:part_id>/images/", PartImageUploadView.as_view(), name="part-image-upload"
    ),
    path("", include(router.urls)),
]
