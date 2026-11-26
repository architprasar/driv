from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import Notification

User = get_user_model()


class NotificationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="notify@example.com",
            username="notify-user",
            password="testpassword123",
            role="buyer",
        )
        self.other_user = User.objects.create_user(
            email="notify-other@example.com",
            username="notify-other-user",
            password="testpassword123",
            role="buyer",
        )
        self.client.force_authenticate(user=self.user)

    def test_category_filter_and_user_isolation(self):
        Notification.objects.create(
            user=self.user,
            category="bids",
            title="Bid update",
            message="Your bid was outbid",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            category="orders",
            title="Order shipped",
            message="Tracking id attached",
            is_read=False,
        )
        Notification.objects.create(
            user=self.other_user,
            category="bids",
            title="Other user bid",
            message="Should not be visible",
            is_read=False,
        )

        bids_response = self.client.get("/api/notifications/?category=bids")
        self.assertEqual(bids_response.status_code, status.HTTP_200_OK)
        bids_results = bids_response.data["results"]
        self.assertEqual(len(bids_results), 1)
        self.assertEqual(bids_results[0]["category"], "bids")

        uppercase_response = self.client.get("/api/notifications/?category=BIDS")
        self.assertEqual(uppercase_response.status_code, status.HTTP_200_OK)
        uppercase_results = uppercase_response.data["results"]
        self.assertEqual(len(uppercase_results), 1)
        self.assertEqual(uppercase_results[0]["category"], "bids")

        invalid_response = self.client.get("/api/notifications/?category=invalid")
        self.assertEqual(invalid_response.status_code, status.HTTP_200_OK)
        self.assertEqual(invalid_response.data["results"], [])

    def test_mark_read_updates_single_notification(self):
        notification = Notification.objects.create(
            user=self.user,
            category="market",
            title="Price alert",
            message="A saved car dropped in price",
            is_read=False,
        )

        response = self.client.patch(f"/api/notifications/{notification.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_all_read_and_unread_count(self):
        Notification.objects.create(
            user=self.user,
            category="bids",
            title="Bid 1",
            message="Bid message 1",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            category="orders",
            title="Order 1",
            message="Order message 1",
            is_read=False,
        )
        Notification.objects.create(
            user=self.user,
            category="account",
            title="Profile update",
            message="Profile message",
            is_read=True,
        )

        unread_before = self.client.get("/api/notifications/unread_count/")
        self.assertEqual(unread_before.status_code, status.HTTP_200_OK)
        self.assertEqual(unread_before.data["unread_count"], 2)

        read_all_response = self.client.post("/api/notifications/read-all/")
        self.assertEqual(read_all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_all_response.data["marked_read"], 2)
        self.assertEqual(read_all_response.data["unread_count"], 0)

        unread_after = self.client.get("/api/notifications/unread_count/")
        self.assertEqual(unread_after.status_code, status.HTTP_200_OK)
        self.assertEqual(unread_after.data["unread_count"], 0)
