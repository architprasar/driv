from django.contrib import admin
from .models import Car, CarBrand, CarModel, CarImage, CarFeature


class CarImageInline(admin.TabularInline):
    model = CarImage
    extra = 0


class CarFeatureInline(admin.TabularInline):
    model = CarFeature
    extra = 0


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ["id", "year", "brand", "model", "seller", "price", "status", "views_count"]
    list_filter = ["status", "brand", "fuel_type", "condition"]
    search_fields = ["vin", "brand__name", "model__name", "seller__email"]
    readonly_fields = ["views_count", "created_at", "updated_at"]
    list_select_related = ["brand", "model", "seller"]
    inlines = [CarImageInline, CarFeatureInline]

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        fields = list(self.readonly_fields)
        if obj and getattr(obj, "auction", None) and obj.auction.status in {"live", "upcoming"}:
            fields.extend(["price", "status"])
        return fields


admin.site.register(CarBrand)
admin.site.register(CarModel)
