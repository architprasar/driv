from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.shortcuts import get_object_or_404
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Max
from .models import Auction, Bid, AuctionWatcher, AuctionEvent
from apps.orders.models import Order, OrderItem, OrderTimeline
from .serializers import (
    AuctionListSerializer, AuctionDetailSerializer,
    BidSerializer, LiveStatsSerializer, AuctionEventSerializer,
)


class AuctionViewSet(viewsets.ModelViewSet):
    from apps.core.pagination import WorkspacePagination
    pagination_class = WorkspacePagination
    search_fields = ["lot_number", "car__brand__name", "car__model__name"]
    lookup_value_regex = r"\d+"
    queryset = Auction.objects.select_related("car__brand", "car__model", "vendor").prefetch_related("bids", "car__images")

    def retrieve(self, request, *args, **kwargs):
        from .services import advance_auction
        get_object_or_404(Auction, pk=kwargs["pk"])
        advance_auction(kwargs["pk"])
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in {"update", "partial_update", "destroy"}:
            queryset = queryset.filter(vendor=self.request.user)
        location = self.request.query_params.get("location")
        if location:
            queryset = queryset.filter(car__location__icontains=location)
        damage = self.request.query_params.get("damage")
        sort = self.request.query_params.get("sort")
        status_filter = self.request.query_params.get("status")
        if damage:
            damage_map = {
                "Front-end Impact": "front",
                "Structural Damage": "side",
                "Water Damage": "flood",
            }
            damage_value = damage_map.get(damage, damage)
            queryset = queryset.filter(damage_type=damage_value)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if sort == "Bid Ends Soon":
            queryset = queryset.order_by("end_time")
        elif sort == "Newest Listed":
            queryset = queryset.order_by("-created_at")
        elif sort == "Highest Bid":
            queryset = queryset.order_by("-current_bid")
        elif sort == "Lowest Bid":
            queryset = queryset.order_by("current_bid")
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return AuctionListSerializer
        return AuctionDetailSerializer

    def get_permissions(self):
        if self.action in [
            "create", "update", "partial_update", "destroy",
            "start", "extend", "accept", "close", "place_bid", "proxy_bid", "watch",
        ]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @transaction.atomic
    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from apps.cars.models import Car
        car = Car.objects.select_for_update().get(pk=serializer.validated_data["car"].pk)
        if car.status not in {"active", "draft"}:
            raise ValidationError("This vehicle is no longer available for auction.")
        if car.seller_id != self.request.user.pk:
            raise ValidationError("Choose a vehicle from your own inventory.")
        if Auction.objects.filter(car=car, status__in=["upcoming", "live"]).exists():
            raise ValidationError("This vehicle already has an open auction.")
        serializer.save(car=car, vendor=self.request.user, lifecycle_managed=True)

    @transaction.atomic
    def perform_update(self, serializer):
        from apps.cars.models import Car
        from rest_framework.exceptions import ValidationError
        current = Auction.objects.select_for_update().get(pk=serializer.instance.pk)
        if current.status != "upcoming" or current.bids.exists():
            raise ValidationError("Only an upcoming auction without bids can be edited.")
        car = serializer.validated_data.get("car", current.car)
        Car.objects.select_for_update().get(pk=car.pk)
        serializer.instance = current
        serializer.validate(serializer.validated_data)
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        instance = Auction.objects.select_for_update().get(pk=instance.pk)
        if instance.status != "upcoming" or instance.bids.exists():
            raise ValidationError("Only upcoming auctions without bids can be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        with transaction.atomic():
            auction = get_object_or_404(Auction.objects.select_for_update(), pk=pk)
            if auction.vendor_id != request.user.pk:
                return Response({"detail": "Only the owner can start this auction."}, status=403)
            if auction.status != "upcoming" or auction.start_time > timezone.now() or auction.end_time <= timezone.now():
                return Response({"detail": "This auction can only start during its scheduled bidding window."}, status=400)
            auction.status = "live"
            auction.lifecycle_managed = True
            auction.save(update_fields=["status", "lifecycle_managed"])
        return Response({"status": "live"})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        from django.db.models import Count
        return Response({row["status"]: row["count"] for row in Auction.objects.values("status").annotate(count=Count("id"))})

    @action(detail=True, methods=["get"])
    def bids(self, request, pk=None):
        auction = self.get_object()
        bids = auction.bids.all()[:50]
        return Response(BidSerializer(bids, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        auction = self.get_object()
        events = auction.events.all()[:100]
        return Response(AuctionEventSerializer(events, many=True).data)

    def _broadcast(self, auction_id, payload):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"auction_{auction_id}",
            {"type": payload.get("type", "auction_update"), "data": payload},
        )

    def _record_event(self, auction, event_type, actor=None, payload=None):
        AuctionEvent.objects.create(
            auction=auction,
            event_type=event_type,
            actor=actor,
            payload=payload or {},
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def place_bid(self, request, pk=None):
        from .services import submit_bid, advance_auction
        get_object_or_404(Auction, pk=pk)
        advance_auction(pk)
        bid, auction = submit_bid(pk, request.user, request.data.get("amount"))
        return Response({**BidSerializer(bid, context={"request": request}).data, "current_bid": str(auction.current_bid)}, status=201)

    @action(detail=True, methods=["post"], url_path="proxy-bid", permission_classes=[permissions.IsAuthenticated])
    def proxy_bid(self, request, pk=None):
        from .services import submit_bid, advance_auction
        get_object_or_404(Auction, pk=pk)
        advance_auction(pk)
        bid, auction = submit_bid(pk, request.user, request.data.get("proxy_max"), proxy=True)
        return Response({**BidSerializer(bid, context={"request": request}).data, "current_bid": str(auction.current_bid)}, status=201)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    @transaction.atomic
    def watch(self, request, pk=None):
        auction = get_object_or_404(Auction.objects.select_for_update(), pk=pk)
        watcher, created = AuctionWatcher.objects.get_or_create(auction=auction, user=request.user)
        if not created:
            watcher.delete()
            auction.watchers_count = max(0, auction.watchers_count - 1)
            auction.save(update_fields=["watchers_count"])
            return Response({"watching": False})
        auction.watchers_count += 1
        auction.save(update_fields=["watchers_count"])
        return Response({"watching": True})

    @action(detail=True, methods=["get"], url_path="live-stats")
    def live_stats(self, request, pk=None):
        auction = self.get_object()
        active_bidders = auction.bids.values("bidder").distinct().count()
        total_bids = auction.bids.count()
        duration_minutes = max(1, (timezone.now() - auction.start_time).total_seconds() / 60)
        data = {
            "current_bid": auction.current_bid,
            "views_count": auction.views_count,
            "watchers_count": auction.watchers_count,
            "bid_count": total_bids,
            "active_bidders": active_bidders,
            "reserve_met": auction.reserve_met,
            "bid_frequency": round(total_bids / duration_minutes, 1),
        }
        return Response(LiveStatsSerializer(data).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    @transaction.atomic
    def extend(self, request, pk=None):
        auction = get_object_or_404(Auction.objects.select_for_update(), pk=pk)
        if auction.vendor != request.user:
            return Response({"detail": "Only the vendor can extend."}, status=status.HTTP_403_FORBIDDEN)
        from datetime import timedelta
        try:
            minutes = int(request.data.get("minutes", 2))
        except (TypeError, ValueError):
            return Response({"detail": "Enter an extension in whole minutes."}, status=400)
        if minutes < 1 or minutes > 1440 or auction.status != "live" or auction.end_time <= timezone.now():
            return Response({"detail": "Extend a live auction by between 1 and 1,440 minutes."}, status=400)
        auction.end_time += timedelta(minutes=minutes)
        auction.save(update_fields=["end_time"])
        self._record_event(auction, "auction_extended", request.user, {"minutes": minutes, "end_time": auction.end_time.isoformat()})
        from .services import broadcast
        broadcast(auction)
        return Response({"end_time": auction.end_time})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def close(self, request, pk=None):
        from .services import close_auction
        auction = get_object_or_404(Auction, pk=pk)
        if auction.vendor_id != request.user.pk:
            return Response({"detail": "Only the vendor can close."}, status=403)
        auction, order = close_auction(auction, "manual_close")
        return Response({"status": auction.status, "winner_id": auction.winner_id, "final_price": str(auction.current_bid), "order_id": order.pk if order else None})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, pk=None):
        return self.close(request, pk)
