from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.cars.models import CarBrand, CarModel, Car
from apps.parts.models import PartCategory, Part

User = get_user_model()


class GlobalSearchViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="search@example.com",
            username="search-user",
            password="searchpassword123",
            role="seller",
        )
        self.brand = CarBrand.objects.create(name="Porsche", slug="porsche")
        self.car_model = CarModel.objects.create(brand=self.brand, name="911", slug="911")
        self.car = Car.objects.create(
            seller=self.user,
            brand=self.brand,
            model=self.car_model,
            year=2022,
            price="115000.00",
            mileage=9000,
            fuel_type="petrol",
            transmission="automatic",
            color="Red",
            vin="WPOZZZ99Z12345001",
            location="Los Angeles, CA",
            condition="excellent",
            status="active",
        )
        self.category = PartCategory.objects.create(name="Brakes", slug="brakes")
        self.part = Part.objects.create(
            seller=self.user,
            category=self.category,
            name="Carbon Brake Kit",
            sku="BRK-911-001",
            description="OEM-compatible carbon ceramic brake kit for Porsche 911.",
            price="7200.00",
            stock=5,
        )

    def test_global_search_empty_query_returns_empty_lists(self):
        response = self.client.get("/api/dashboard/search/?q=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cars"], [])
        self.assertEqual(response.data["parts"], [])

    def test_global_search_returns_matching_cars_and_parts(self):
        response = self.client.get("/api/dashboard/search/?q=911")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data["cars"], list)
        self.assertIsInstance(response.data["parts"], list)
        self.assertEqual(response.data["cars"][0]["id"], self.car.id)
        self.assertEqual(response.data["parts"][0]["id"], self.part.id)
