"""Editor-managed content. Wagtail is used headless: Next.js reads it via /api/cms/."""

from django.conf import settings
from django.db import models
from django.shortcuts import redirect
from modelcluster.fields import ParentalKey
from wagtail import blocks
from wagtail.admin.panels import FieldPanel, InlinePanel, MultiFieldPanel
from wagtail.contrib.settings.models import BaseSiteSetting, register_setting
from wagtail.fields import RichTextField, StreamField
from wagtail.images.blocks import ImageChooserBlock
from wagtail.models import Orderable, Page


def frontend_url(path):
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


@register_setting(icon="cog")
class SiteSettings(BaseSiteSetting):
    brand_tagline = models.CharField(
        max_length=160,
        default="India's trusted partner for a better driving tomorrow.",
        help_text="Short line shown under the logo in the footer.",
    )
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    x_url = models.URLField("X (Twitter) URL", blank=True)
    youtube_url = models.URLField(blank=True)
    announcement_enabled = models.BooleanField(
        default=False, help_text="Show a banner at the very top of every page."
    )
    announcement_text = models.CharField(max_length=200, blank=True)
    announcement_link = models.CharField(
        max_length=200, blank=True, help_text="Optional, e.g. /auctions or https://…"
    )

    panels = [
        FieldPanel("brand_tagline"),
        MultiFieldPanel(
            [FieldPanel("contact_email"), FieldPanel("contact_phone"), FieldPanel("address")],
            heading="Contact details",
        ),
        MultiFieldPanel(
            [
                FieldPanel("facebook_url"),
                FieldPanel("instagram_url"),
                FieldPanel("x_url"),
                FieldPanel("youtube_url"),
            ],
            heading="Social links",
        ),
        MultiFieldPanel(
            [
                FieldPanel("announcement_enabled"),
                FieldPanel("announcement_text"),
                FieldPanel("announcement_link"),
            ],
            heading="Announcement bar",
        ),
    ]

    class Meta:
        verbose_name = "Site settings"


class FrontendPage(Page):
    """Headless: previews and direct visits are sent to the Next.js site."""

    class Meta:
        abstract = True

    frontend_path = "/"

    def serve(self, request, *args, **kwargs):
        return redirect(frontend_url(self.frontend_path))


class HomePage(FrontendPage):
    max_count = 1
    parent_page_types = ["wagtailcore.Page"]
    subpage_types = ["cms.ContentPage"]

    hero_eyebrow = models.CharField(max_length=80, default="CARS FOR A BRIGHTER TOMORROW")
    hero_title = models.CharField(
        max_length=120,
        default="Every car journey starts here.",
        help_text="Keep it short; it wraps automatically.",
    )
    hero_description = models.TextField(
        default="Explore vehicles, ask sellers questions, follow live auctions and find parts for your next project."
    )
    hero_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Leave empty to keep the default showroom image. Wide image, at least 1600px.",
    )
    primary_cta_label = models.CharField(max_length=40, default="Explore Cars")
    primary_cta_link = models.CharField(max_length=200, default="/cars")
    secondary_cta_label = models.CharField(max_length=40, default="Sell Your Car")
    secondary_cta_link = models.CharField(max_length=200, default="/sell")

    content_panels = Page.content_panels + [
        MultiFieldPanel(
            [
                FieldPanel("hero_eyebrow"),
                FieldPanel("hero_title"),
                FieldPanel("hero_description"),
                FieldPanel("hero_image"),
            ],
            heading="Hero",
        ),
        MultiFieldPanel(
            [
                FieldPanel("primary_cta_label"),
                FieldPanel("primary_cta_link"),
                FieldPanel("secondary_cta_label"),
                FieldPanel("secondary_cta_link"),
            ],
            heading="Hero buttons",
        ),
        InlinePanel("badges", label="Hero highlight", max_num=3),
        InlinePanel("intents", label="Discovery card", max_num=4),
    ]


