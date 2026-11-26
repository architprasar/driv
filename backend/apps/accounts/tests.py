from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:3000",
)
class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="authuser@example.com",
            username="authuser",
            password="OldPassword123!",
        )

    def test_forgot_password_sends_reset_email_for_existing_user(self):
        response = self.client.post("/api/auth/password/forgot/", {"email": self.user.email}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Reset your DrivioCars password", mail.outbox[0].subject)
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)

    def test_forgot_password_returns_success_for_unknown_email(self):
        response = self.client.post("/api/auth/password/forgot/", {"email": "unknown@example.com"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_password_confirms_and_updates_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            "/api/auth/password/reset/",
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password2": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword123!"))

    def test_reset_password_rejects_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            "/api/auth/password/reset/",
            {
                "uid": uid,
                "token": "invalid-token",
                "password": "NewStrongPassword123!",
                "password2": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
