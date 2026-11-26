from django.db import models
from django.conf import settings


class Notification(models.Model):
    CATEGORY_CHOICES = [
        ("bids", "Bids"),
        ("market", "Market"),
        ("account", "Account"),
        ("orders", "Orders"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class EmailDelivery(models.Model):
    """A durable retry record; email delivery never rolls back a paid order."""

    key = models.CharField(max_length=160, unique=True)
    recipient = models.EmailField()
    subject = models.CharField(max_length=250)
    body = models.TextField()
    html_body = models.TextField(blank=True)
    status = models.CharField(
        max_length=12,
        default="pending",
        choices=[("pending", "Pending"), ("sent", "Sent"), ("expired", "Expired")],
    )
    attempts = models.PositiveIntegerField(default=0)
    next_attempt_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["status", "next_attempt_at"])]
