from django.contrib import admin
from .models import Auction, Bid, AuctionEvent


@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = ["lot_number", "car", "vendor", "status", "current_bid", "end_time"]
    list_filter = ["status", "damage_type"]
    search_fields = ["lot_number", "car__vin", "vendor__email"]
    readonly_fields = [field.name for field in Auction._meta.fields]
    list_select_related = ["car", "vendor"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Bid, AuctionEvent)
class AuctionHistoryAdmin(admin.ModelAdmin):
    readonly_fields = []

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
