from django.contrib import admin
from .models import VendorProfile, VendorPayout, VendorActivity


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ["business_name", "user", "verification_status", "tier", "created_at"]
    list_filter = ["verification_status", "tier"]
    search_fields = ["business_name", "business_email", "user__email"]
    readonly_fields = ["created_at", "total_earnings", "total_sales", "active_listings", "stripe_account_id"]
    list_select_related = ["user"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and any(field in form.changed_data for field in ("verification_status", "tier")):
            VendorActivity.objects.create(
                vendor=obj,
                event_type="verification_updated",
                description=f"Business verification: {obj.get_verification_status_display()}. Membership: {obj.get_tier_display()}.",
            )


@admin.register(VendorPayout)
class VendorPayoutAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor", "amount", "status", "initiated_at"]
    list_filter = ["status"]
    search_fields = ["vendor__business_name"]
    readonly_fields = [field.name for field in VendorPayout._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
    list_select_related = ["vendor"]


@admin.register(VendorActivity)
class VendorActivityAdmin(admin.ModelAdmin):
    list_display = ["vendor", "event_type", "created_at"]
    search_fields = ["vendor__business_name", "description"]
    readonly_fields = ["vendor", "event_type", "description", "created_at"]

    def has_add_permission(self, request):
        return False
