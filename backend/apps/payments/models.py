from django.db import models


class Payment(models.Model):
    METHOD_CHOICES = [
        ("card", "Credit Card"), ("digital_wallet", "Digital Wallet"),
        ("emi", "EMI"), ("bank_transfer", "Bank Transfer"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"), ("processing", "Processing"),
        ("completed", "Completed"), ("failed", "Failed"), ("refunded", "Refunded"), ("partially_refunded", "Partially refunded"),
    ]

    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="payment")
    stripe_payment_id = models.CharField(max_length=100, blank=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    mode = models.CharField(max_length=10, default="stripe")
    checkout_session_id = models.CharField(max_length=150, blank=True)
    payment_session_id = models.CharField(max_length=500, blank=True)
    checkout_url = models.URLField(max_length=2000, blank=True)
    refunded_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    attempt = models.PositiveIntegerField(default=1)
    emi_months = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.stripe_payment_id or self.pk} — {self.status}"


class PaymentRefund(models.Model):
    attempt = models.PositiveIntegerField(default=1)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="refunds")
    key = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    provider_id = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=15, default="pending")
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentWebhook(models.Model):
    event_id = models.CharField(max_length=150, unique=True)
    event_type = models.CharField(max_length=100)
    processed_at = models.DateTimeField(auto_now_add=True)
