from django.db import models
from django.conf import settings


class Valuation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="valuations")
    car = models.ForeignKey("cars.Car", on_delete=models.SET_NULL, null=True, blank=True, related_name="valuations")
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    variant = models.CharField(max_length=100, blank=True)
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField()
    fuel_type = models.CharField(max_length=10, blank=True)
    transmission = models.CharField(max_length=10, blank=True)
    condition = models.CharField(max_length=20, blank=True)
    min_value = models.DecimalField(max_digits=12, decimal_places=2)
    max_value = models.DecimalField(max_digits=12, decimal_places=2)
    market_average = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    basis = models.CharField(max_length=25, default="legacy")
    similar_transactions = models.PositiveIntegerField(default=0)
    demand_premium = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    mileage_adjustment = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    valid_until = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class VehicleHistoryEvent(models.Model):
    EVENT_TYPES = [
        ("registration", "Registration"), ("maintenance", "Maintenance"),
        ("accident", "Accident"), ("recall", "Recall"),
        ("factory_ship", "Factory Ship"), ("ownership_transfer", "Ownership Transfer"),
        ("insurance_claim", "Insurance Claim"),
    ]

    car = models.ForeignKey("cars.Car", on_delete=models.CASCADE, related_name="history_events")
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    odometer = models.PositiveIntegerField(default=0)
    location = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list)
    verified = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]
