from types import SimpleNamespace

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.cars.models import Car
from apps.auctions.models import Auction
from apps.orders.models import Order, OrderTimeline
from apps.parts.models import Part
from apps.payments.models import Payment
from apps.support.models import SupportTicket
from apps.vendors.models import VendorProfile, VendorActivity, VendorPayout

User = get_user_model()


class StaffWorkspaceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            username="staff", email="staff@example.com", is_staff=True,
            is_superuser=True,
        )
        cls.customer = User.objects.create_user(
            username="customer", email="customer@example.com",
        )

    def test_staff_can_open_operational_admin_pages(self):
        self.client.force_login(self.staff)
        for model in (Car, Part, Auction, Order, Payment, VendorProfile,
                      VendorPayout, VendorActivity, SupportTicket):
            url = reverse(f"admin:{model._meta.app_label}_{model._meta.model_name}_changelist")
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_customer_cannot_open_staff_admin(self):
        self.client.force_login(self.customer)
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 302)

    def test_staff_order_status_change_creates_customer_tracking_update(self):
        order = Order.objects.create(user=self.customer, subtotal=100, total=100)
        order.status = "shipped"
        request = RequestFactory().post("/admin/")
        request.user = self.staff
        admin.site._registry[Order].save_model(
            request, order, SimpleNamespace(changed_data=["status"]), True,
        )
        event = OrderTimeline.objects.get(order=order)
        self.assertEqual(event.status, "shipped")
        self.assertEqual(event.title, "Shipped")

    def test_staff_vendor_verification_is_recorded_in_business_activity(self):
        profile = VendorProfile.objects.create(
            user=self.customer, business_name="Garage", contact_person="Owner",
            business_email="garage@example.com", phone="1234567890",
        )
        profile.verification_status = "verified"
        request = RequestFactory().post("/admin/")
        request.user = self.staff
        admin.site._registry[VendorProfile].save_model(
            request, profile,
            SimpleNamespace(changed_data=["verification_status"]), True,
        )
        event = VendorActivity.objects.get(vendor=profile)
        self.assertEqual(event.event_type, "verification_updated")
        self.assertIn("Verified", event.description)
        self.assertFalse(admin.site._registry[Payment].has_add_permission(request))
        self.assertFalse(admin.site._registry[Payment].has_delete_permission(request))
