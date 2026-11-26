from django.contrib import admin
from .models import Order, OrderItem, OrderTimeline


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = [field.name for field in OrderItem._meta.fields]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class OrderTimelineInline(admin.TabularInline):
    model = OrderTimeline
    extra = 0
    readonly_fields = ["status", "title", "description", "timestamp"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "total", "delivery_method", "created_at"]
    list_filter = ["status", "delivery_method", "created_at"]
    search_fields = ["order_number", "user__email", "tracking_number"]
    readonly_fields = [field.name for field in Order._meta.fields]
    list_select_related = ["user"]
    inlines = [OrderItemInline, OrderTimelineInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and "status" in form.changed_data:
            OrderTimeline.objects.create(
                order=obj,
                status=obj.status,
                title=obj.get_status_display(),
                description="Order status updated by support.",
            )
