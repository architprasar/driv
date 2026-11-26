from django.db import models
from django.conf import settings


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.email}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def item_count(self):
        return self.items.count()


class CartItem(models.Model):
    ITEM_TYPE_CHOICES = [("part", "Part"), ("car", "Car")]

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    part = models.ForeignKey("parts.Part", on_delete=models.CASCADE, null=True, blank=True)
    car = models.ForeignKey("cars.Car", on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    item_type = models.CharField(max_length=5, choices=ITEM_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        if self.item_type == "part" and self.part:
            return self.part.price * self.quantity
        if self.item_type == "car" and self.car:
            return self.car.price
        return 0

    @property
    def item_name(self):
        if self.item_type == "part" and self.part:
            return self.part.name
        if self.item_type == "car" and self.car:
            return str(self.car)
        return "Unknown"
