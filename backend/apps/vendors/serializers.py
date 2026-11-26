from django.db import transaction
from rest_framework import serializers
from .models import VendorProfile, VendorPayout, VendorActivity


class VendorRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = [
            "business_name",
            "tax_id",
            "contact_person",
            "business_email",
            "phone",
            "business_license",
            "representative_id",
        ]

    def validate(self, attrs):
        if VendorProfile.objects.filter(user=self.context["request"].user).exists():
            raise serializers.ValidationError(
                "Your business is already registered. Open your vendor workspace."
            )
        for name in ("business_license", "representative_id"):
            if attrs.get(name):
                validate_document(attrs[name])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        user = validated_data["user"]
        profile = super().create(validated_data)
        user.role = "vendor"
        user.save(update_fields=["role"])
        return profile


class VendorDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = [
            "id",
            "business_name",
            "verification_status",
            "tier",
            "total_earnings",
            "total_sales",
            "active_listings",
            "created_at",
        ]


class VendorPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorPayout
        fields = [
            "id",
            "amount",
            "currency",
            "status",
            "initiated_at",
            "transfer_reference",
            "mode",
            "request_key",
        ]


class VendorActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorActivity
        fields = ["id", "event_type", "description", "created_at"]


class VendorBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = [
            "business_name",
            "tax_id",
            "contact_person",
            "business_email",
            "phone",
        ]

    def update(self, instance, validated_data):
        if any(
            getattr(instance, field) != value for field, value in validated_data.items()
        ):
            validated_data["verification_status"] = "under_review"
        return super().update(instance, validated_data)


def validate_document(document):
    if document.size > 10 * 1024 * 1024:
        raise serializers.ValidationError("Each document must be 10 MB or smaller.")
    if document.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise serializers.ValidationError("Upload a PDF, JPG, or PNG document.")
    from pathlib import Path

    expected = {
        "application/pdf": {".pdf"},
        "image/jpeg": {".jpg", ".jpeg"},
        "image/png": {".png"},
    }
    if Path(document.name).suffix.lower() not in expected[document.content_type]:
        raise serializers.ValidationError(
            "Use a PDF, JPG, or PNG filename matching the document format."
        )
    try:
        if document.content_type == "application/pdf":
            if not document.read(5).startswith(b"%PDF-"):
                raise ValueError()
        else:
            from PIL import Image

            Image.open(document).verify()
    except Exception:
        raise serializers.ValidationError(
            "The file could not be read as the selected document type."
        )
    finally:
        document.seek(0)
    return document
