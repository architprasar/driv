"""Core dashboard aggregation views."""
from rest_framework import views, permissions
from rest_framework.response import Response
from apps.cars.models import Car
from apps.cars.serializers import CarListSerializer
from apps.auctions.models import Bid
from apps.auctions.serializers import BidSerializer
from apps.orders.models import Order
from apps.valuations.models import Valuation


class DashboardView(views.APIView):
    """Aggregated dashboard data for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        garage = Car.objects.filter(seller=user).select_related("brand", "model").prefetch_related("images")[:8]
        incoming_bids = Bid.objects.filter(
            auction__vendor=user, auction__status="live"
        ).select_related("auction", "bidder").order_by("-created_at")[:20]
        recent_valuations = Valuation.objects.filter(user=user)[:10]
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "role": getattr(user, "role", "buyer"),
                "date_joined": user.date_joined,
            },
            "garage_count": Car.objects.filter(seller=user).count(),
            "active_bids_count": Bid.objects.filter(bidder=user, auction__status="live").count(),
            "orders_count": Order.objects.filter(user=user).count(),
            "unread_notifications": user.notifications.filter(is_read=False).count(),
            "garage": CarListSerializer(garage, many=True, context={"request": request}).data,
            "incoming_bids": BidSerializer(incoming_bids, many=True).data,
            "recent_valuations": [
                {
                    "id": v.id,
                    "year": v.year,
                    "make": v.brand,
                    "model": v.model,
                    "estimated_value_min": str(v.min_value),
                    "estimated_value_max": str(v.max_value),
                    "created_at": v.created_at,
                }
                for v in recent_valuations
            ],
        })


class GarageView(views.APIView):
    """User's listed cars."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cars = Car.objects.filter(seller=request.user).select_related("brand", "model").prefetch_related("images")
        return Response(CarListSerializer(cars, many=True, context={"request": request}).data)


class ActiveBidsView(views.APIView):
    """User's active auction bids."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bids = Bid.objects.filter(
            bidder=request.user, auction__status="live"
        ).select_related("auction").order_by("-created_at")[:20]
        return Response(BidSerializer(bids, many=True).data)


from django.db.models import Q
from apps.parts.models import Part
from apps.parts.serializers import PartListSerializer

class GlobalSearchView(views.APIView):
    """Search across cars and parts."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()[:200]
        if not query:
            return Response({"cars": [], "parts": []})
        
        # Search Cars
        cars = Car.objects.filter(status="active").exclude(auction_history__status__in=["upcoming", "live", "sold"]).filter(
            Q(brand__name__icontains=query) |
            Q(model__name__icontains=query) |
            Q(vin__icontains=query) |
            Q(condition__icontains=query)
        ).distinct().select_related("brand", "model").prefetch_related("images")[:10]

        # Search Parts
        parts = Part.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(category__name__icontains=query) |
            Q(sku__icontains=query)
        ).select_related("seller", "category").prefetch_related("images")[:10]

        return Response({
            "cars": CarListSerializer(cars, many=True, context={"request": request}).data,
            "parts": PartListSerializer(parts, many=True, context={"request": request}).data,
        })