class HomeBadge(Orderable):
    page = ParentalKey(HomePage, related_name="badges", on_delete=models.CASCADE)
    icon = models.CharField(
        max_length=40,
        help_text="Material Symbols name, e.g. forum, gavel, receipt_long (fonts.google.com/icons).",
    )
    title = models.CharField(max_length=40)
    subtitle = models.CharField(max_length=40)

    panels = [FieldPanel("icon"), FieldPanel("title"), FieldPanel("subtitle")]


class HomeIntent(Orderable):
    page = ParentalKey(HomePage, related_name="intents", on_delete=models.CASCADE)
    icon = models.CharField(max_length=40, help_text="Material Symbols name, e.g. directions_car.")
    title = models.CharField(max_length=60)
    subtitle = models.CharField(max_length=90)
    link = models.CharField(max_length=200)

    panels = [
        FieldPanel("icon"),
        FieldPanel("title"),
        FieldPanel("subtitle"),
        FieldPanel("link"),
    ]


class ContentPage(FrontendPage):
    """About, Terms, Privacy, Contact and any other text page."""

    parent_page_types = ["cms.HomePage", "cms.ContentPage"]
    subpage_types = ["cms.ContentPage"]

    intro = models.CharField(max_length=300, blank=True)
    body = StreamField(
        [
            ("heading", blocks.CharBlock(form_classname="title", icon="title")),
            ("paragraph", blocks.RichTextBlock(features=["bold", "italic", "link", "ol", "ul", "h3", "h4"])),
            ("image", ImageChooserBlock()),
            (
                "callout",
                blocks.StructBlock(
                    [("title", blocks.CharBlock()), ("text", blocks.TextBlock())],
                    icon="warning",
                ),
            ),
        ],
        blank=True,
    )

    content_panels = Page.content_panels + [FieldPanel("intro"), FieldPanel("body")]

    @property
    def frontend_path(self):
        return f"/p/{self.slug}"


def _default_promises():
    return [
        ("promise", {"icon": "verified", "title": "Fitment checked", "text": "Every listing shows the brands and models it fits. Ask the seller before you buy."}),
        ("promise", {"icon": "shield", "title": "Condition, stated plainly", "text": "New, refurbished or used, with genuine OEM parts clearly marked."}),
        ("promise", {"icon": "assignment_return", "title": "Return window", "text": "Returns are handled through your saved order, with refunds tracked."}),
    ]


@register_setting(icon="cogs")
class PartsPageSettings(BaseSiteSetting):
    """Copy on the /parts landing page."""

    hero_eyebrow = models.CharField(max_length=60, default="Parts catalogue")
    hero_title = models.CharField(max_length=120, default="The right part, first time.")
    hero_description = models.TextField(
        default="Search by part name or SKU, then narrow by the car you drive. Genuine, refurbished and used parts from verified sellers."
    )
    promises = StreamField(
        [
            (
                "promise",
                blocks.StructBlock(
                    [
                        ("icon", blocks.CharBlock(help_text="Material Symbols name, e.g. verified, shield.")),
                        ("title", blocks.CharBlock(max_length=40)),
                        ("text", blocks.TextBlock(max_length=160)),
                    ]
                ),
            )
        ],
        blank=True,
        max_num=4,
        default=_default_promises,
    )
    seller_cta_title = models.CharField(max_length=80, default="Sell parts on DrivioCars")
    seller_cta_text = models.TextField(
        default="List your inventory, answer fitment questions and track every order from one dashboard."
    )

    panels = [
        MultiFieldPanel(
            [FieldPanel("hero_eyebrow"), FieldPanel("hero_title"), FieldPanel("hero_description")],
            heading="Hero",
        ),
        FieldPanel("promises"),
        MultiFieldPanel(
            [FieldPanel("seller_cta_title"), FieldPanel("seller_cta_text")],
            heading="Seller call to action",
        ),
    ]

    class Meta:
        verbose_name = "Parts page"
