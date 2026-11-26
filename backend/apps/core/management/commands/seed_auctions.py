import random
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.cars.models import Car
from apps.auctions.models import Auction

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with mock auctions for existing cars."

    def handle(self, *args, **options):
        self.stdout.write("Seeding auctions...")

        seller = User.objects.filter(role="seller").first()
        if not seller:
            self.stdout.write(self.style.ERROR("No seller found. Run seed_data first."))
            return

        cars = list(Car.objects.filter(auction__isnull=True))
        if not cars:
            self.stdout.write(self.style.WARNING("No available cars to auction."))
            return

        damages = [("front", "major"), ("side", "moderate"), ("none", "minor")]
        status_options = ["live", "live", "upcoming"]

        for i, car in enumerate(cars[:3]):
            damage_type, severity = damages[i % len(damages)]
            status = status_options[i % len(status_options)]
            
            start_time = timezone.now() - timedelta(days=1) if status == "live" else timezone.now() + timedelta(days=2)
            end_time = start_time + timedelta(days=7)
            
            Auction.objects.create(
                car=car,
                vendor=seller,
                lot_number=f"LOT{car.year}{car.id}X",
                start_time=start_time,
                end_time=end_time,
                starting_bid=car.price * Decimal('0.2'),
                reserve_price=car.price * Decimal('0.8'),
                current_bid=car.price * Decimal('0.3') if status == "live" else 0,
                damage_type=damage_type,
                damage_severity=severity,
                estimated_repair_cost=5000 + (1000 * i),
                status=status
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded auctions!"))
