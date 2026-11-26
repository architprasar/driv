"""Auction price discovery, timed lifecycle and winner checkout."""

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.cars.models import Car
from apps.orders.models import Order, OrderItem
from apps.orders.services import timeline, notify, cash
from .models import Auction, Bid, AuctionEvent


def broadcast(auction, bid=None):
    from .serializers import BidSerializer

    layer = get_channel_layer()
    if not layer:
        return
    data = {
        "type": "auction_update",
        "auction": {
            "current_bid": str(auction.current_bid),
            "status": auction.status,
            "end_time": auction.end_time.isoformat(),
            "reserve_met": auction.reserve_met,
        },
    }
    if bid:
        data["bid"] = BidSerializer(bid).data
    transaction.on_commit(
        lambda: async_to_sync(layer.group_send)(
            f"auction_{auction.pk}", {"type": "auction_update", "data": data}
        ),
        robust=True,
    )


@transaction.atomic
def close_auction(auction, reason="scheduled_close"):
    auction = (
        Auction.objects.select_for_update(of=("self",))
        .select_related("car__brand", "car__model", "winner")
        .get(pk=auction.pk)
    )
    if auction.status in {"ended", "sold"}:
        return auction, getattr(auction, "winning_order", None)
    won = auction.winner_id and auction.reserve_met
    auction.status = "sold" if won else "ended"
    auction.closed_at = timezone.now()
    auction.close_reason = reason
    auction.save(update_fields=["status", "closed_at", "close_reason"])
    AuctionEvent.objects.create(
        auction=auction, event_type="auction_closed", payload={"status": auction.status}
    )
    order = None
    if won:
        car = Car.objects.select_for_update().get(pk=auction.car_id)
        if car.status not in {"active", "draft"}:
            raise ValidationError(
                "This vehicle is already reserved or sold. Contact support before closing this lot."
            )
        order, created = Order.objects.get_or_create(
            auction=auction,
            defaults={
                "user_id": auction.winner_id,
                "source": "auction",
                "delivery_method": "pickup",
                "currency": settings.MARKETPLACE_CURRENCY,
                "subtotal": auction.current_bid,
                "tax": cash(
                    auction.current_bid * Decimal(settings.MARKETPLACE_TAX_RATE)
                ),
                "total": cash(
                    auction.current_bid * (1 + Decimal(settings.MARKETPLACE_TAX_RATE))
                ),
                "inventory_reserved": True,
                "reservation_expires_at": timezone.now()
                + timedelta(hours=settings.AUCTION_PAYMENT_HOURS),
            },
        )
        if created:
            OrderItem.objects.create(
                order=order,
                car=car,
                seller_id=auction.vendor_id,
                name=str(car),
                quantity=1,
                unit_price=auction.current_bid,
            )
            Car.objects.filter(pk=car.pk).update(status="reserved")
            timeline(
                order,
                "placed",
                "Auction won",
                f"Complete payment for lot {auction.lot_number} before your reservation expires.",
            )
            notify(
                auction.winner_id,
                "You won an auction",
                f"Complete checkout for lot {auction.lot_number}.",
                f"/profile/orders/{order.pk}",
                "bids",
            )
            notify(
                auction.vendor_id,
                "Auction winner declared",
                f"Lot {auction.lot_number} is awaiting winner payment.",
                "/dashboard/auctions",
                "bids",
            )
            AuctionEvent.objects.create(
                auction=auction,
                event_type="winner_declared",
                payload={
                    "winner_id": auction.winner_id,
                    "final_price": str(auction.current_bid),
                },
            )
    else:
        notify(
            auction.vendor_id,
            "Auction ended",
            f"Lot {auction.lot_number} ended without meeting the reserve. You can list it again.",
            "/dashboard/auctions",
            "bids",
        )
    broadcast(auction)
    return auction, order


@transaction.atomic
def advance_auction(pk):
    auction = Auction.objects.select_for_update().get(pk=pk)
    now = timezone.now()
    if auction.status == "upcoming" and auction.start_time <= now < auction.end_time:
        auction.status = "live"
        auction.save(update_fields=["status"])
        broadcast(auction)
    if auction.status in {"upcoming", "live"} and auction.end_time <= now:
        auction, _ = close_auction(auction)
    return auction


