from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Custom user model for DrivioCars."""

    ROLE_CHOICES = [
        ("buyer", "Buyer"),
        ("seller", "Seller"),
        ("vendor", "Vendor"),
        ("admin", "Admin"),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="buyer")
    is_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        app_label = "accounts"
        constraints = [
            models.UniqueConstraint(
                Lower("email"), name="accounts_email_case_insensitive"
            )
        ]

    def __str__(self):
        return self.email


class UserAddress(models.Model):
    """Shipping / billing address linked to a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=20, default="home")  # home, office, etc.
    full_name = models.CharField(max_length=100)
    street = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=50, default="India")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "accounts"
        verbose_name_plural = "User addresses"

    def __str__(self):
        return f"{self.label} — {self.full_name}"
