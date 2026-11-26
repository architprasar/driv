from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "order", "stripe_payment_id", "method", "amount", "currency", "status", "emi_months", "created_at", "mode", "refunded_amount"]
        read_only_fields = ["id", "stripe_payment_id", "status", "created_at"]


class CreatePaymentIntentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    method = serializers.ChoiceField(choices=["card", "digital_wallet", "emi"])
    emi_months = serializers.IntegerField(required=False, min_value=3, max_value=36)

    def validate(self, attrs):
        method = attrs.get("method")
        emi_months = attrs.get("emi_months")
        if method == "emi" and not emi_months:
            raise serializers.ValidationError({"emi_months": "This field is required when method is emi."})
        if method != "emi" and emi_months is not None:
            raise serializers.ValidationError({"emi_months": "Only supported when method is emi."})
        return attrs


class ConfirmPaymentSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    result = serializers.ChoiceField(choices=["succeed", "decline"], default="succeed")


class EMICalculatorSerializer(serializers.Serializer):
    principal = serializers.DecimalField(max_digits=12, decimal_places=2)
    rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=8.5)
    tenure_months = serializers.IntegerField(min_value=3, max_value=84)