def parse_amount(value):
    try:
        amount = Decimal(str(value))
        if (
            not amount.is_finite()
            or amount <= 0
            or amount != cash(amount)
            or amount >= Decimal("10000000000")
        ):
            raise InvalidOperation
        return amount
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(
            "Enter a positive bid with no more than two decimal places."
        )


@transaction.atomic
def submit_bid(pk, user, value, proxy=False):
    auction = advance_auction(pk)
    if auction.vendor_id == user.pk:
        raise ValidationError("Vendor cannot bid on own auction.")
    if settings.REQUIRE_VERIFIED_EMAIL_FOR_BIDDING and not user.email_verified_at:
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied(
            "Verify your email address in Account settings before placing an auction bid."
        )
    if auction.status != "live" or auction.end_time <= timezone.now():
        raise ValidationError("Auction is not live.")
    amount = parse_amount(value)
    floor = max(auction.starting_bid, auction.current_bid + auction.min_increment)
    if amount < floor:
        raise ValidationError(
            f"{'Proxy max' if proxy else 'Bid'} must be at least {floor}."
        )
    old_winner = auction.winner_id
    # Re-registering the leading bidder's maximum does not raise their own price.
    own_limits = list(
        auction.bids.filter(
            bidder=user, is_proxy=True, proxy_max__isnull=False
        ).values_list("proxy_max", flat=True)
    )
    if proxy and own_limits and amount < max(own_limits):
        raise ValidationError(
            "A registered proxy limit cannot be reduced during a live auction."
        )
    initial = (
        auction.current_bid
        if proxy and old_winner == user.pk
        else floor
        if proxy
        else amount
    )
    bid = Bid.objects.create(
        auction=auction,
        bidder=user,
        amount=initial,
        is_proxy=proxy,
        proxy_max=amount if proxy else None,
    )
    limits = list(
        auction.bids.values("bidder").annotate(
            limit=Max("proxy_max"), visible=Max("amount")
        )
    )
    for row in limits:
        row["maximum"] = max(row["limit"] or Decimal(0), row["visible"])
        row["first"] = (
            auction.bids.filter(bidder_id=row["bidder"])
            .order_by("created_at", "id")
            .values_list("id", flat=True)
            .first()
        )
    limits.sort(key=lambda row: (-row["maximum"], row["first"]))
    leader = limits[0]
    second = limits[1]["maximum"] if len(limits) > 1 else None
    target = (
        initial
        if not proxy
        else auction.current_bid
        if old_winner == user.pk
        else floor
    )
    if second is not None:
        target = max(target, min(leader["maximum"], second + auction.min_increment))
    target = max(auction.current_bid, target)
    if leader["bidder"] != user.pk or target != initial:
        visible = Bid.objects.create(
            auction=auction, bidder_id=leader["bidder"], amount=target, is_proxy=True
        )
    else:
        visible = bid
    auction.current_bid = target
    auction.winner_id = leader["bidder"]
    auction.lifecycle_managed = True
    auction.save(update_fields=["current_bid", "winner", "lifecycle_managed"])
    AuctionEvent.objects.create(
        auction=auction,
        event_type="bid_accepted",
        actor=user,
        payload={"bid_id": bid.pk, "current_bid": str(target)},
    )
    if old_winner and old_winner != auction.winner_id:
        notify(
            old_winner,
            "You have been outbid",
            f"A higher bid was accepted on lot {auction.lot_number}.",
            f"/auctions/{auction.pk}",
            "bids",
        )
    broadcast(auction, visible)
    return bid, auction


def advance_due_auctions():
    count = 0
    for pk in Auction.objects.filter(
        lifecycle_managed=True,
        status__in=["upcoming", "live"],
        start_time__lte=timezone.now(),
    ).values_list("pk", flat=True):
        try:
            advance_auction(pk)
            count += 1
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Could not advance auction %s; continuing other lots", pk
            )
    return count
