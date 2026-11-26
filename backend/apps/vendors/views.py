from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import VendorProfile, VendorPayout, VendorActivity
from .serializers import (
    VendorRegisterSerializer,
    VendorDashboardSerializer,
    VendorBusinessSerializer,
    validate_document,
    VendorPayoutSerializer,
    VendorActivitySerializer,
)


class VendorRegisterView(generics.CreateAPIView):
    serializer_class = VendorRegisterSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]


class VendorDocumentUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def patch(self, request):
        try:
            profile = request.user.vendor_profile
        except VendorProfile.DoesNotExist:
            return Response(
                {"detail": "Vendor profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        from rest_framework.exceptions import ValidationError

        if not any(
            name in request.FILES for name in ("business_license", "representative_id")
        ):
            raise ValidationError(
                "Choose a business license or representative ID to upload."
            )
        for name in ("business_license", "representative_id"):
            if name in request.FILES:
                validate_document(request.FILES[name])
        if "business_license" in request.FILES:
            profile.business_license = request.FILES["business_license"]
        if "representative_id" in request.FILES:
            profile.representative_id = request.FILES["representative_id"]
        profile.verification_status = "under_review"
        profile.save()
        return Response(VendorDashboardSerializer(profile).data)


class VendorDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.vendor_profile
        except VendorProfile.DoesNotExist:
            return Response(
                {"detail": "Not a vendor."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(VendorDashboardSerializer(profile).data)

    def patch(self, request):
        try:
            profile = request.user.vendor_profile
        except VendorProfile.DoesNotExist:
            return Response(
                {"detail": "Not a vendor."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = VendorBusinessSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        VendorActivity.objects.create(
            vendor=profile,
            event_type="business_updated",
            description="Business contact details updated.",
        )
        return Response(serializer.data)


class VendorListingsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.cars.models import Car
        from apps.cars.serializers import CarListSerializer

        cars = (
            Car.objects.filter(seller=request.user)
            .select_related("brand", "model")
            .prefetch_related("images")
        )
        return Response(
            CarListSerializer(cars, many=True, context={"request": request}).data
        )


class VendorAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.vendor_profile
        except VendorProfile.DoesNotExist:
            return Response(
                {"detail": "Not a vendor."}, status=status.HTTP_404_NOT_FOUND
            )
        activities = profile.activities.all()[:30]
        return Response(VendorActivitySerializer(activities, many=True).data)


class VendorPayoutsView(generics.ListAPIView):
    serializer_class = VendorPayoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VendorPayout.objects.filter(vendor__user=self.request.user)


class VendorDocumentDownloadView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, profile_id, kind):
        from django.shortcuts import get_object_or_404
        from django.http import FileResponse, Http404
        from pathlib import Path
        from .models import VendorProfile

        profile = get_object_or_404(VendorProfile, pk=profile_id)
        if not request.user.is_staff and profile.user_id != request.user.pk:
            raise Http404()
        field = {
            "business-license": profile.business_license,
            "representative-id": profile.representative_id,
        }.get(kind)
        if not field:
            raise Http404()
        try:
            handle = field.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404(
                "This document is unavailable. Please upload a replacement or contact support."
            )
        response = FileResponse(
            handle, as_attachment=True, filename=Path(field.name).name
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
