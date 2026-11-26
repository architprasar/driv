"""Authenticated workspace read models. Every query is scoped to its owner."""
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import generics, permissions, views
from .pagination import WorkspacePagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from apps.auctions.models import Auction, Bid
from apps.auctions.serializers import AuctionListSerializer
from apps.cars.models import Car
from apps.cars.serializers import CarListSerializer, CarDetailSerializer
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderListSerializer
from apps.parts.models import Part
from apps.parts.serializers import PartListSerializer, PartDetailSerializer
from apps.payments.models import Payment
from apps.valuations.models import Valuation
from apps.vendors.models import VendorProfile
from apps.vendors.serializers import VendorPayoutSerializer, VendorActivitySerializer


def paginate(request, queryset, serializer):
    paginator = WorkspacePagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(serializer(page))


def money(value):
    return str(value or Decimal("0"))


class WorkspaceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, section):
        user = request.user
        search = request.query_params.get("search", "").strip()
        state = request.query_params.get("status", "")
        cars = Car.objects.filter(seller=user).select_related("brand", "model").prefetch_related("images")
        parts = Part.objects.filter(seller=user).select_related("category").prefetch_related("images")
        auctions = Auction.objects.filter(vendor=user).select_related("car__brand", "car__model").prefetch_related("car__images", "bids")
        sales = OrderItem.objects.filter(Q(seller=user) | Q(seller__isnull=True, car__seller=user) | Q(seller__isnull=True, part__seller=user)).select_related("order", "order__payment")
        line_total = ExpressionWrapper(F("unit_price") * F("quantity"), output_field=DecimalField(max_digits=18, decimal_places=2))

        if section == "summary":
            orders = Order.objects.filter(user=user)
            payments = Payment.objects.filter(order__user=user)
            now = timezone.now()
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            paid_sales = sales.filter(order__payment__status__in=["completed", "partially_refunded"]).exclude(order__status="cancelled").exclude(fulfillment_status__in=["cancelled", "returned"])
            sales_currencies = list(paid_sales.values_list("order__payment__currency", flat=True).distinct())
            sales_currency = request.query_params.get("currency", sales_currencies[0] if sales_currencies else "INR")
            paid_sales = paid_sales.filter(order__payment__currency=sales_currency)
            history = list(paid_sales.filter(order__created_at__gte=start-timedelta(days=160)).annotate(month=TruncMonth("order__created_at")).values("month").annotate(amount=Sum(line_total)).order_by("month"))
            payment_totals = list(payments.values("currency", "status").annotate(amount=Sum("amount")).order_by("currency", "status"))
            profile = VendorProfile.objects.filter(user=user).first()
            return Response({
                "cars": cars.count(), "active_cars": cars.filter(status="active").count(),
                "draft_cars": cars.filter(status="draft").count(), "sold_cars": cars.filter(status="sold").count(),
                "parts": parts.count(), "low_stock": parts.filter(stock__lte=3).count(),
                "views": cars.aggregate(total=Sum("views_count"))["total"] or 0,
                "live_auctions": auctions.filter(status="live").count(),
                "auction_bids": Bid.objects.filter(auction__vendor=user).count(),
                "active_bids": Bid.objects.filter(bidder=user, auction__status="live").values("auction_id").distinct().count(),
                "orders": orders.count(),
                "open_orders": orders.exclude(status__in=["delivered", "cancelled"]).count(),
                "unread_notifications": user.notifications.filter(is_read=False).count(),
                "saved_searches": user.saved_searches.count(),
                "sales_currency": sales_currency, "sales_currencies": sales_currencies,
                "sales_count": sales.values("order_id").distinct().count(),
                "paid_sales_value": money(paid_sales.aggregate(total=Sum(line_total))["total"]),
                "monthly_sales_value": money(paid_sales.filter(order__created_at__gte=start).aggregate(total=Sum(line_total))["total"]),
                "sales_history": [{"month": row["month"].strftime("%b %Y"), "amount": money(row["amount"])} for row in history],
                "payment_totals": [{**row, "amount": money(row["amount"])} for row in payment_totals],
                "recent_orders": OrderListSerializer(orders[:4], many=True).data,
                "recent_cars": [{**CarListSerializer(c, context={"request": request}).data, "status": c.status, "views_count": c.views_count} for c in cars[:4]],
                "inventory_status": list(cars.values("status").annotate(count=Count("id")).order_by("status")),
                "vendor": {"business_name": profile.business_name, "verification_status": profile.verification_status, "tier": profile.tier} if profile else None,
            })

        if section in ("cars", "parts"):
            qs = cars if section == "cars" else parts
            if search:
                qs = qs.filter(Q(brand__name__icontains=search) | Q(model__name__icontains=search) | Q(vin__icontains=search)) if section == "cars" else qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))
            if state and section == "cars": qs = qs.filter(status=state)
            if state == "low_stock" and section == "parts": qs = qs.filter(stock__lte=3)
            if state == "in_stock" and section == "parts": qs = qs.filter(stock__gt=0)
            if state == "out_of_stock" and section == "parts": qs = qs.filter(stock=0)
            ordering = request.query_params.get("ordering", "-created_at")
            if ordering not in ("price", "-price", "created_at", "-created_at"): ordering = "-created_at"
            qs = qs.order_by(ordering, "-id")
            def serialize(page):
                if section == "parts": return PartListSerializer(page, many=True, context={"request": request}).data
                return [{**CarListSerializer(c, context={"request": request}).data, "status": c.status, "views_count": c.views_count, "vin": c.vin, "has_auction": Auction.objects.filter(car=c, status__in=["upcoming", "live"]).exists()} for c in page]
            return paginate(request, qs, serialize)

        if section == "auctions":
            if state: auctions = auctions.filter(status=state)
            if search: auctions = auctions.filter(Q(lot_number__icontains=search) | Q(car__brand__name__icontains=search) | Q(car__model__name__icontains=search))
            return paginate(request, auctions.order_by("-created_at", "-id"), lambda page: AuctionListSerializer(page, many=True).data)

        if section == "bids":
            bids = Bid.objects.filter(bidder=user).select_related("auction__car__brand", "auction__car__model").order_by("-created_at", "-id")
            if state: bids = bids.filter(auction__status=state)
            if search: bids = bids.filter(auction__lot_number__icontains=search)
            return paginate(request, bids, lambda page: [{"id": b.id, "auction_id": b.auction_id, "title": str(b.auction.car), "lot_number": b.auction.lot_number, "amount": str(b.amount), "current_bid": str(b.auction.current_bid), "status": b.auction.status, "leading": b.auction.winner_id == user.id, "end_time": b.auction.end_time, "created_at": b.created_at} for b in page])

        if section == "sales":
            if state: sales = sales.filter(fulfillment_status=state)
            if search: sales = sales.filter(Q(name__icontains=search) | Q(order__order_number__icontains=search))
            return paginate(request, sales.order_by("-order__created_at", "-id"), lambda page: [{"id": item.id, "order_number": item.order.order_number, "name": item.name, "quantity": item.quantity, "amount": str(item.subtotal), "currency": getattr(getattr(item.order, "payment", None), "currency", None), "status": item.fulfillment_status, "payment_status": getattr(getattr(item.order, "payment", None), "status", "unpaid"), "created_at": item.order.created_at} for item in page])

        if section == "payments":
            qs = Payment.objects.filter(order__user=user).select_related("order").order_by("-created_at", "-id")
            if state: qs = qs.filter(status=state)
            if search: qs = qs.filter(order__order_number__icontains=search)
            return paginate(request, qs, lambda page: [{"id": p.id, "order_id": p.order_id, "order_number": p.order.order_number, "amount": str(p.amount), "currency": p.currency, "status": p.status, "method": p.method, "created_at": p.created_at} for p in page])

        if section == "valuations":
            qs = Valuation.objects.filter(user=user).order_by("-created_at", "-id")
            return paginate(request, qs, lambda page: [{"id": v.id, "name": f"{v.year} {v.brand} {v.model}", "min_value": str(v.min_value), "max_value": str(v.max_value), "valid_until": v.valid_until, "created_at": v.created_at} for v in page])

        if section in ("payouts", "activity", "business"):
            profile = VendorProfile.objects.filter(user=user).first()
            if not profile: raise NotFound("Complete vendor registration to open this workspace.")
            if section == "business":
                return Response({"id": profile.pk, "business_name": profile.business_name, "tax_id": profile.tax_id, "contact_person": profile.contact_person, "business_email": profile.business_email, "phone": profile.phone, "verification_status": profile.verification_status, "tier": profile.tier, "has_business_license": bool(profile.business_license), "has_representative_id": bool(profile.representative_id)})
            qs = profile.payouts.all() if section == "payouts" else profile.activities.all()
            if state and section == "payouts": qs = qs.filter(status=state)
            if search and section == "activity": qs = qs.filter(description__icontains=search)
            serializer = VendorPayoutSerializer if section == "payouts" else VendorActivitySerializer
            return paginate(request, qs.order_by("-pk"), lambda page: serializer(page, many=True).data)
        raise NotFound("Workspace page not found.")



class WorkspaceListingView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.kwargs["section"] == "cars":
            return Car.objects.filter(seller=self.request.user).select_related("brand", "model", "seller").prefetch_related("images", "features")
        if self.kwargs["section"] == "parts":
            return Part.objects.filter(seller=self.request.user).select_related("category", "seller").prefetch_related("images")
        raise NotFound("Inventory page not found.")

    def get_serializer_class(self):
        return CarDetailSerializer if self.kwargs["section"] == "cars" else PartDetailSerializer
