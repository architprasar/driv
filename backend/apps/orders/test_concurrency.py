"""Real concurrent transactions; these tests intentionally require PostgreSQL."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from django.contrib.auth import get_user_model
from django.db import connection, close_old_connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from apps.parts.models import Part, PartCategory
from apps.cart.models import Cart, CartItem
from .models import Order


@skipUnless(
    connection.vendor == "postgresql",
    "Concurrency assertions require PostgreSQL row locks.",
)
class ConcurrentCheckoutTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.seller = User.objects.create_user(
            email="seller@concurrent.test", username="seller"
        )
        self.buyers = [
            User.objects.create_user(
                email=f"buyer{i}@concurrent.test", username=f"buyer{i}"
            )
            for i in range(2)
        ]
        category = PartCategory.objects.create(name="Brakes", slug="brakes")
        self.part = Part.objects.create(
            seller=self.seller,
            category=category,
            name="Last kit",
            sku="LAST",
            price=100,
            stock=1,
        )
        for buyer in self.buyers:
            CartItem.objects.create(
                cart=Cart.objects.create(user=buyer),
                part=self.part,
                item_type="part",
                quantity=1,
            )

    def race(self, buyer_ids, keys):
        barrier = Barrier(2)

        def attempt(index):
            close_old_connections()
            try:
                user = get_user_model().objects.get(pk=buyer_ids[index])
                client = APIClient()
                client.force_authenticate(user)
                barrier.wait(timeout=10)
                result = client.post(
                    "/api/orders/create_from_cart/",
                    {"delivery_method": "pickup", "checkout_key": keys[index]},
                    format="json",
                )
                return result.status_code, result.data
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(attempt, range(2)))

    def test_two_customers_cannot_reserve_the_last_part_twice(self):
        results = self.race(
            [u.pk for u in self.buyers], ["first-unique-key", "second-unique-key"]
        )
        self.assertEqual(sorted(status for status, _ in results), [201, 400], results)
        self.assertEqual(Order.objects.count(), 1)
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 0)

    def test_parallel_retries_with_same_key_return_the_same_order(self):
        results = self.race([self.buyers[0].pk] * 2, ["retry-the-same-key"] * 2)
        self.assertEqual(sorted(status for status, _ in results), [200, 201], results)
        self.assertEqual(results[0][1]["id"], results[1][1]["id"])
        self.assertEqual(Order.objects.count(), 1)
        self.part.refresh_from_db()
        self.assertEqual(self.part.stock, 0)
