from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from .models import Valuation, VehicleHistoryEvent
from .serializers import (
    ValuationSerializer, CreateValuationSerializer,
    VehicleHistoryEventSerializer, VehicleHistorySerializer,
)
from apps.cars.models import Car


class CreateValuationView(generics.CreateAPIView):
    """Generate an instant valuation estimate based on car details."""
    serializer_class = CreateValuationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        # These are asking-price comparables, not verified sale transactions.
        comparables = Car.objects.filter(status="active", brand__name__iexact=d["brand"], model__name__iexact=d["model"], year__gte=d["year"]-2, year__lte=d["year"]+2).exclude(auction_history__status__in=["upcoming", "live", "sold"])
        prices = sorted(comparables.values_list("price", flat=True)[:100])
        count = len(prices)
        average = sum(prices, Decimal(0)) / count if count else Decimal(0)
        minimum = prices[0] if count else Decimal(0)
        maximum = prices[-1] if count else Decimal(0)

        valuation = Valuation.objects.create(
            user=request.user,
            brand=d["brand"], model=d["model"], variant=d.get("variant", ""),
            year=d["year"], mileage=d["mileage"],
            fuel_type=d.get("fuel_type", ""), transmission=d.get("transmission", ""),
            condition=d.get("condition", "good"),
            min_value=minimum,
            max_value=maximum,
            market_average=average,
            basis="listing_comparables" if count else "unavailable",
            similar_transactions=count,
            demand_premium=0,
            mileage_adjustment=0,
            valid_until=date.today() + timedelta(days=14),
        )

        return Response(ValuationSerializer(valuation).data, status=status.HTTP_201_CREATED)


class ValuationDetailView(generics.RetrieveAPIView):
    serializer_class = ValuationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Valuation.objects.filter(user=self.request.user)


class VehicleHistoryView(views.APIView):
    """Get full vehicle history by VIN."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, vin):
        try:
            car = Car.objects.select_related("brand", "model").get(vin=vin)
            if car.status not in {"active", "sold", "reserved"} and (not request.user.is_authenticated or car.seller_id != request.user.pk):
                raise Car.DoesNotExist()
        except Car.DoesNotExist:
            return Response({"detail": "Vehicle not found."}, status=status.HTTP_404_NOT_FOUND)

        events = VehicleHistoryEvent.objects.filter(car=car)
        has_accident = events.filter(event_type="accident").exists()
        verified_events = events.filter(verified=True).count()
        has_open_recalls = events.filter(event_type="recall").exists()
        latest_event = events.order_by("-date").first()

        data = {
            "car_title": str(car),
            "vin": car.vin,
            "events": VehicleHistoryEventSerializer(events, many=True).data,
            "total_events": events.count(),
            "clean_title": None,
            "has_recorded_accident": has_accident,
            "metadata": {
                "generated_at": timezone.now().isoformat(),
                "verified_events": verified_events,
                "unverified_events": max(events.count() - verified_events, 0),
                "sources": ["Marketplace vehicle records"] if events.exists() else [],
                "coverage": "stored_records_only",
                "has_open_recalls": has_open_recalls,
                "last_event_date": latest_event.date.isoformat() if latest_event else None,
            },
        }
        return Response(data)
