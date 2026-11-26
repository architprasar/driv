from apps.core.permissions import IsListingOwner
from django.db import transaction
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Car, CarBrand, CarModel, CarImage
from .serializers import (
    CarListSerializer,
    CarDetailSerializer,
    CarBrandSerializer,
    CarModelSerializer,
    CarImageSerializer,
    CarCompareSerializer,
)
from .filters import CarFilter


class CarViewSet(viewsets.ModelViewSet):
    lookup_value_regex = r"\d+"
    queryset = Car.objects.select_related("brand", "model", "seller").prefetch_related(
        "images", "features"
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarFilter
    search_fields = ["brand__name", "model__name", "variant", "description"]
    ordering_fields = ["price", "year", "mileage", "created_at"]

    def get_queryset(self):
        from django.db.models import Q
        from apps.auctions.models import Auction

        qs = super().get_queryset()
        if self.action in {"list", "featured", "compare"}:
            return (
                qs.filter(status="active")
                .exclude(auction_history__status__in=["upcoming", "live", "sold"])
                .distinct()
            )
        if self.request.user.is_authenticated:
            return qs.filter(
                Q(status__in=["active", "reserved", "sold"])
                | Q(seller=self.request.user)
            )
        return qs.filter(status__in=["active", "reserved", "sold"])

    def get_serializer_class(self):
        if self.action == "list":
            return CarListSerializer
        return CarDetailSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsListingOwner()]
        return [permissions.AllowAny()]

    @transaction.atomic
    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        from apps.orders.models import OrderItem

        instance = Car.objects.select_for_update().get(pk=instance.pk)
        if OrderItem.objects.filter(car=instance).exists():
            raise ValidationError(
                "This listing is part of an order and must be kept for order history."
            )
        if getattr(instance, "auction", None):
            raise ValidationError(
                "This vehicle is linked to an auction. Archive it after the auction closes."
            )
        instance.delete()

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = Car.objects.select_for_update().get(
            pk=serializer.instance.pk
        )
        serializer.validate(serializer.validated_data)
        serializer.save()

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:10]
        return Response(
            CarListSerializer(qs, many=True, context={"request": request}).data
        )

    @action(detail=False, methods=["get"])
    def compare(self, request):
        ids = request.query_params.get("ids", "")
        id_list = [int(i) for i in ids.split(",") if i.isdigit()]
        qs = self.get_queryset().filter(id__in=id_list)
        return Response(CarCompareSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Car.objects.filter(pk=instance.pk).update(
            views_count=models.F("views_count") + 1
        )
        return super().retrieve(request, *args, **kwargs)


class CarBrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CarBrand.objects.prefetch_related("models")
    serializer_class = CarBrandSerializer

    @action(detail=True, methods=["get"])
    def models(self, request, pk=None):
        brand = self.get_object()
        models_qs = brand.models.all()
        return Response(CarModelSerializer(models_qs, many=True).data)


class CarImageUploadView(generics.CreateAPIView):
    serializer_class = CarImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    @transaction.atomic
    def perform_create(self, serializer):
        car_id = self.kwargs["car_id"]
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import ValidationError

        car = get_object_or_404(
            Car.objects.select_for_update(), pk=car_id, seller=self.request.user
        )
        if car.images.count() >= 10:
            raise ValidationError(
                "A listing can have up to ten photos. Remove a photo before uploading another."
            )
        image = self.request.FILES.get("image")
        if image and image.size > 10 * 1024 * 1024:
            raise ValidationError("Each image must be 10 MB or smaller.")
        serializer.save(car=car, is_primary=not car.images.exists())


# Need to import models for F expression
from django.db import models  # noqa: E402
