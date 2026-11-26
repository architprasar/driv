from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserAddress
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderTimeline
from apps.parts.models import Part, PartCategory

User = get_user_model()


class OrderCheckoutLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.buyer = User.objects.create_user(
            email="buyer@example.com",
            username="buyer",
            password="testpassword123",
            role="buyer",
        )
        self.seller = User.objects.create_user(
            email="seller@example.com",
            username="seller",
            password="testpassword123",
            role="seller",
        )

        self.address = UserAddress.objects.create(
            user=self.buyer,
            label="Home",
            full_name="Alex Buyer",
            street="123 Test Street",
            city="Detroit",
            state="MI",
            postal_code="48201",
            country="United States",
            is_default=True,
        )

        category = PartCategory.objects.create(name="Engine", slug="engine")
        self.part = Part.objects.create(
            seller=self.seller,
            category=category,
            name="Turbo Kit",
            sku="TURBO-1",
            description="Performance turbo kit",
            price=Decimal("150.00"),
            stock=5,
        )

        self.cart = Cart.objects.create(user=self.buyer)
        CartItem.objects.create(
            cart=self.cart,
            part=self.part,
            quantity=2,
            item_type="part",
        )

    def test_create_order_from_cart_happy_path(self):
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/orders/create_from_cart/",
            {"shipping_address_id": self.address.id, "delivery_method": "express"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

        order = Order.objects.get(user=self.buyer)
        self.assertEqual(order.status, "placed")
        self.assertEqual(order.subtotal, Decimal("300.00"))
        self.assertEqual(order.shipping_cost, Decimal("25.00"))
        self.assertEqual(order.tax, Decimal("24.00"))
        self.assertEqual(order.total, Decimal("349.00"))
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.timeline.count(), 1)
        self.assertTrue(
            OrderTimeline.objects.filter(order=order, status="placed", title="Order Placed").exists()
        )
        self.assertEqual(self.cart.items.count(), 0)

        self.assertIn("payment", response.data)
        self.assertIsNone(response.data["payment"])

    def test_create_order_rejects_address_not_owned_by_user(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            username="other",
            password="testpassword123",
            role="buyer",
        )
        other_address = UserAddress.objects.create(
            user=other_user,
            label="Home",
            full_name="Other Person",
            street="456 Other Street",
            city="Austin",
            state="TX",
            postal_code="73301",
            country="United States",
            is_default=True,
        )

        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(
            "/api/orders/create_from_cart/",
            {"shipping_address_id": other_address.id, "delivery_method": "standard"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Address not found.")

    def test_create_order_rejects_empty_cart(self):
        self.cart.items.all().delete()
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/orders/create_from_cart/",
            {"shipping_address_id": self.address.id, "delivery_method": "standard"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Cart is empty.")
