from rest_framework import serializers
from .models import Cart, CartItem
from apps.parts.models import Part
from apps.cars.models import Car


class CartItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_image = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    item_id = serializers.IntegerField(write_only=True, required=False, min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=10000, default=1)

    class Meta:
        model = CartItem
        fields = ["id", "part", "car", "item_id", "item_type", "quantity", "item_name", "subtotal", "unit_price", "item_image"]
        extra_kwargs = {"part": {"required": False, "allow_null": True}, "car": {"required": False, "allow_null": True}}

    def validate(self, attrs):
        from apps.orders.services import check_product
        if self.instance:
            if any(key in attrs for key in ("part", "car", "item_type", "item_id")):
                raise serializers.ValidationError("A cart item’s product cannot be changed. Remove it and add the desired product.")
            product = self.instance.part if self.instance.item_type == "part" else self.instance.car
            check_product(self.context["request"].user, product, self.instance.item_type, attrs.get("quantity", self.instance.quantity))
            return attrs
        kind = attrs.get("item_type")
        item_id = attrs.pop("item_id", None)
        if kind not in {"part", "car"}:
            raise serializers.ValidationError("Choose a part or vehicle.")
        if attrs.get("car" if kind == "part" else "part"):
            raise serializers.ValidationError("A cart line must contain exactly one product type.")
        product = attrs.get(kind)
        if product is not None and item_id and product.pk != item_id:
            raise serializers.ValidationError("Product identifiers do not match.")
        if product is None:
            model = Part if kind == "part" else Car
            product = model.objects.filter(pk=item_id).first() if item_id else None
        if product is None:
            raise serializers.ValidationError("This product could not be found.")
        attrs[kind] = product
        check_product(self.context["request"].user, product, kind, attrs.get("quantity", 1))
        return attrs

    def get_unit_price(self, obj):
        product = obj.part if obj.item_type == "part" else obj.car
        return str(product.price) if product else "0.00"

    def get_item_image(self, obj):
        product = obj.part if obj.item_type == "part" else obj.car
        image = next((image for image in product.images.all() if image.is_primary), None) if product else None
        return image.image.url if image else None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "items", "total", "item_count", "updated_at"]
