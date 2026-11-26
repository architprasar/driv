from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers, views
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.core.pagination import WorkspacePagination
from apps.orders.services import notify
from .models import Car, CarEnquiry, FavoriteCar
from .serializers import CarListSerializer


class EnquirySerializer(serializers.ModelSerializer):
    car_title = serializers.CharField(source="car.__str__", read_only=True)
    customer_name = serializers.CharField(source="customer.username", read_only=True)

    class Meta:
        model = CarEnquiry
        fields = ["id", "car", "car_title", "customer_name", "kind", "message", "phone", "preferred_at", "scheduled_at", "status", "seller_note", "created_at"]
        read_only_fields = ["scheduled_at", "status", "seller_note", "created_at"]

    def validate(self, attrs):
        car = attrs["car"]
        if car.seller_id == self.context["request"].user.pk:
            raise serializers.ValidationError("You cannot enquire about your own vehicle.")
        if car.status != "active":
            raise serializers.ValidationError("This vehicle is no longer available for new enquiries.")
        if attrs.get("preferred_at") and attrs["preferred_at"] <= timezone.now():
            raise serializers.ValidationError("Choose a future date and time.")
        if attrs["kind"] == "test_drive" and not attrs.get("preferred_at"):
            raise serializers.ValidationError("Choose a preferred test-drive time.")
        if attrs["kind"] == "question" and len(attrs.get("message", "").strip()) < 5:
            raise serializers.ValidationError("Enter your question for the seller.")
        return attrs


class EnquiryListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EnquirySerializer
    pagination_class = WorkspacePagination

    def get_queryset(self):
        qs = CarEnquiry.objects.select_related("car__brand", "car__model", "customer")
        qs = qs.filter(car__seller=self.request.user) if self.request.query_params.get("role") == "seller" else qs.filter(customer=self.request.user)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        enquiry = serializer.save(customer=self.request.user)
        notify(enquiry.car.seller_id, "New vehicle enquiry", f"A customer requested {enquiry.get_kind_display().lower()} for {enquiry.car}.", "/dashboard/enquiries", "account")


class EnquiryDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        enquiry = get_object_or_404(CarEnquiry.objects.select_related("car"), pk=pk)
        if request.user.pk not in (enquiry.customer_id, enquiry.car.seller_id):
            raise PermissionDenied()
        state = request.data.get("status")
        if enquiry.status in {"completed", "cancelled"}:
            raise ValidationError("This enquiry is already closed.")
        if request.user.pk == enquiry.customer_id:
            if state != "cancelled":
                raise PermissionDenied("Only the seller can schedule or complete an enquiry.")
        else:
            if state not in {"scheduled", "completed", "cancelled"}:
                raise ValidationError("Choose a supported enquiry status.")
            if enquiry.kind == "test_drive" and state == "scheduled":
                field = serializers.DateTimeField()
                scheduled = field.run_validation(request.data.get("scheduled_at"))
                if scheduled <= timezone.now():
                    raise ValidationError("Choose a future appointment time.")
                enquiry.scheduled_at = scheduled
            if state == "completed" and enquiry.kind == "test_drive" and enquiry.status != "scheduled":
                raise ValidationError("Schedule the test drive before completing it.")
            enquiry.seller_note = str(request.data.get("seller_note", "")).strip()
            if enquiry.kind == "question" and state == "completed" and not enquiry.seller_note:
                raise ValidationError("Enter a reply to the customer’s question.")
        enquiry.status = state
        enquiry.save()
        recipient = enquiry.car.seller_id if request.user.pk == enquiry.customer_id else enquiry.customer_id
        notify(recipient, "Vehicle enquiry updated", f"Your enquiry is {state}.", "/dashboard/enquiries" if recipient == enquiry.car.seller_id else "/profile/enquiries", "account")
        return Response(EnquirySerializer(enquiry).data)


class SavedCarListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CarListSerializer
    pagination_class = WorkspacePagination

    def get_queryset(self):
        return Car.objects.filter(saved_by__user=self.request.user).select_related("brand", "model").prefetch_related("images").order_by("-saved_by__created_at")


class SavedCarView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        return Response({"saved": FavoriteCar.objects.filter(user=request.user, car_id=pk).exists()})

    def post(self, request, pk):
        car = get_object_or_404(Car, pk=pk, status__in=["active", "reserved", "sold"])
        FavoriteCar.objects.get_or_create(user=request.user, car=car)
        return Response({"saved": True})

    def delete(self, request, pk):
        FavoriteCar.objects.filter(user=request.user, car_id=pk).delete()
        return Response({"saved": False})
