from rest_framework import permissions, views
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from wagtail.contrib.settings.models import BaseSiteSetting
from wagtail.models import Site
from wagtail.rich_text import expand_db_html

from .models import ContentPage, HomePage, PartsPageSettings, SiteSettings


def image_url(request, image, spec="width-1600"):
    if not image:
        return None
    return request.build_absolute_uri(image.get_rendition(spec).url)


class Public(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class SiteSettingsView(Public):
    def get(self, request):
        site = Site.find_for_request(request) or Site.objects.filter(is_default_site=True).first()
        s = SiteSettings.for_site(site) if site else SiteSettings()
        return Response(
            {
                "brand_tagline": s.brand_tagline,
                "contact_email": s.contact_email,
                "contact_phone": s.contact_phone,
                "address": s.address,
                "social": {
                    "facebook": s.facebook_url,
                    "instagram": s.instagram_url,
                    "x": s.x_url,
                    "youtube": s.youtube_url,
                },
                "announcement": {
                    "enabled": bool(s.announcement_enabled and s.announcement_text),
                    "text": s.announcement_text,
                    "link": s.announcement_link,
                },
            }
        )


class HomeView(Public):
    def get(self, request):
        page = HomePage.objects.live().first()
        if not page:
            raise NotFound("The home page has not been created yet.")
        return Response(
            {
                "hero": {
                    "eyebrow": page.hero_eyebrow,
                    "title": page.hero_title,
                    "description": page.hero_description,
                    "image": image_url(request, page.hero_image),
                    "primary_cta": {"label": page.primary_cta_label, "href": page.primary_cta_link},
                    "secondary_cta": {"label": page.secondary_cta_label, "href": page.secondary_cta_link},
                },
                "badges": [
                    {"icon": b.icon, "title": b.title, "subtitle": b.subtitle}
                    for b in page.badges.all()
                ],
                "intents": [
                    {"icon": i.icon, "title": i.title, "subtitle": i.subtitle, "href": i.link}
                    for i in page.intents.all()
                ],
            }
        )


def blocks_json(request, body):
    out = []
    for block in body:
        value = block.value
        if block.block_type == "paragraph":
            value = expand_db_html(value.source)
        elif block.block_type == "image":
            value = {"url": image_url(request, value, "width-1200"), "alt": value.title}
        elif block.block_type == "callout":
            value = {"title": value["title"], "text": value["text"]}
        out.append({"type": block.block_type, "value": value})
    return out


class ContentPageView(Public):
    def get(self, request, slug):
        page = ContentPage.objects.live().filter(slug=slug).first()
        if not page:
            raise NotFound("Page not found.")
        return Response(
            {
                "title": page.title,
                "slug": page.slug,
                "intro": page.intro,
                "updated_at": page.last_published_at,
                "body": blocks_json(request, page.body),
            }
        )


class PartsPageView(Public):
    def get(self, request):
        site = Site.find_for_request(request) or Site.objects.filter(is_default_site=True).first()
        s = PartsPageSettings.for_site(site) if site else PartsPageSettings()
        return Response(
            {
                "eyebrow": s.hero_eyebrow,
                "title": s.hero_title,
                "description": s.hero_description,
                "promises": [dict(block.value) for block in s.promises],
                "seller_cta": {"title": s.seller_cta_title, "text": s.seller_cta_text},
            }
        )
