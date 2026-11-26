from django.contrib import admin
from .models import SupportTicket, SupportReply, HelpCategory, HelpArticle


class SupportReplyInline(admin.TabularInline):
    model = SupportReply
    extra = 0
    fields = ["body", "author", "created_at"]
    readonly_fields = ["author", "created_at"]
    can_delete = False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    inlines = [SupportReplyInline]
    list_display = ["id", "subject", "user", "status", "priority", "created_at"]
    list_filter = ["status", "priority"]
    search_fields = ["subject", "message", "user__email"]
    readonly_fields = ["user", "subject", "message", "created_at", "updated_at"]
    list_select_related = ["user"]

    def has_add_permission(self, request):
        return False

    def save_formset(self, request, form, formset, change):
        from apps.orders.services import notify

        instances = formset.save(commit=False)
        for reply in instances:
            if not reply.pk:
                reply.author = request.user
                reply.save()
                notify(
                    reply.ticket.user_id,
                    "Support replied to your request",
                    f"Your request #{reply.ticket_id} has a new reply.",
                    "/profile/support",
                    "account",
                )
        formset.save_m2m()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and "status" in form.changed_data:
            from apps.orders.services import notify

            notify(
                obj.user_id,
                "Support request updated",
                f"Request #{obj.pk} is {obj.get_status_display().lower()}.",
                "/profile/support",
                "account",
            )


admin.site.register(HelpCategory)
admin.site.register(HelpArticle)
