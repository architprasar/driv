from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user).order_by("-created_at", "-id")
        category = self.request.query_params.get("category")
        if category:
            normalized = category.strip().lower()
            valid_categories = {choice[0] for choice in Notification.CATEGORY_CHOICES}
            if normalized not in valid_categories:
                return queryset.none()
            queryset = queryset.filter(category=normalized)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            normalized_is_read = is_read.strip().lower()
            if normalized_is_read in {"true", "1", "yes"}:
                queryset = queryset.filter(is_read=True)
            elif normalized_is_read in {"false", "0", "no"}:
                queryset = queryset.filter(is_read=False)
            else:
                return queryset.none()
        return queryset

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.is_read:
            return Response(NotificationSerializer(notification).data)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"marked_read": count, "unread_count": 0}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})
