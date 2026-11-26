from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.parts.models import Part, PartCategory

User = get_user_model()


class PartAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            email="seller@example.com",
            username="seller",
            password="testpassword123",
            role="seller",
        )
        self.other_seller = User.objects.create_user(
            email="other@example.com",
            username="other",
            password="testpassword123",
            role="seller",
        )
        self.category = PartCategory.objects.create(name="Brakes", slug="brakes")

        self.my_part = Part.objects.create(
            seller=self.seller,
            category=self.category,
            name="Brake Rotor",
            sku="ROTOR-001",
            description="Front rotor",
            price="120.00",
            stock=2,
            is_genuine=True,
        )
        self.other_part = Part.objects.create(
            seller=self.other_seller,
            category=self.category,
            name="Brake Pad",
            sku="PAD-002",
            description="Rear pad",
            price="80.00",
            stock=3,
            is_genuine=False,
        )

    def test_list_parts_seller_me_authenticated_filters_to_current_seller(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.get("/api/parts/?seller=me")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.my_part.id)

    def test_list_parts_seller_me_unauthenticated_returns_empty(self):
        response = self.client.get("/api/parts/?seller=me")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_create_part_requires_authentication(self):
        payload = {
            "name": "Oil Filter",
            "sku": "FILTER-003",
            "description": "OEM oil filter",
            "price": "30.00",
            "stock": 5,
            "category_id": self.category.id,
            "is_genuine": True,
        }
        response = self.client.post("/api/parts/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_part_authenticated_sets_seller(self):
        self.client.force_authenticate(user=self.seller)
        payload = {
            "name": "Air Filter",
            "sku": "FILTER-004",
            "description": "Performance air filter",
            "price": "45.00",
            "stock": 4,
            "category_id": self.category.id,
            "is_genuine": True,
        }
        response = self.client.post("/api/parts/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Part.objects.get(id=response.data["id"])
        self.assertEqual(created.seller_id, self.seller.id)
