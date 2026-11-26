"""DEMO_MODE: production security with simulated checkout, never real payments."""

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from apps.core.checks import marketplace_launch_checks
from apps.payments.services import active_mode, test_enabled

PUBLIC = dict(
    DEBUG=False,
    SECRET_KEY="k" * 20 + "0123456789abcdefghijklmnopqrstuvwxyz",
    FRONTEND_URL="https://demo.example.com",
    ALLOWED_HOSTS=["demo.example.com", "testserver"],
    CSRF_TRUSTED_ORIGINS=["https://demo.example.com"],
    EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    LEGAL_BUSINESS_NAME="",
    LEGAL_BUSINESS_ADDRESS="",
    REQUIRE_VERIFIED_EMAIL_FOR_BIDDING=False,
)


def check_ids():
    return {message.id for message in marketplace_launch_checks(None)}


class DemoModeTests(SimpleTestCase):
    @override_settings(**PUBLIC, DEMO_MODE=True, PAYMENTS_MODE="test")
    def test_demo_mode_enables_simulated_checkout_without_debug(self):
        self.assertTrue(test_enabled())
        self.assertEqual(active_mode(), "test")

    @override_settings(**PUBLIC, DEMO_MODE=False, PAYMENTS_MODE="test")
    def test_simulated_checkout_stays_disabled_without_debug_or_demo(self):
        self.assertFalse(test_enabled())
        self.assertEqual(active_mode(), "stripe")

    @override_settings(**PUBLIC, DEMO_MODE=True, PAYMENTS_MODE="test")
    def test_launch_check_demo_allows_simulated_checkout_and_console_email(self):
        ids = check_ids()
        for relaxed in ("E003", "E007", "E011", "E014"):
            self.assertNotIn(f"marketplace.{relaxed}", ids)
        self.assertIn("marketplace.W001", ids)
        self.assertNotIn("marketplace.E001", ids)
        self.assertNotIn("marketplace.E002", ids)

    @override_settings(**PUBLIC, DEMO_MODE=True, PAYMENTS_MODE="stripe")
    def test_launch_check_demo_rejects_real_payment_provider(self):
        self.assertIn("marketplace.E003", check_ids())

    @override_settings(**PUBLIC, DEMO_MODE=False, PAYMENTS_MODE="test")
    def test_launch_check_without_demo_keeps_live_requirements(self):
        ids = check_ids()
        for required in ("E003", "E007", "E011", "E014"):
            self.assertIn(f"marketplace.{required}", ids)
        self.assertNotIn("marketplace.W001", ids)

    @override_settings(**{**PUBLIC, "DEBUG": True}, DEMO_MODE=True, PAYMENTS_MODE="test")
    def test_launch_check_demo_still_requires_debug_off(self):
        self.assertIn("marketplace.E001", check_ids())

    @override_settings(**PUBLIC, DEMO_MODE=True, PAYMENTS_MODE="test", SECURE_SSL_REDIRECT=False)
    def test_payment_config_reports_simulated_mode_in_demo(self):
        response = APIClient().get("/api/payments/config/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mode"], "test")
        self.assertTrue(response.json()["available"])
