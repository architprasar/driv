from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from apps.support.models import HelpArticle, HelpCategory, Testimonial


class HelpCategoryViewSet(SnippetViewSet):
    model = HelpCategory
    icon = "folder-open-inverse"
    menu_label = "Help categories"
    menu_order = 300
    list_display = ["name", "slug"]


class HelpArticleViewSet(SnippetViewSet):
    model = HelpArticle
    icon = "help"
    menu_label = "Help & FAQ"
    menu_order = 310
    list_display = ["title", "category", "is_faq", "updated_at"]
    list_filter = ["is_faq", "category"]
    search_fields = ["title", "content"]


class TestimonialViewSet(SnippetViewSet):
    model = Testimonial
    icon = "openquote"
    menu_label = "Testimonials"
    menu_order = 320
    list_display = ["user_name", "rating", "is_featured"]


register_snippet(HelpCategoryViewSet)
register_snippet(HelpArticleViewSet)
register_snippet(TestimonialViewSet)
