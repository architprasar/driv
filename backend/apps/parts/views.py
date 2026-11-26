from apps.core.permissions import IsListingOwner
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Part, PartCategory
from .serializers import (
    PartListSerializer,
    PartDetailSerializer,
    PartCategorySerializer,
)


class PartViewSet(viewsets.ModelViewSet):
    lookup_value_regex = r"\d+"
    queryset = Part.objects.select_related("category", "seller").prefetch_related(
        "images"
    )
    search_fields = ["name", "sku", "description"]
    ordering_fields = ["price", "rating", "created_at"]
    from .filters import PartFilter

    filterset_class = PartFilter

    def get_serializer_class(self):
        if self.action == "list":
            return PartListSerializer
        return PartDetailSerializer

    def get_queryset(self):
        qs = self.queryset
        seller = self.request.query_params.get("seller")
        if seller == "me":
            if not self.request.user.is_authenticated:
                return qs.none()
            qs = qs.filter(seller=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsListingOwner()]
        return [permissions.AllowAny()]

    @transaction.atomic
    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        from apps.orders.models import OrderItem

        instance = Part.objects.select_for_update().get(pk=instance.pk)
        if OrderItem.objects.filter(part=instance).exists():
            raise ValidationError(
                "This listing is part of an order and must be kept for order history."
            )
        instance.delete()

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.queryset.filter(is_featured=True)[:10]
        return Response(
            PartListSerializer(qs, many=True, context={"request": request}).data
        )

    @action(detail=False, methods=["get"])
    def compatible(self, request):
        brand = request.query_params.get("brand")
        model = request.query_params.get("model")
        qs = self.queryset
        if brand:
            qs = qs.filter(compatible_brands__slug=brand)
        if model:
            qs = qs.filter(compatible_models__slug=model)
        return Response(
            PartListSerializer(qs[:20], many=True, context={"request": request}).data
        )


class PartCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PartCategory.objects.prefetch_related("parts")
    serializer_class = PartCategorySerializer


from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import PartImageSerializer


class PartImageUploadView(generics.CreateAPIView):
    serializer_class = PartImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @transaction.atomic
    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import ValidationError

        part = get_object_or_404(
            Part.objects.select_for_update(),
            pk=self.kwargs["part_id"],
            seller=self.request.user,
        )
        if part.images.count() >= 10:
            raise ValidationError(
                "A listing can have up to ten photos. Remove a photo before uploading another."
            )
        image = self.request.FILES.get("image")
        if image and image.size > 10 * 1024 * 1024:
            raise ValidationError("Each image must be 10 MB or smaller.")
        serializer.save(part=part, is_primary=not part.images.exists())


class PartReviewView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def list(self, request, *args, **kwargs):
        from django.db.models import Avg

        result = super().list(request, *args, **kwargs)
        result.data["rating"] = self.get_queryset().aggregate(value=Avg("rating"))[
            "value"
        ]
        return result

    def get_queryset(self):
        from .models import PartReview

        return (
            PartReview.objects.filter(part_id=self.kwargs["part_id"])
            .select_related("customer")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        from .serializers import PartReviewSerializer

        return PartReviewSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        from django.db.models import Avg, Count
        from apps.orders.models import OrderItem
        from .models import PartReview
        from rest_framework.exceptions import ValidationError

        item = get_object_or_404(
            OrderItem,
            pk=serializer.validated_data["item"].pk,
            order__user=self.request.user,
            part_id=self.kwargs["part_id"],
            fulfillment_status="delivered",
        )
        if PartReview.objects.filter(item=item).exists():
            raise ValidationError("This purchase has already been reviewed.")
        part = Part.objects.select_for_update().get(pk=self.kwargs["part_id"])
        serializer.save(part=part, customer=self.request.user, item=item)
        stats = part.reviews.aggregate(rating=Avg("rating"), count=Count("pk"))
        part.rating = stats["rating"] or 0
        part.review_count = stats["count"]
        part.save(update_fields=["rating", "review_count"])


class PartQuestionListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import PartQuestionSerializer

        return PartQuestionSerializer

    def get_queryset(self):
        from .models import PartQuestion

        qs = PartQuestion.objects.select_related("part", "customer")
        qs = (
            qs.filter(part__seller=self.request.user)
            if self.request.query_params.get("role") == "seller"
            else qs.filter(customer=self.request.user)
        )
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        from apps.orders.services import notify

        question = serializer.save(customer=self.request.user)
        notify(
            question.part.seller_id,
            "New part question",
            f"A customer asked about {question.part.name}.",
            "/dashboard/enquiries",
            "account",
        )


class PartQuestionDetailView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        from django.shortcuts import get_object_or_404
        from .models import PartQuestion
        from .serializers import PartQuestionSerializer
        from rest_framework.exceptions import ValidationError, PermissionDenied
        from apps.orders.services import notify

        question = get_object_or_404(PartQuestion.objects.select_related("part"), pk=pk)
        if request.user.pk not in (question.customer_id, question.part.seller_id):
            raise PermissionDenied()
        if question.status != "requested":
            raise ValidationError("This question is already closed.")
        state = request.data.get("status")
        if state == "cancelled":
            question.status = state
        elif request.user.pk == question.part.seller_id and state == "completed":
            reply = str(request.data.get("seller_note", "")).strip()
            if len(reply) < 3:
                raise ValidationError("Enter your reply to this question.")
            question.seller_note = reply
            question.status = state
        else:
            raise PermissionDenied()
        question.save()
        notify(
            question.customer_id,
            "Part question updated",
            f"Your question about {question.part.name} is {question.status}.",
            "/profile/enquiries",
            "account",
        )
        return Response(PartQuestionSerializer(question).data)
