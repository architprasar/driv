from rest_framework import serializers
from .models import Valuation, VehicleHistoryEvent


class ValuationSerializer(serializers.ModelSerializer):
    confidence_score = serializers.SerializerMethodField()
    confidence_label = serializers.SerializerMethodField()
    rationale_summary = serializers.SerializerMethodField()
    pricing_factors = serializers.SerializerMethodField()
    next_actions = serializers.SerializerMethodField()

    def get_confidence_score(self, obj):
        return min(80, obj.similar_transactions * 10) if obj.basis == "listing_comparables" else 0

    def get_confidence_label(self, obj):
        score = self.get_confidence_score(obj)
        if score >= 80:
            return "high"
        if score >= 60:
            return "medium"
        return "low"

    def get_rationale_summary(self, obj):
        if obj.basis == "unavailable":
            return "There are not enough matching listings to provide an estimate. You can create a listing and choose your asking price."
        if obj.basis == "legacy":
            return "This is an older estimate without verified comparable-listing evidence. Obtain a fresh estimate or set your own asking price."
        return f"Asking-price range from {obj.similar_transactions} active listings for this model within two model years. These are listed prices, not confirmed sale prices or a purchase offer."

    def get_pricing_factors(self, obj):
        if obj.basis != "listing_comparables":
            return []
        return [{"key": "comparables", "label": "Active comparable listings", "impact_type": "neutral", "amount": str(obj.similar_transactions), "description": "This estimate uses actual active asking prices. Condition and mileage still require buyer inspection."}]

    def get_next_actions(self, obj):
        return ["Choose an asking price and publish your vehicle details and photos.", "Provide service history and inspection records to interested buyers.", "Create an auction from your dashboard if you prefer competitive bidding."]

    class Meta:
        model = Valuation
        fields = [
            "id", "brand", "model", "variant", "year", "mileage",
            "fuel_type", "transmission", "condition",
            "min_value", "max_value", "market_average",
            "similar_transactions", "demand_premium", "mileage_adjustment", "basis",
            "valid_until", "created_at",
            "confidence_score", "confidence_label", "rationale_summary",
            "pricing_factors", "next_actions",
        ]
        read_only_fields = [
            "id", "min_value", "max_value", "market_average",
            "similar_transactions", "demand_premium", "mileage_adjustment", "basis",
            "valid_until", "created_at",
            "confidence_score", "confidence_label", "rationale_summary",
            "pricing_factors", "next_actions",
        ]


class CreateValuationSerializer(serializers.Serializer):
    brand = serializers.CharField()
    model = serializers.CharField()
    variant = serializers.CharField(required=False, default="")
    year = serializers.IntegerField(min_value=1990)
    mileage = serializers.IntegerField(min_value=0)
    fuel_type = serializers.CharField(required=False, default="")
    transmission = serializers.CharField(required=False, default="")
    condition = serializers.CharField(required=False, default="good")


class VehicleHistoryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleHistoryEvent
        fields = ["id", "event_type", "title", "description", "date", "odometer", "location", "tags", "verified"]


class VehicleHistorySerializer(serializers.Serializer):
    car_title = serializers.CharField()
    vin = serializers.CharField()
    events = VehicleHistoryEventSerializer(many=True)
    total_events = serializers.IntegerField()
    clean_title = serializers.BooleanField(allow_null=True)
    has_recorded_accident = serializers.BooleanField()
