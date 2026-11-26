from rest_framework import serializers
from .models import PartCategory, Part, PartImage


class PartCategorySerializer(serializers.ModelSerializer):
    part_count = serializers.IntegerField(source="parts.count", read_only=True)

    class Meta:
        model = PartCategory
        fields = ["id", "name", "slug", "image", "description", "part_count"]


class PartImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartImage
        fields = ["id", "image", "is_primary"]


class VerifiedReviewStats:
    def _review_stats(self, obj):
        from django.db.models import Avg, Count

        if not hasattr(obj, "_verified_review_stats"):
            obj._verified_review_stats = obj.reviews.aggregate(
                rating=Avg("rating"), count=Count("pk")
            )
        return obj._verified_review_stats

    def get_rating(self, obj):
        return round(float(self._review_stats(obj)["rating"] or 0), 2)

    def get_review_count(self, obj):
        return self._review_stats(obj)["count"]


class PartListSerializer(VerifiedReviewStats, serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = PartImageSerializer(many=True, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Part
        fields = [
            "id",
            "name",
            "sku",
            "price",
            "category_name",
            "is_genuine",
            "is_featured",
            "condition",
            "rating",
            "review_count",
            "stock",
            "in_stock",
            "primary_image",
            "images",
            "created_at",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first()
        return img.image.url if img else None


class PartDetailSerializer(VerifiedReviewStats, serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    from apps.cars.models import CarBrand, CarModel

    compatible_brand_ids = serializers.PrimaryKeyRelatedField(
        queryset=CarBrand.objects.all(),
        many=True,
        source="compatible_brands",
        write_only=True,
        required=False,
    )
    compatible_model_ids = serializers.PrimaryKeyRelatedField(
        queryset=CarModel.objects.all(),
        many=True,
        source="compatible_models",
        write_only=True,
        required=False,
    )

    compatible_brands = serializers.SerializerMethodField()
    compatible_models = serializers.SerializerMethodField()

    def get_compatible_brands(self, obj):
        return list(obj.compatible_brands.values_list("name", flat=True))

    def get_compatible_models(self, obj):
        return [str(model) for model in obj.compatible_models.select_related("brand")]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    category = PartCategorySerializer(read_only=True)
    images = PartImageSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=PartCategory.objects.all(), source="category", write_only=True
    )

    class Meta:
        model = Part
        fields = [
            "id",
            "seller",
            "name",
            "sku",
            "description",
            "price",
            "stock",
            "category",
            "category_id",
            "is_genuine",
            "is_featured",
            "condition",
            "compatible_brand_ids",
            "compatible_model_ids",
            "rating",
            "review_count",
            "images",
            "created_at",
            "compatible_brands",
            "compatible_models",
        ]
        read_only_fields = ["id", "seller", "rating", "review_count", "created_at"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Enter a positive asking price.")
        return value

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        return super().create(validated_data)


class PartReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.username", read_only=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(min_length=5, max_length=2000)

    class Meta:
        from .models import PartReview

        model = PartReview
        fields = ["id", "item", "rating", "body", "customer_name", "created_at"]
        read_only_fields = ["id", "customer_name", "created_at"]
        extra_kwargs = {"item": {"validators": [], "write_only": True}}


class PartQuestionSerializer(serializers.ModelSerializer):
    part_title = serializers.CharField(source="part.name", read_only=True)
    customer_name = serializers.CharField(source="customer.username", read_only=True)
    message = serializers.CharField(min_length=5, max_length=3000)

    class Meta:
        from .models import PartQuestion

        model = PartQuestion
        fields = [
            "id",
            "part",
            "part_title",
            "customer_name",
            "phone",
            "message",
            "seller_note",
            "status",
            "created_at",
        ]
        read_only_fields = ["seller_note", "status", "created_at"]

    def validate_part(self, value):
        if value.seller_id == self.context["request"].user.pk:
            raise serializers.ValidationError(
                "You cannot ask a purchase question about your own part."
            )
        return value
