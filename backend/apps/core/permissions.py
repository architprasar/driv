from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsListingOwner(BasePermission):
    """Public reads, authenticated writes, and owner-only mutations."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.seller_id == request.user.pk
