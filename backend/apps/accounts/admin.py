from django.contrib import admin
from .models import User, UserAddress


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["email", "username", "role", "is_verified", "date_joined"]
    list_filter = ["role", "is_verified"]
    search_fields = ["email", "username"]


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ["user", "label", "city", "state", "is_default"]
