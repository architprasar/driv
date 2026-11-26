from rest_framework import serializers
from .models import Inspection, InspectionCategory, InspectionCheckpoint, InspectionPhoto


class InspectionCheckpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionCheckpoint
        fields = ["id", "name", "status", "value"]


class InspectionCategorySerializer(serializers.ModelSerializer):
    checkpoints = InspectionCheckpointSerializer(many=True, read_only=True)

    class Meta:
        model = InspectionCategory
        fields = ["id", "name", "icon", "total_points", "passed_points", "grade", "has_flag", "flag_description", "checkpoints"]


class InspectionPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionPhoto
        fields = ["id", "image", "label", "description", "has_flag"]


class InspectionDetailSerializer(serializers.ModelSerializer):
    categories = InspectionCategorySerializer(many=True, read_only=True)
    photos = InspectionPhotoSerializer(many=True, read_only=True)
    car_title = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = [
            "id", "car", "car_title", "report_number", "overall_score", "grade",
            "status", "inspection_date", "inspector_name", "inspector_title",
            "inspector_completions", "inspector_notes", "is_cpo", "purchase_price",
            "categories", "photos", "created_at",
        ]

    def get_car_title(self, obj):
        return str(obj.car) if obj.car else ""


class InspectionListSerializer(serializers.ModelSerializer):
    car_title = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = ["id", "car_title", "report_number", "overall_score", "grade", "status", "inspection_date"]

    def get_car_title(self, obj):
        return str(obj.car) if obj.car else ""
