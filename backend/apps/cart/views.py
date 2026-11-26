from django.db import transaction
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer


class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        cart, _ = Cart.objects.prefetch_related("items__part__images", "items__car__images").get_or_create(user=self.request.user)
        return cart


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).select_related("part", "car").prefetch_related("part__images", "car__images")

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        from apps.orders.services import check_product
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)
        attrs = serializer.validated_data
        kind = attrs["item_type"]
        product = attrs[kind]
        existing = cart.items.filter(item_type=kind, **{kind: product}).first()
        if existing:
            quantity = existing.quantity + attrs.get("quantity", 1) if kind == "part" else 1
            check_product(request.user, product, kind, quantity)
            existing.quantity = quantity
            existing.save(update_fields=["quantity"])
            return Response(self.get_serializer(existing).data)
        serializer.save(cart=cart)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        Cart.objects.select_for_update().get(user=request.user)
        return super().destroy(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        Cart.objects.select_for_update().get(user=request.user)
        return super().partial_update(request, *args, **kwargs)
