from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.cars.models import CarBrand, CarModel, Car

User = get_user_model()


class CarAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com",
            username="testuser",
            password="testpassword123",
            role="seller"
        )
        self.brand = CarBrand.objects.create(name="Porsche", slug="porsche")
        self.car_model = CarModel.objects.create(brand=self.brand, name="911", slug="911")
        self.car = Car.objects.create(
            seller=self.user,
            brand=self.brand,
            model=self.car_model,
            year=2023,
            price="120000.00",
            mileage=5000,
            fuel_type="petrol",
            transmission="automatic",
            color="Silver",
            vin="WPOZZZ99Z12345678",
            location="Los Angeles, CA",
            condition="excellent",
            status="active"
        )
        self.car_two = Car.objects.create(
            seller=self.user,
            brand=self.brand,
            model=self.car_model,
            year=2021,
            price="90000.00",
            mileage=15000,
            fuel_type="petrol",
            transmission="manual",
            color="Black",
            vin="WPOZZZ99Z12345679",
            location="San Diego, CA",
            condition="good",
            status="active",
        )
        self.car_three = Car.objects.create(
            seller=self.user,
            brand=self.brand,
            model=self.car_model,
            year=2024,
            price="180000.00",
            mileage=800,
            fuel_type="electric",
            transmission="automatic",
            color="White",
            vin="WPOZZZ99Z12345680",
            location="Austin, TX",
            condition="new",
            status="active",
        )

    def test_list_cars(self):
        # AllowAny permission on list
        response = self.client.get("/api/cars/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)
        self.assertEqual(response.data["results"][0]["brand_name"], "Porsche")

    def test_retrieve_car(self):
        response = self.client.get(f"/api/cars/{self.car.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["vin"], "WPOZZZ99Z12345678")
        self.assertIn("trust_report", response.data)
        self.assertEqual(response.data["trust_report"]["inspection_points_checked"], 0)
        self.assertEqual(response.data["trust_report"]["inspection_status"], "not_inspected")
        # Views count should increment
        self.car.refresh_from_db()
        self.assertEqual(self.car.views_count, 1)

    def test_create_car_unauthenticated(self):
        response = self.client.post("/api/cars/", {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_car_authenticated(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "brand_id": self.brand.id,
            "model_id": self.car_model.id,
            "year": 2024,
            "price": "150000.00",
            "mileage": 100,
            "fuel_type": "petrol",
            "transmission": "automatic",
            "color": "Black",
            "vin": "WPOZZZ99Z87654321",
            "location": "Miami, FL",
            "condition": "new",
            "status": "draft"
        }
        response = self.client.post("/api/cars/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Car.objects.count(), 4)

    def test_filter_cars_by_price_range(self):
        response = self.client.get("/api/cars/?min_price=100000&max_price=130000")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.car.id)

    def test_sort_cars_by_price_asc(self):
        response = self.client.get("/api/cars/?sort=price_asc")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(ids, [self.car_two.id, self.car.id, self.car_three.id])

    def test_sort_cars_by_newest(self):
        response = self.client.get("/api/cars/?sort=newest")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(ids, [self.car_three.id, self.car_two.id, self.car.id])

    def test_ordering_still_supported(self):
        response = self.client.get("/api/cars/?ordering=mileage")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mileages = [item["mileage"] for item in response.data["results"]]
        self.assertEqual(mileages, [800, 5000, 15000])
