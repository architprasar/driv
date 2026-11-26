from django.db import models
from django.conf import settings


class CarBrand(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to="brands/", blank=True)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CarModel(models.Model):
    brand = models.ForeignKey(CarBrand, on_delete=models.CASCADE, related_name="models")
    name = models.CharField(max_length=100)
    slug = models.SlugField()

    class Meta:
        ordering = ["name"]
        unique_together = ["brand", "slug"]

    def __str__(self):
        return f"{self.brand.name} {self.name}"


class Car(models.Model):
    FUEL_CHOICES = [
        ("petrol", "Petrol"), ("diesel", "Diesel"),
        ("electric", "Electric"), ("hybrid", "Hybrid"),
    ]
    TRANSMISSION_CHOICES = [("automatic", "Automatic"), ("manual", "Manual")]
    BODY_CHOICES = [
        ("sedan", "Sedan"), ("suv", "SUV"), ("coupe", "Coupe"),
        ("hatchback", "Hatchback"), ("truck", "Truck"), ("convertible", "Convertible"),
    ]
    CONDITION_CHOICES = [
        ("new", "New"), ("like_new", "Like New"), ("excellent", "Excellent"),
        ("good", "Good"), ("fair", "Fair"), ("salvage", "Salvage"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"), ("active", "Active"),
        ("sold", "Sold"), ("archived", "Archived"), ("reserved", "Reserved"),
    ]

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cars")
    brand = models.ForeignKey(CarBrand, on_delete=models.CASCADE, related_name="cars")
    model = models.ForeignKey(CarModel, on_delete=models.CASCADE, related_name="cars")
    variant = models.CharField(max_length=100, blank=True)
    year = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    mileage = models.PositiveIntegerField(help_text="Kilometers or miles driven")
    fuel_type = models.CharField(max_length=10, choices=FUEL_CHOICES)
    transmission = models.CharField(max_length=10, choices=TRANSMISSION_CHOICES)
    body_type = models.CharField(max_length=15, choices=BODY_CHOICES, blank=True)
    color = models.CharField(max_length=50)
    engine = models.CharField(max_length=100, blank=True)
    horsepower = models.PositiveIntegerField(null=True, blank=True)
    drivetrain = models.CharField(max_length=20, blank=True)
    vin = models.CharField(max_length=17, unique=True)
    location = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, default="good")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="draft")
    is_featured = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def auction(self):
        return self.auction_history.order_by("-created_at").first()

    def __str__(self):
        return f"{self.year} {self.brand.name} {self.model.name}"


class CarImage(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="cars/")
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class CarFeature(models.Model):
    CATEGORY_CHOICES = [
        ("safety", "Safety"), ("comfort", "Comfort"),
        ("technology", "Technology"), ("performance", "Performance"),
    ]
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="features")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class CarEnquiry(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="enquiries")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="car_enquiries")
    kind = models.CharField(max_length=15, choices=[("test_drive", "Test drive"), ("question", "Question")])
    message = models.TextField(blank=True)
    phone = models.CharField(max_length=20)
    preferred_at = models.DateTimeField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, default="requested", choices=[(s, s.title()) for s in ["requested", "scheduled", "completed", "cancelled"]])
    seller_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class FavoriteCar(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_cars")
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "car"], name="unique_saved_vehicle")]
