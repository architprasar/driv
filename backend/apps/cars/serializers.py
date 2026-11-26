from rest_framework import serializers
from .models import CarBrand, CarModel, Car, CarImage, CarFeature


class CarBrandSerializer(serializers.ModelSerializer):
    model_count = serializers.IntegerField(source="models.count", read_only=True)

    class Meta:
        model = CarBrand
        fields = ["id", "name", "slug", "logo", "model_count"]


class CarModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarModel
        fields = ["id", "name", "slug"]


class CarImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarImage
        fields = ["id", "image", "is_primary", "order"]


class CarFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarFeature
        fields = ["id", "category", "name"]


class CarListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    model_name = serializers.CharField(source="model.name", read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "id", "brand_name", "model_name", "variant", "year", "price",
            "mileage", "fuel_type", "transmission", "condition", "location",
            "is_featured", "primary_image", "created_at", "status",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first()
        if img:
            return CarImageSerializer(img, context=self.context).data
        return None


class CarDetailSerializer(serializers.ModelSerializer):
    commerce = serializers.SerializerMethodField()

    def get_commerce(self, obj):
        from apps.auctions.models import Auction
        auction = Auction.objects.filter(car=obj, status__in=["upcoming", "live", "sold"]).order_by("-created_at").first()
        return {"available_for_purchase": obj.status == "active" and not auction, "status": obj.status, "auction_id": auction.pk if auction else None}

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    brand = CarBrandSerializer(read_only=True)
    model = CarModelSerializer(read_only=True)
    images = CarImageSerializer(many=True, read_only=True)
    features = CarFeatureSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source="seller.username", read_only=True)
    trust_report = serializers.SerializerMethodField()
    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=CarBrand.objects.all(), source="brand", write_only=True
    )
    model_id = serializers.PrimaryKeyRelatedField(
        queryset=CarModel.objects.all(), source="model", write_only=True
    )

    class Meta:
        model = Car
        fields = [
            "id", "seller", "seller_name", "brand", "brand_id", "model", "model_id",
            "variant", "year", "price", "mileage", "fuel_type", "transmission",
            "body_type", "color", "engine", "horsepower", "drivetrain", "vin",
            "location", "description", "condition", "status", "is_featured",
            "views_count", "images", "features", "trust_report", "commerce", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "seller", "views_count", "created_at", "updated_at"]

    def validate(self, attrs):
        from datetime import date
        brand = attrs.get("brand", getattr(self.instance, "brand", None))
        model = attrs.get("model", getattr(self.instance, "model", None))
        if brand and model and model.brand_id != brand.pk:
            raise serializers.ValidationError("Choose a model belonging to the selected brand.")
        if "year" in attrs and not 1900 <= attrs["year"] <= date.today().year + 1:
            raise serializers.ValidationError("Enter a valid model year.")
        state = attrs.get("status")
        if state in {"reserved", "sold"} and state != getattr(self.instance, "status", None):
            raise serializers.ValidationError("Reserved and sold states are managed by checkout.")
        if self.instance and self.instance.status in {"reserved", "sold"} and any(key in attrs and attrs[key] != getattr(self.instance, key) for key in ("price", "status", "vin", "brand", "model", "year")):
            raise serializers.ValidationError("This vehicle is reserved for a customer’s checkout.")
        if self.instance and getattr(self.instance, "auction", None) and self.instance.auction.status in {"live", "upcoming"} and any(key in attrs and attrs[key] != getattr(self.instance, key) for key in ("price", "status", "vin", "brand", "model", "year")):
            raise serializers.ValidationError("Close the vehicle’s auction before changing its price or availability.")
        return attrs

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        return super().create(validated_data)

    def get_trust_report(self, obj):
        from django.conf import settings
        inspection = obj.inspections.filter(status="completed").prefetch_related("categories__checkpoints").first()
        points = sum(category.total_points for category in inspection.categories.all()) if inspection else 0
        score = float(inspection.overall_score) * 10 if inspection else None
        return {
            "inspection_score": score,
            "inspection_status": "passed" if inspection and score >= 80 else "review_required" if inspection else "not_inspected",
            "inspection_points_checked": points,
            "inspection_report_id": inspection.pk if inspection else None,
            "history_flags": {"vin_recorded": bool(obj.vin), "vin_validated": False, "high_mileage_flag": obj.mileage > 120000, "clean_history_signal": False},
            "assurance": {"return_window_days": settings.RETURN_WINDOW_DAYS, "warranty_available": False, "seller_verified": obj.seller.is_verified},
        }


class CarCompareSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name")
    model_name = serializers.CharField(source="model.name")
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "id", "brand_name", "model_name", "variant", "year", "price",
            "mileage", "fuel_type", "transmission", "engine", "horsepower",
            "drivetrain", "body_type", "color", "primary_image",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first()
        return img.image.url if img else None
