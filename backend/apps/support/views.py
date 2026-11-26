from rest_framework import viewsets, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import HelpCategory, HelpArticle, SupportTicket, Testimonial
from .serializers import (
    HelpCategorySerializer,
    HelpArticleSerializer,
    SupportTicketSerializer,
    TestimonialSerializer,
)


class HelpCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HelpCategory.objects.prefetch_related("articles")
    serializer_class = HelpCategorySerializer


class HelpArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HelpArticle.objects.select_related("category")
    serializer_class = HelpArticleSerializer
    search_fields = ["title", "content"]
    filterset_fields = ["category__slug", "is_faq"]


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head"]

    def get_queryset(self):
        return SupportTicket.objects.filter(user=self.request.user).prefetch_related(
            "replies__author"
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def replies(self, request, pk=None):
        from .serializers import SupportReplySerializer

        ticket = self.get_object()
        serializer = SupportReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ticket=ticket, author=request.user)
        if ticket.status in {"resolved", "closed"}:
            ticket.status = "open"
            ticket.save(update_fields=["status", "updated_at"])
        ticket._prefetched_objects_cache = {}
        return Response(self.get_serializer(ticket).data, status=201)


class TestimonialListView(generics.ListAPIView):
    queryset = Testimonial.objects.filter(is_featured=True)
    serializer_class = TestimonialSerializer
    permission_classes = [permissions.AllowAny]
