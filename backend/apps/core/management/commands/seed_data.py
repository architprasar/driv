import os
import random
import secrets
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.cars.models import CarBrand, CarModel, Car, CarImage
import requests
from django.core.files.base import ContentFile

User = get_user_model()

MOCK_CARS = [
    {
        "brand_name": "Porsche",
        "model_name": "911 Carrera S",
        "slug": "porsche-911",
        "year": 2021,
        "mileage": 12450,
        "price": "118400.00",
        "location": "San Francisco, CA",
        "image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1400&auto=format&fit=crop",
    },
    {
        "brand_name": "BMW",
        "model_name": "M4 Competition",
        "slug": "bmw-m4",
        "year": 2023,
        "mileage": 2100,
        "price": "89200.00",
        "location": "Austin, TX",
        "image": "https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1400&auto=format&fit=crop",
    },
    {
        "brand_name": "Audi",
        "model_name": "RS6 Avant",
        "slug": "audi-rs6",
        "year": 2022,
        "mileage": 8900,
        "price": "124000.00",
        "location": "Miami, FL",
        "image": "https://images.unsplash.com/photo-1541348263662-e068662d82af?q=80&w=1400&auto=format&fit=crop",
    },
    {
        "brand_name": "Chevrolet",
        "model_name": "Corvette C8",
        "slug": "corvette-c8",
        "year": 2022,
        "mileage": 5400,
        "price": "76500.00",
        "location": "Los Angeles, CA",
        "image": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1400&auto=format&fit=crop",
    },
    {
        "brand_name": "Land Rover",
        "model_name": "Range Rover Defender",
        "slug": "range-rover",
        "year": 2021,
        "mileage": 22000,
        "price": "72000.00",
        "location": "London, UK",
        "image": "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=1400&auto=format&fit=crop",
        "featured": True
    }
]

class Command(BaseCommand):
    help = "Seeds the database with essential mock vehicles and users."

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # Demo seller. Never a fixed password: this repository is public.
        seller, created = User.objects.get_or_create(
            email="seller@drivio.com",
            defaults={"username": "drivioseller", "role": "seller"},
        )
        if created:
            supplied = os.environ.get("SEED_SELLER_PASSWORD", "")
            seller.set_password(supplied or secrets.token_urlsafe(12))
            seller.save(update_fields=["password"])
            if supplied:
                self.stdout.write("Demo seller seller@drivio.com uses SEED_SELLER_PASSWORD.")
            else:
                self.stdout.write(
                    "Demo seller seller@drivio.com has a random password. "
                    "Use 'Forgot password' or 'manage.py changepassword seller@drivio.com' to sign in as it."
                )

        image_pool = [c["image"] for c in MOCK_CARS]
        total_target = 30

        for i in range(total_target):
            base = MOCK_CARS[i % len(MOCK_CARS)]
            cdata = dict(base)
            cdata["year"] = random.randint(2018, 2024)
            cdata["mileage"] = random.randint(1800, 78000)
            cdata["price"] = f"{random.randint(650000, 3900000)}.00"
            cdata["image"] = image_pool[i % len(image_pool)]
            cdata["featured"] = i < 8

            brand, _ = CarBrand.objects.get_or_create(
                name=cdata["brand_name"],
                slug=str(cdata["brand_name"]).lower().replace(" ", "-")
            )
            model, _ = CarModel.objects.get_or_create(
                brand=brand,
                name=cdata["model_name"],
                slug=cdata["slug"]
            )
            
            # Check if car exists
            vin = f"MOCKVIN{i:02d}{cdata['year']}{brand.id:02d}{model.id:02d}"[:17]
            if not Car.objects.filter(vin=vin).exists():
                car = Car.objects.create(
                    seller=seller,
                    brand=brand,
                    model=model,
                    year=cdata["year"],
                    price=cdata["price"],
                    mileage=cdata["mileage"],
                    fuel_type="petrol",
                    transmission="automatic",
                    color="Various",
                    vin=vin,
                    location=cdata["location"],
                    condition="excellent",
                    status="active",
                    is_featured=cdata.get("featured", False)
                )
                
                # Fetch image and add
                try:
                    res = requests.get(cdata["image"], timeout=20)
                    if res.status_code == 200:
                        car_img = CarImage(car=car, is_primary=True)
                        car_img.image.save(f"{cdata['slug']}-{i}.jpg", ContentFile(res.content), save=True)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to fetch image for {car.vin}: {e}"))
        
        self.stdout.write(self.style.SUCCESS("Successfully seeded the database!"))
