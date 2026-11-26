from django.urls import path

from .views import ContentPageView, HomeView, PartsPageView, SiteSettingsView

urlpatterns = [
    path("site/", SiteSettingsView.as_view(), name="cms-site"),
    path("home/", HomeView.as_view(), name="cms-home"),
    path("parts/", PartsPageView.as_view(), name="cms-parts"),
    path("pages/<slug:slug>/", ContentPageView.as_view(), name="cms-page"),
]
