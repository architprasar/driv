from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from apps.core.pagination import WorkspacePagination
from .models import Order, OrderItem, ReturnRequest
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    CreateOrderSerializer,
    OrderItemSerializer,
    ReturnRequestSerializer,
)
from . import services


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = WorkspacePagination
    filterset_fields = ["status"]
    search_fields = ["order_number", "items__name"]

    def get_serializer_class(self):
        return OrderListSerializer if self.action == "list" else OrderDetailSerializer

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("shipping_address", "payment")
            .prefetch_related("items__return_request", "timeline")
            .distinct()
        )

    @action(detail=False, methods=["get"], url_path="checkout-attempt")
    def checkout_attempt(self, request):
        key = serializers.CharField(max_length=80, allow_blank=False).run_validation(
            request.query_params.get("key")
        )
        order = get_object_or_404(self.get_queryset(), checkout_key=key)
        return Response(OrderDetailSerializer(order).data)

    @action(detail=False, methods=["post"], serializer_class=CreateOrderSerializer)
    def create_from_cart(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order, created = services.create_checkout(
            request.user, serializer.validated_data
        )
        return Response(
            OrderDetailSerializer(order).data, status=201 if created else 200
        )

    @action(detail=False, methods=["get"])
    def quote(self, request):
        params = CreateOrderSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        if params.validated_data.get("car_id"):
            from apps.cars.models import Car

            car = get_object_or_404(Car, pk=params.validated_data["car_id"])
            services.check_product(request.user, car, "car", 1)
            lines = [("car", car, 1)]
        else:
            _, lines = services.cart_lines(request.user)
        totals = services.quote(
            lines, request.query_params.get("delivery_method", "standard")
        )
        from django.core import signing

        totals["quote_token"] = signing.dumps(
            services.quote_payload(request.user, lines, totals),
            salt="marketplace-quote",
            compress=True,
        )
        totals["items"] = [
            {
                "id": product.pk,
                "item_type": kind,
                "name": product.name if kind == "part" else str(product),
                "quantity": quantity,
                "unit_price": str(product.price),
                "subtotal": str(product.price * quantity),
            }
            for kind, product, quantity in lines
        ]
        return Response(totals)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = services.cancel_order(
            self.get_object(),
            request.user,
            str(request.data.get("reason", "Cancelled by customer")),
        )
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="retry-refund")
    def retry_refund(self, request, pk=None):
        from apps.payments.services import refund_payment
        from apps.payments.models import PaymentRefund

        order = self.get_object()
        refund = get_object_or_404(
            PaymentRefund,
            pk=serializers.IntegerField(min_value=1).run_validation(
                request.data.get("refund_id")
            ),
            payment__order=order,
            status__in=["failed", "canceled"],
        )
        result = refund_payment(
            refund.payment, refund.amount, refund.key, refund.reason
        )
        if result.key.startswith("return-"):
            ReturnRequest.objects.filter(pk=result.key.split("-")[-1]).update(
                status="refunded" if result.status == "succeeded" else "refund_pending"
            )
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"], url_path="delivery-address")
    def delivery_address(self, request, pk=None):
        from apps.accounts.models import UserAddress

        order = self.get_object()
        if order.status != "placed":
            raise ValidationError(
                "Delivery details can only be changed before payment."
            )
        address = get_object_or_404(
            UserAddress,
            user=request.user,
            pk=serializers.IntegerField(min_value=1).run_validation(
                request.data.get("shipping_address_id")
            ),
        )
        order.shipping_address = address
        order.shipping_snapshot = services.address_snapshot(address)
        order.save(update_fields=["shipping_address", "shipping_snapshot"])
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=["get"])
    def tracking(self, request, pk=None):
        return Response(OrderDetailSerializer(self.get_object()).data)


class SellerSaleView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        item = get_object_or_404(
            OrderItem.objects.select_related(
                "order__payment", "order__shipping_address", "return_request"
            ),
            pk=pk,
            seller=request.user,
        )
        order = item.order
        return Response(
            {
                "item": OrderItemSerializer(item).data,
                "order": {
                    "id": order.pk,
                    "order_number": order.order_number,
                    "status": order.status,
                    "payment_status": getattr(
                        getattr(order, "payment", None), "status", "unpaid"
                    ),
                    "currency": order.currency,
                    "delivery_method": "pickup"
                    if item.car_id
                    else order.delivery_method,
                    "shipping_address": order.shipping_snapshot,
                    "customer_name": order.shipping_snapshot.get(
                        "full_name", order.user.username
                    ),
                    "created_at": order.created_at,
                },
            }
        )

    def patch(self, request, pk):
        item = get_object_or_404(OrderItem, pk=pk, seller=request.user)
        item = (
            services.cancel_sale_item(
                item, request.user, request.data.get("fulfillment_note")
            )
            if request.data.get("status") == "cancelled"
            else services.fulfil_item(item, request.user, request.data)
        )
        return Response(OrderItemSerializer(item).data)


class ConfirmReceiptView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        item = get_object_or_404(OrderItem, pk=pk, order__user=request.user)
        return Response(
            OrderItemSerializer(
                services.confirm_received(
                    item, request.user, request.data.get("handover")
                )
            ).data
        )


class ReturnsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReturnRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = WorkspacePagination

    def get_queryset(self):
        qs = ReturnRequest.objects.filter(
            Q(customer=self.request.user) | Q(item__seller=self.request.user)
        ).select_related("item__order")
        if self.request.query_params.get("role") == "seller":
            qs = qs.filter(item__seller=self.request.user)
        elif self.request.query_params.get("role") == "customer":
            qs = qs.filter(customer=self.request.user)
        return qs.order_by("-created_at")

    def create(self, request):
        item = get_object_or_404(
            OrderItem,
            pk=serializers.IntegerField(min_value=1).run_validation(
                request.data.get("item")
            ),
            order__user=request.user,
        )
        result = services.request_return(item, request.user, request.data.get("reason"))
        return Response(self.get_serializer(result).data, status=201)

    @action(detail=True, methods=["post"])
    def decision(self, request, pk=None):
        result = services.resolve_return(
            self.get_object(),
            request.user,
            request.data.get("status"),
            request.data.get("seller_note"),
        )
        return Response(self.get_serializer(result).data)
