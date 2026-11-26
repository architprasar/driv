from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SavedSearch
from .serializers import SavedSearchSerializer


class SavedSearchViewSet(viewsets.ModelViewSet):
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user).order_by("-created_at", "-id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["patch"], url_path="ack")
    def acknowledge_alerts(self, request, pk=None):
        saved_search = self.get_object()
        saved_search.new_matches_count = 0
        saved_search.save(update_fields=["new_matches_count", "last_checked"])
        return Response(self.get_serializer(saved_search).data)

    @action(detail=True, methods=["patch"], url_path="reset")
    def reset_alerts(self, request, pk=None):
        return self.acknowledge_alerts(request, pk=pk)

    @action(detail=True, methods=["get"])
    def matches(self, request, pk=None):
        from .matching import matching_cars
        from apps.cars.serializers import CarListSerializer
        from apps.core.workspace import paginate
        saved_search = self.get_object()
        return paginate(request, matching_cars(saved_search), lambda page: CarListSerializer(page, many=True, context={"request": request}).data)
