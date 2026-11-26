from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.cms.models import ContentPage, HomePage, SiteSettings
from wagtail.models import Site


class CmsApiTests(TestCase):
    def setUp(self):
        call_command("seed_cms", verbosity=0)
        self.client = APIClient()

    def test_seed_is_idempotent(self):
        call_command("seed_cms", verbosity=0)
        self.assertEqual(HomePage.objects.count(), 1)
        self.assertEqual(ContentPage.objects.filter(slug="about").count(), 1)

    def test_home_edits_are_served_publicly(self):
        page = HomePage.objects.get()
        page.hero_title = "Edited headline"
        page.save_revision().publish()
        data = self.client.get("/api/cms/home/").json()
        self.assertEqual(data["hero"]["title"], "Edited headline")
        self.assertEqual(len(data["badges"]), 3)
        self.assertEqual(len(data["intents"]), 4)

    def test_site_settings_announcement_requires_text(self):
        settings_obj = SiteSettings.for_site(Site.objects.get(is_default_site=True))
        settings_obj.announcement_enabled = True
        settings_obj.save()
        self.assertFalse(self.client.get("/api/cms/site/").json()["announcement"]["enabled"])
        settings_obj.announcement_text = "Diwali sale"
        settings_obj.save()
        self.assertTrue(self.client.get("/api/cms/site/").json()["announcement"]["enabled"])

    def test_unpublished_and_missing_pages_are_404(self):
        page = ContentPage.objects.get(slug="about")
        page.unpublish()
        self.assertEqual(self.client.get("/api/cms/pages/about/").status_code, 404)
        self.assertEqual(self.client.get("/api/cms/pages/nope/").status_code, 404)

    def test_editor_screen_requires_login(self):
        response = self.client.get("/cms/")
        self.assertIn(response.status_code, {302, 403})
