from django.contrib import admin
from .models import Part, PartCategory, PartImage


class PartImageInline(admin.TabularInline):
    model = PartImage
    extra = 0


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "seller", "category", "price", "stock"]
    list_filter = ["category", "is_genuine"]
    search_fields = ["name", "sku", "seller__email"]
    readonly_fields = ["created_at", "rating", "review_count"]
    list_select_related = ["seller", "category"]
    inlines = [PartImageInline]

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(PartCategory)
