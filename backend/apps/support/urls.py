from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HelpCategoryViewSet, HelpArticleViewSet, SupportTicketViewSet, TestimonialListView

router = DefaultRouter()
router.register("categories", HelpCategoryViewSet, basename="help-category")
router.register("articles", HelpArticleViewSet, basename="help-article")
router.register("tickets", SupportTicketViewSet, basename="support-ticket")

urlpatterns = [
    path("testimonials/", TestimonialListView.as_view(), name="testimonials"),
    path("", include(router.urls)),
]
