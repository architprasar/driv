from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.cars.models import Car, CarBrand, CarModel
from .models import VehicleHistoryEvent

User = get_user_model()


class ValuationCreateAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="valuer@example.com",
            username="valuer-user",
            password="valuerpass123",
            role="seller",
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/valuations/"

    def test_create_valuation_returns_expected_payload_shape(self):
        payload = {
            "brand": "BMW",
            "model": "M3",
            "variant": "Competition",
            "year": 2022,
            "mileage": 18000,
            "condition": "excellent",
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["brand"], payload["brand"])
        self.assertEqual(response.data["model"], payload["model"])
        self.assertEqual(response.data["year"], payload["year"])
        self.assertEqual(response.data["mileage"], payload["mileage"])
        self.assertIn("min_value", response.data)
        self.assertIn("max_value", response.data)
        self.assertIn("market_average", response.data)
        self.assertIn("confidence_score", response.data)
        self.assertIn("confidence_label", response.data)
        self.assertIn("rationale_summary", response.data)
        self.assertIn("pricing_factors", response.data)
        self.assertIn("next_actions", response.data)
        self.assertIsInstance(response.data["pricing_factors"], list)
        self.assertGreaterEqual(response.data["confidence_score"], 0)
        self.assertLessEqual(response.data["confidence_score"], 100)
        self.assertIn(response.data["confidence_label"], ["low", "medium", "high"])
        self.assertEqual(response.data["valid_until"], str(date.today() + timedelta(days=14)))

    def test_create_valuation_rejects_invalid_year(self):
        payload = {
            "brand": "Tesla",
            "model": "Model 3",
            "year": 1985,
            "mileage": 12000,
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("year", response.data)

    def test_create_valuation_rejects_negative_mileage(self):
        payload = {
            "brand": "Audi",
            "model": "A4",
            "year": 2021,
            "mileage": -100,
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mileage", response.data)


class VehicleHistoryViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="history-owner@example.com",
            username="history-owner",
            password="historypass123",
            role="seller",
        )
        self.brand = CarBrand.objects.create(name="Toyota", slug="toyota")
        self.model = CarModel.objects.create(brand=self.brand, name="Corolla", slug="corolla")
        self.car = Car.objects.create(
            seller=self.user,
            brand=self.brand,
            model=self.model,
            year=2020,
            price=800000,
            mileage=34000,
            fuel_type="petrol",
            transmission="manual",
            body_type="sedan",
            color="White",
            vin="JT2AE09B3S0123456",
            location="Bengaluru",
            condition="good",
            status="active",
        )

    def test_vehicle_history_not_found_returns_404(self):
        url = reverse("vehicle-history", kwargs={"vin": "UNKNOWNVIN1234567"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Vehicle not found.")

    def test_vehicle_history_empty_events_returns_metadata(self):
        url = reverse("vehicle-history", kwargs={"vin": self.car.vin})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["vin"], self.car.vin)
        self.assertEqual(response.data["events"], [])
        self.assertEqual(response.data["total_events"], 0)
        self.assertIsNone(response.data["clean_title"])
        self.assertEqual(response.data["metadata"]["verified_events"], 0)
        self.assertEqual(response.data["metadata"]["unverified_events"], 0)
        self.assertFalse(response.data["metadata"]["has_open_recalls"])
        self.assertIsNone(response.data["metadata"]["last_event_date"])
        self.assertIn("generated_at", response.data["metadata"])
        self.assertEqual(response.data["metadata"]["sources"], [])

    def test_vehicle_history_flags_accident_and_recall_metadata(self):
        VehicleHistoryEvent.objects.create(
            car=self.car,
            event_type="maintenance",
            title="Major service",
            description="Service complete",
            date=date(2024, 5, 10),
            odometer=22000,
            location="Bengaluru",
            tags=["service"],
            verified=True,
        )
        VehicleHistoryEvent.objects.create(
            car=self.car,
            event_type="accident",
            title="Minor rear impact",
            description="Claim filed",
            date=date(2024, 8, 2),
            odometer=27000,
            location="Bengaluru",
            tags=["claim"],
            verified=False,
        )
        VehicleHistoryEvent.objects.create(
            car=self.car,
            event_type="recall",
            title="Brake module recall",
            description="Manufacturer bulletin",
            date=date(2025, 1, 8),
            odometer=32000,
            location="Bengaluru",
            tags=["recall"],
            verified=True,
        )

        url = reverse("vehicle-history", kwargs={"vin": self.car.vin})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_events"], 3)
        self.assertIsNone(response.data["clean_title"])
        self.assertTrue(response.data["has_recorded_accident"])
        self.assertEqual(response.data["metadata"]["verified_events"], 2)
        self.assertEqual(response.data["metadata"]["unverified_events"], 1)
        self.assertTrue(response.data["metadata"]["has_open_recalls"])
        self.assertEqual(response.data["metadata"]["last_event_date"], "2025-01-08")
