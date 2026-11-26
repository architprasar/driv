from django.db import models
from django.conf import settings
from .storage import private_documents


class VendorProfile(models.Model):
    VERIFICATION_STATUS = [
        ("pending", "Pending"),
        ("under_review", "Under Review"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]
    TIER_CHOICES = [
        ("standard", "Standard"),
        ("gold", "Gold"),
        ("platinum", "Platinum"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vendor_profile",
    )
    business_name = models.CharField(max_length=200)
    tax_id = models.CharField(max_length=50, blank=True)
    contact_person = models.CharField(max_length=100)
    business_email = models.EmailField()
    phone = models.CharField(max_length=20)
    business_license = models.FileField(
        upload_to="vendor_docs/", blank=True, storage=private_documents
    )
    representative_id = models.FileField(
        upload_to="vendor_docs/", blank=True, storage=private_documents
    )
    verification_status = models.CharField(
        max_length=15, choices=VERIFICATION_STATUS, default="pending"
    )
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default="standard")
    stripe_account_id = models.CharField(max_length=100, blank=True)
    total_earnings = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_sales = models.PositiveIntegerField(default=0)
    active_listings = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name


class VendorPayout(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    vendor = models.ForeignKey(
        VendorProfile, on_delete=models.CASCADE, related_name="payouts"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    currency = models.CharField(max_length=3, default="INR")
    transfer_reference = models.CharField(max_length=150, blank=True)
    request_key = models.CharField(max_length=80, unique=True, null=True, blank=True)
    mode = models.CharField(max_length=10, default="stripe")
    initiated_at = models.DateTimeField(auto_now_add=True)


class VendorActivity(models.Model):
    vendor = models.ForeignKey(
        VendorProfile, on_delete=models.CASCADE, related_name="activities"
    )
    event_type = models.CharField(max_length=50)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Vendor activities"


class VendorEarning(models.Model):
    item = models.OneToOneField(
        "orders.OrderItem", on_delete=models.PROTECT, related_name="earning"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="earnings"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=15, default="pending")
    available_at = models.DateTimeField(null=True, blank=True)
    payout = models.ForeignKey(
        VendorPayout,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="earnings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
