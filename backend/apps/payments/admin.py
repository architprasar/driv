from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "amount", "currency", "method", "status", "created_at"]
    list_filter = ["status", "currency", "method"]
    search_fields = ["order__order_number", "stripe_payment_id"]
    readonly_fields = [field.name for field in Payment._meta.fields]
    list_select_related = ["order"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
