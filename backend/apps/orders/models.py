from django.db import models
from django.conf import settings
import uuid


class Order(models.Model):
    STATUS_CHOICES = [
        ("placed", "Placed"), ("confirmed", "Confirmed"),
        ("shipped", "Shipped"), ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"), ("cancelled", "Cancelled"), ("returned", "Returned"),
    ]
    DELIVERY_CHOICES = [
        ("express", "Express"), ("standard", "Standard"), ("pickup", "Pickup"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="placed")
    shipping_address = models.ForeignKey("accounts.UserAddress", on_delete=models.SET_NULL, null=True)
    delivery_method = models.CharField(max_length=10, choices=DELIVERY_CHOICES, default="standard")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    driver_name = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="INR")
    shipping_snapshot = models.JSONField(default=dict, blank=True)
    checkout_key = models.CharField(max_length=80, null=True, blank=True)
    source = models.CharField(max_length=10, default="cart")
    auction = models.OneToOneField("auctions.Auction", on_delete=models.SET_NULL, null=True, blank=True, related_name="winning_order")
    reservation_expires_at = models.DateTimeField(null=True, blank=True)
    inventory_reserved = models.BooleanField(default=False)
    inventory_released = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "checkout_key"], name="unique_customer_checkout_key")]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"DRV-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    part = models.ForeignKey("parts.Part", on_delete=models.SET_NULL, null=True, blank=True)
    car = models.ForeignKey("cars.Car", on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=200)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="sold_order_items")
    fulfillment_status = models.CharField(max_length=20, default="pending")
    tracking_number = models.CharField(max_length=100, blank=True)
    carrier = models.CharField(max_length=100, blank=True)
    fulfillment_note = models.TextField(blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity


class OrderTimeline(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="timeline")
    status = models.CharField(max_length=30)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]


class ReturnRequest(models.Model):
    item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name="return_request")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, default="requested", choices=[(s, s.replace("_", " ").title()) for s in ["requested", "approved", "rejected", "received", "refund_pending", "refund_failed", "refunded"]])
    seller_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
