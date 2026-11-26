"""Create the CMS home page, default site settings and starter pages (idempotent)."""

from django.core.management.base import BaseCommand
from wagtail.models import Page, Site
from wagtail.rich_text import RichText

from apps.cms.models import ContentPage, HomeBadge, HomeIntent, HomePage, SiteSettings

BADGES = [
    ("forum", "Ask sellers", "before buying"),
    ("receipt_long", "Saved orders", "track every step"),
    ("gavel", "Vehicle auctions", "follow your bids"),
]
INTENTS = [
    ("directions_car", "Explore available cars", "Compare details and seller records", "/cars"),
    ("sell", "Create your listing", "Set your price and manage enquiries", "/sell"),
    ("gavel", "Bid in live auctions", "Quality cars at exciting prices", "/auctions"),
    ("settings", "Find vehicle parts", "Check condition and compatibility", "/parts"),
]
PAGES = {
    "about": (
        "About DrivioCars",
        "A marketplace for cars, parts and auctions.",
        "DrivioCars brings buyers and sellers together in one place. Edit this page in the CMS.",
    ),
    "contact": (
        "Contact us",
        "We usually reply within one working day.",
        "Add your support email, phone and address under Settings → Site settings; they appear in the footer.",
    ),
}


class Command(BaseCommand):
    def handle(self, *args, **options):
        root = Page.get_first_root_node()
        home = HomePage.objects.first()
        if not home:
            # Wagtail ships a placeholder "Welcome" page with slug "home"; replace it.
            Page.objects.filter(depth=2, slug="home").exclude(
                content_type__model="homepage"
            ).delete()
            home = root.add_child(instance=HomePage(title="Home", slug="home"))
            for icon, title, subtitle in BADGES:
                HomeBadge.objects.create(page=home, icon=icon, title=title, subtitle=subtitle)
            for icon, title, subtitle, link in INTENTS:
                HomeIntent.objects.create(page=home, icon=icon, title=title, subtitle=subtitle, link=link)
            self.stdout.write("Created home page")
        site = Site.objects.filter(is_default_site=True).first()
        if site:
            site.root_page = home
            site.site_name = "DrivioCars"
            site.save()
        else:
            site = Site.objects.create(hostname="localhost", root_page=home, is_default_site=True, site_name="DrivioCars")
        for slug, (title, intro, text) in PAGES.items():
            if not ContentPage.objects.filter(slug=slug).exists():
                home.add_child(
                    instance=ContentPage(
                        title=title,
                        slug=slug,
                        intro=intro,
                        body=[("paragraph", RichText(f"<p>{text}</p>"))],
                    )
                )
                self.stdout.write(f"Created page /{slug}")
        SiteSettings.for_site(site)
        self.stdout.write(self.style.SUCCESS("CMS ready"))
