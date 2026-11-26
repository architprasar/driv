"""Auditable commerce records; changes go through validated marketplace services."""
from django.contrib import admin
from apps.cars.models import CarEnquiry
from apps.orders.models import ReturnRequest
from apps.parts.models import PartQuestion, PartReview
from apps.payments.models import PaymentRefund, PaymentWebhook
from apps.vendors.models import VendorEarning


class CommerceRecordAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in (CarEnquiry, ReturnRequest, PartQuestion, PartReview,
              PaymentRefund, PaymentWebhook, VendorEarning):
    admin.site.register(model, CommerceRecordAdmin)
