from django.db import models
from django.conf import settings


class SavedSearch(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_searches")
    name = models.CharField(max_length=100)
    filters = models.JSONField(default=dict)
    notify_push = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=True)
    new_matches_count = models.PositiveIntegerField(default=0)
    last_checked = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Saved searches"

    def __str__(self):
        return self.name
