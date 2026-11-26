import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from apps.parts.models import PartCategory, Part, PartImage
from apps.cars.models import CarBrand, CarModel

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with mock parts and categories."

    def handle(self, *args, **options):
        self.stdout.write("Seeding parts...")

        seller = User.objects.filter(role="seller").first()
        if not seller:
            self.stdout.write(self.style.ERROR("No seller found. Run seed_data first."))
            return

        categories_data = [
            {"name": "Engine Block", "desc": "Complete calibrated and tested assemblies", "img": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1200&auto=format&fit=crop"},
            {"name": "Transmission", "desc": "Manual & automatic gearbox units", "img": "https://images.unsplash.com/photo-1635764706279-d33f95f22f96?q=80&w=1200&auto=format&fit=crop"},
            {"name": "Wheels & Tires", "desc": "OEM and aftermarket fitments", "img": "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1200&auto=format&fit=crop"},
            {"name": "Performance Accessories", "desc": "Upgrade and tuning components", "img": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop"},
        ]
        
        cats = []
        for c in categories_data:
            cat, created = PartCategory.objects.get_or_create(
                slug=slugify(c["name"]),
                defaults={"name": c["name"], "description": c["desc"]}
            )
            if created and c["img"]:
                try:
                    resp = requests.get(c["img"])
                    if resp.status_code == 200:
                        cat.image.save(f"{cat.slug}.jpg", ContentFile(resp.content), save=True)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to download image: {e}"))
            cats.append(cat)

        parts_data = [
            {"name": "Carbon Ceramic Brake Kit", "sku": "BRK-CC-001", "desc": "High performance brakes", "price": "2899.00", "cat_idx": 3, "is_featured": True, "img": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1200&auto=format&fit=crop"},
            {"name": "Titanium Exhaust Assembly", "sku": "EXH-TI-092", "desc": "Lightweight exhaust", "price": "4120.00", "cat_idx": 3, "is_featured": True, "img": "https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?q=80&w=1200&auto=format&fit=crop"},
            {"name": "Matrix LED Headlight Set", "sku": "LGT-MX-771", "desc": "Adaptive matrix LED", "price": "1258.00", "cat_idx": 3, "is_featured": True, "img": "https://images.unsplash.com/photo-1549399542-7e82138f9f95?q=80&w=1200&auto=format&fit=crop"},
            {"name": "High-Flow Intake System", "sku": "INT-HF-100", "desc": "Cold air intake", "price": "935.90", "cat_idx": 0, "is_featured": True, "img": "https://images.unsplash.com/photo-1619641805630-f97a8f3dcd89?q=80&w=1200&auto=format&fit=crop"},
        ]

        brand = CarBrand.objects.first()
        model = CarModel.objects.first()

        for p in parts_data:
            part, created = Part.objects.get_or_create(
                sku=p["sku"],
                defaults={
                    "seller": seller,
                    "category": cats[int(p["cat_idx"])],
                    "name": p["name"],
                    "description": p["desc"],
                    "price": p["price"],
                    "stock": 50,
                    "is_featured": p["is_featured"],
                    "rating": 4.8,
                    "review_count": 12,
                }
            )
            if created:
                if brand:
                    part.compatible_brands.add(brand)
                if model:
                    part.compatible_models.add(model)
                if p["img"]:
                    try:
                        resp = requests.get(p["img"])
                        if resp.status_code == 200:
                            img = PartImage(part=part, is_primary=True)
                            img.image.save(f"{part.sku}.jpg", ContentFile(resp.content), save=True)
                    except Exception as e:
                        pass
        
        self.stdout.write(self.style.SUCCESS("Successfully seeded parts!"))
