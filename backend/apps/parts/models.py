from django.db import models
from django.conf import settings


class PartCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    image = models.ImageField(upload_to="part_categories/", blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Part categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Part(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parts")
    category = models.ForeignKey(PartCategory, on_delete=models.CASCADE, related_name="parts")
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    compatible_brands = models.ManyToManyField("cars.CarBrand", blank=True, related_name="compatible_parts")
    compatible_models = models.ManyToManyField("cars.CarModel", blank=True, related_name="compatible_parts")
    condition = models.CharField(max_length=15, default="used", choices=[("new", "New"), ("used", "Used"), ("refurbished", "Refurbished")])
    is_genuine = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def in_stock(self):
        return self.stock > 0


class PartImage(models.Model):
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="parts/")
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary"]


class PartReview(models.Model):
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="reviews")
    item = models.OneToOneField("orders.OrderItem", on_delete=models.CASCADE, related_name="review")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class PartQuestion(models.Model):
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="questions")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)
    message = models.TextField()
    seller_note = models.TextField(blank=True)
    status = models.CharField(max_length=15, default="requested", choices=[(s, s.title()) for s in ["requested", "completed", "cancelled"]])
    created_at = models.DateTimeField(auto_now_add=True)
