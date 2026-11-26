from rest_framework import serializers
from .models import Order, OrderItem, OrderTimeline, ReturnRequest
from apps.accounts.serializers import UserAddressSerializer
from apps.payments.models import Payment


class OrderTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTimeline
        fields = ["id", "status", "title", "description", "timestamp"]


class OrderItemSerializer(serializers.ModelSerializer):
    return_request = serializers.SerializerMethodField()
    can_confirm_receipt = serializers.SerializerMethodField()
    can_request_return = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    def get_can_confirm_receipt(self, obj):
        return obj.fulfillment_status in {"shipped", "out_for_delivery", "ready_for_pickup"}

    def get_can_request_return(self, obj):
        from django.conf import settings
        from django.utils import timezone
        from datetime import timedelta
        return bool(obj.delivered_at and obj.fulfillment_status == "delivered" and not getattr(obj, "return_request", None) and timezone.now() <= obj.delivered_at + timedelta(days=settings.RETURN_WINDOW_DAYS))

    def get_can_review(self, obj):
        return bool(obj.part_id and obj.fulfillment_status == "delivered" and not getattr(obj, "review", None))


    def get_return_request(self, obj):
        result = getattr(obj, "return_request", None)
        return {"id": result.pk, "status": result.status, "reason": result.reason, "seller_note": result.seller_note} if result else None

    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "part", "car", "name", "quantity", "unit_price", "subtotal", "seller", "fulfillment_status", "tracking_number", "carrier", "fulfillment_note", "delivered_at", "return_request", "can_confirm_receipt", "can_request_return", "can_review"]


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    payment_status = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "total", "item_count",
            "delivery_method", "estimated_delivery", "created_at", "payment_status", "currency",
        ]

    def get_currency(self, obj):
        payment = getattr(obj, "payment", None)
        return obj.currency

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        return payment.status if payment else None


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.payments.models import PaymentRefund
        model = PaymentRefund
        fields = ["id", "amount", "status", "reason", "created_at"]


class OrderPaymentSerializer(serializers.ModelSerializer):
    refunds = RefundSerializer(many=True, read_only=True)
    class Meta:
        model = Payment
        fields = ["id", "method", "status", "amount", "currency", "emi_months", "created_at", "mode", "refunded_amount", "refunds"]


class OrderDetailSerializer(serializers.ModelSerializer):
    can_cancel = serializers.SerializerMethodField()

    def get_can_cancel(self, obj):
        return obj.status in {"placed", "confirmed"} and not obj.items.exclude(fulfillment_status__in=["pending", "processing", "cancelled"]).exists()

    items = OrderItemSerializer(many=True, read_only=True)
    timeline = OrderTimelineSerializer(many=True, read_only=True)
    shipping_address = serializers.SerializerMethodField()

    def get_shipping_address(self, obj):
        if obj.shipping_snapshot:
            return obj.shipping_snapshot
        return UserAddressSerializer(obj.shipping_address).data if obj.shipping_address else None

    payment = OrderPaymentSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "shipping_address",
            "delivery_method", "subtotal", "shipping_cost", "tax", "total",
            "driver_name", "tracking_number", "estimated_delivery",
            "items", "timeline", "payment", "created_at", "updated_at", "currency", "source", "reservation_expires_at", "inventory_released", "can_cancel",
        ]


class CreateOrderSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    delivery_method = serializers.ChoiceField(choices=["express", "standard", "pickup"], default="standard")
    car_id = serializers.IntegerField(required=False, min_value=1)
    checkout_key = serializers.CharField(required=False, max_length=80, allow_blank=False)
    quote_token = serializers.CharField(required=False, max_length=4096)


class ReturnRequestSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    order_number = serializers.CharField(source="item.order.order_number", read_only=True)
    order_id = serializers.IntegerField(source="item.order_id", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = ["id", "item", "item_name", "order_id", "order_number", "reason", "status", "seller_note", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "seller_note", "created_at", "updated_at"]
