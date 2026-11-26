from django.contrib import admin
from .models import EmailDelivery


@admin.register(EmailDelivery)
class EmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ["id", "subject", "status", "attempts", "next_attempt_at", "sent_at"]
    list_filter = ["status"]
    exclude = ["body", "html_body", "key"]
    readonly_fields = [
        "recipient",
        "subject",
        "status",
        "attempts",
        "next_attempt_at",
        "expires_at",
        "sent_at",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
