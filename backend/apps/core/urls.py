from django.urls import path
from .workspace import WorkspaceView, WorkspaceListingView
from .views import DashboardView, GarageView, ActiveBidsView, GlobalSearchView

urlpatterns = [
    path("workspace/<str:section>/<int:pk>/", WorkspaceListingView.as_view(), name="workspace-listing"),
    path("workspace/<str:section>/", WorkspaceView.as_view(), name="workspace"),
    path("", DashboardView.as_view(), name="dashboard"),
    path("garage/", GarageView.as_view(), name="dashboard-garage"),
    path("active-bids/", ActiveBidsView.as_view(), name="dashboard-active-bids"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
]
