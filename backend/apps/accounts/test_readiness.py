from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail, signing
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.notifications.models import EmailDelivery
from apps.notifications.delivery import deliver_due_emails, deliver_email
from .views import queue_verification

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AccountReadinessTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="Customer@example.test",
            username="customer",
            password="Old-Customer-Pass-279!",
        )

    def token(self):
        token = RefreshToken.for_user(self.user)
        return str(token), str(token.access_token)

    def test_login_and_registration_use_case_insensitive_email_identity(self):
        result = self.client.post(
            "/api/auth/login/",
            {"email": "CUSTOMER@example.test", "password": "Old-Customer-Pass-279!"},
            format="json",
        )
        self.assertEqual(result.status_code, 200)
        result = self.client.post(
            "/api/auth/register/",
            {
                "email": "customer@EXAMPLE.test",
                "username": "duplicate",
                "password": "Another-Strong-Pass-274!",
                "password2": "Another-Strong-Pass-274!",
            },
            format="json",
        )
        self.assertEqual(result.status_code, 400)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email="customer@EXAMPLE.test", username="duplicate2"
            )

    def test_registration_verification_link_works_and_can_be_retried(self):
        result = self.client.post(
            "/api/auth/register/",
            {
                "email": "New@Example.test",
                "username": "newcustomer",
                "password": "New-Strong-Pass-274!",
                "password2": "New-Strong-Pass-274!",
            },
            format="json",
        )
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["user"]["email"], "new@example.test")
        self.assertFalse(result.data["user"]["email_verified"])
        delivery = EmailDelivery.objects.get(recipient="new@example.test")
        token = delivery.body.split("?token=")[1].split()[0]
        for _ in range(2):
            self.assertEqual(
                self.client.post(
                    "/api/auth/email/verify/", {"token": token}, format="json"
                ).status_code,
                200,
            )
        self.assertIsNotNone(
            User.objects.get(email="new@example.test").email_verified_at
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/email/verify/", {"token": "forged"}, format="json"
            ).status_code,
            400,
        )

    def test_expired_verification_link_is_rejected(self):
        with patch("django.core.signing.time.time", return_value=1):
            token = signing.dumps(
                {"uid": self.user.pk, "email": self.user.email},
                salt="email-verification",
            )
        self.assertEqual(
            self.client.post(
                "/api/auth/email/verify/", {"token": token}, format="json"
            ).status_code,
            400,
        )

    def test_failed_recovery_email_is_saved_retried_and_not_sent_again(self):
        with patch(
            "apps.notifications.delivery.EmailMultiAlternatives.send",
            side_effect=OSError("transport down"),
        ):
            result = self.client.post(
                "/api/auth/password/forgot/", {"email": self.user.email}, format="json"
            )
        self.assertEqual(result.status_code, 200)
        delivery = EmailDelivery.objects.get()
        self.assertEqual(delivery.status, "pending")
        self.assertEqual(delivery.attempts, 1)
        EmailDelivery.objects.filter(pk=delivery.pk).update(
            next_attempt_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(deliver_due_emails(), 1)
        delivery.refresh_from_db()
        self.assertEqual(delivery.status, "sent")
        self.assertEqual(delivery.body, "")
        self.assertEqual(len(mail.outbox), 1)
        self.assertFalse(deliver_email(delivery.pk))
        self.assertEqual(len(mail.outbox), 1)

    def test_expired_email_is_discarded_without_delivery(self):
        delivery = queue_verification(self.user)
        EmailDelivery.objects.filter(pk=delivery.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertFalse(deliver_email(delivery.pk))
        delivery.refresh_from_db()
        self.assertEqual(delivery.status, "expired")
        self.assertEqual(delivery.body, "")

    def test_password_change_revokes_old_sessions_and_keeps_current_session(self):
        refresh, access = self.token()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + access)
        result = self.client.post(
            "/api/auth/password/change/",
            {
                "current_password": "Old-Customer-Pass-279!",
                "new_password": "Different-New-Pass-285!",
            },
            format="json",
        )
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                "/api/auth/token/refresh/", {"refresh": refresh}, format="json"
            ).status_code,
            401,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + result.data["tokens"]["access"]
        )
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

    def test_logout_revokes_own_refresh_and_cannot_revoke_another_account(self):
        refresh, access = self.token()
        other = User.objects.create_user(email="other@example.test", username="other")
        other_token = str(RefreshToken.for_user(other))
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + access)
        self.assertEqual(
            self.client.post(
                "/api/auth/logout/", {"refresh": other_token}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/logout/", {"refresh": refresh}, format="json"
            ).status_code,
            200,
        )
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                "/api/auth/token/refresh/", {"refresh": refresh}, format="json"
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/token/refresh/", {"refresh": other_token}, format="json"
            ).status_code,
            200,
        )

    def test_password_reset_is_single_use_and_revokes_existing_tokens(self):
        refresh, access = self.token()
        data = {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "password": "Updated-Strong-Pass-274!",
            "password2": "Updated-Strong-Pass-274!",
        }
        self.assertEqual(
            self.client.post(
                "/api/auth/password/reset/", data, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/password/reset/", data, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/token/refresh/", {"refresh": refresh}, format="json"
            ).status_code,
            401,
        )
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + access)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_auth_throttle_returns_retry_after_and_support_reference(self):
        from .throttles import AuthenticationThrottle

        with patch.object(AuthenticationThrottle, "rate", "2/min", create=True):
            for _ in range(2):
                self.client.post(
                    "/api/auth/login/",
                    {"email": "unknown@example.test", "password": "wrong"},
                    format="json",
                )
            result = self.client.post(
                "/api/auth/login/",
                {"email": "unknown@example.test", "password": "wrong"},
                format="json",
            )
        self.assertEqual(result.status_code, 429)
        self.assertIn("Retry-After", result.headers)
        self.assertIn("request_id", result.data)

    def test_full_name_registration_allows_spaces_and_same_named_people(self):
        for index in range(2):
            result = self.client.post(
                "/api/auth/register/",
                {
                    "email": f"fullname{index}@example.test",
                    "full_name": "A Customer With Spaces",
                    "password": "Different-Strong-Pass-284!",
                    "password2": "Different-Strong-Pass-284!",
                },
                format="json",
            )
            self.assertEqual(result.status_code, 201, result.data)
            self.assertEqual(
                result.data["user"]["display_name"], "A Customer With Spaces"
            )
        self.assertEqual(
            User.objects.filter(first_name="A Customer With Spaces").count(), 2
        )
