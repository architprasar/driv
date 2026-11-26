from rest_framework import serializers
from .models import SavedSearch


class SavedSearchSerializer(serializers.ModelSerializer):
    new_matches_count = serializers.SerializerMethodField()

    def get_new_matches_count(self, obj):
        from .matching import matching_cars
        return obj.new_matches_count + matching_cars(obj).filter(created_at__gt=obj.last_checked).count()

    def validate_filters(self, value):
        from .matching import validate_filters
        return validate_filters(value)

    class Meta:
        model = SavedSearch
        fields = [
            "id", "name", "filters", "notify_push", "notify_email",
            "new_matches_count", "last_checked", "created_at",
        ]
        read_only_fields = ["id", "new_matches_count", "last_checked", "created_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
