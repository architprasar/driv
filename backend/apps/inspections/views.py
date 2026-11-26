from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Inspection
from .serializers import InspectionListSerializer, InspectionDetailSerializer


class InspectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inspection.objects.select_related("car__brand", "car__model").prefetch_related(
        "categories__checkpoints", "photos"
    )

    def get_serializer_class(self):
        if self.action == "list":
            return InspectionListSerializer
        return InspectionDetailSerializer

    @action(detail=True, methods=["get"])
    def report(self, request, pk=None):
        inspection = self.get_object()
        return Response(InspectionDetailSerializer(inspection).data)
