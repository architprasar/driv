from rest_framework import serializers
from .models import Auction, Bid, AuctionWatcher, AuctionEvent


class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source="bidder.username", read_only=True)
    auction_lot = serializers.CharField(source="auction.lot_number", read_only=True)

    class Meta:
        model = Bid
        fields = ["id", "bidder", "bidder_name", "auction_lot", "amount", "is_proxy", "proxy_max", "created_at"]
        read_only_fields = ["id", "bidder", "created_at"]

    def to_representation(self, instance):
        result = super().to_representation(instance)
        request = self.context.get("request")
        if not request or request.user.pk != instance.bidder_id:
            result.pop("proxy_max", None)
        return result

    def _inr(self, value):
        return f"₹{float(value):,.2f}"

    def validate_amount(self, value):
        auction = self.context.get("auction")
        if auction and value < auction.starting_bid:
            raise serializers.ValidationError(
                f"Bid must be at least starting bid ({self._inr(auction.starting_bid)})."
            )
        if auction and value <= auction.current_bid:
            raise serializers.ValidationError(
                f"Bid must be higher than current bid ({self._inr(auction.current_bid)})."
            )
        if auction and value < auction.current_bid + auction.min_increment:
            raise serializers.ValidationError(
                f"Minimum increment is {self._inr(auction.min_increment)}."
            )
        return value


class AuctionListSerializer(serializers.ModelSerializer):
    car_title = serializers.SerializerMethodField()
    car_image = serializers.SerializerMethodField()
    car_year = serializers.SerializerMethodField()
    car_mileage = serializers.SerializerMethodField()
    car_location = serializers.SerializerMethodField()
    bid_count = serializers.IntegerField(source="bids.count", read_only=True)
    reserve_met = serializers.BooleanField(read_only=True)

    class Meta:
        model = Auction
        fields = [
            "id", "lot_number", "car_title", "car_image", "start_time", "end_time",
            "starting_bid", "current_bid", "damage_type", "damage_severity",
            "status", "bid_count", "reserve_met", "views_count", "watchers_count",
            "car_year", "car_mileage", "car_location",
        ]

    def get_car_title(self, obj):
        return str(obj.car) if obj.car else ""

    def get_car_image(self, obj):
        img = obj.car.images.filter(is_primary=True).first() if obj.car else None
        return img.image.url if img else None

    def get_car_year(self, obj):
        return obj.car.year if obj.car else None

    def get_car_mileage(self, obj):
        return obj.car.mileage if obj.car else None

    def get_car_location(self, obj):
        return obj.car.location if obj.car else None


class AuctionDetailSerializer(serializers.ModelSerializer):
    winning_order_id = serializers.SerializerMethodField()
    is_watching = serializers.SerializerMethodField()
    bids = serializers.SerializerMethodField()

    def get_is_watching(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.watchers.filter(user=request.user).exists())

    def get_bids(self, obj):
        return BidSerializer(obj.bids.all()[:50], many=True, context=self.context).data


    def get_winning_order_id(self, obj):
        request = self.context.get("request")
        order = getattr(obj, "winning_order", None)
        return order.pk if request and order and order.user_id == request.user.pk else None

    def to_representation(self, instance):
        result = super().to_representation(instance)
        request = self.context.get("request")
        if not request or request.user.pk != instance.vendor_id:
            result.pop("reserve_price", None)
        return result

    car_title = serializers.SerializerMethodField()
    car_image = serializers.SerializerMethodField()
    car_summary = serializers.SerializerMethodField()
    bid_count = serializers.IntegerField(source="bids.count", read_only=True)
    reserve_met = serializers.BooleanField(read_only=True)

    class Meta:
        model = Auction
        fields = [
            "id", "car", "vendor", "lot_number", "start_time", "end_time",
            "starting_bid", "reserve_price", "current_bid", "min_increment",
            "damage_type", "damage_severity", "estimated_repair_cost",
            "status", "views_count", "watchers_count", "bid_count",
            "reserve_met", "bids", "car_title", "car_image", "car_summary",
            "winner", "closed_at", "close_reason", "created_at", "winning_order_id", "is_watching",
        ]
        read_only_fields = ["vendor", "current_bid", "winner", "status", "closed_at", "close_reason", "created_at", "views_count", "watchers_count"]

    def validate(self, attrs):
        from django.utils import timezone
        if self.instance and (self.instance.status != "upcoming" or self.instance.bids.exists()):
            raise serializers.ValidationError("Only an upcoming auction without bids can be edited.")
        starting = attrs.get("starting_bid", getattr(self.instance, "starting_bid", 0))
        reserve = attrs.get("reserve_price", getattr(self.instance, "reserve_price", 0))
        increment = attrs.get("min_increment", getattr(self.instance, "min_increment", 100))
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if starting <= 0 or reserve < starting or increment <= 0:
            raise serializers.ValidationError("Use a positive starting bid and increment, with a reserve at least equal to the starting bid.")
        if start and end and (end <= start or end <= timezone.now()):
            raise serializers.ValidationError("The closing time must be in the future and after the start.")
        car = attrs.get("car", getattr(self.instance, "car", None))
        request = self.context.get("request")
        if car and request and car.seller_id != request.user.pk:
            raise serializers.ValidationError("Choose a vehicle from your own inventory.")
        if car and car.status in {"sold", "archived", "reserved"}:
            raise serializers.ValidationError("Choose an active vehicle or draft.")
        if car and Auction.objects.filter(car=car, status__in=["live", "upcoming"]).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError("This vehicle already has an open auction.")
        return attrs

    def get_car_title(self, obj):
        return str(obj.car) if obj.car else ""

    def get_car_image(self, obj):
        img = obj.car.images.filter(is_primary=True).first() if obj.car else None
        return img.image.url if img else None

    def get_car_summary(self, obj):
        if not obj.car:
            return None
        return {
            "year": obj.car.year,
            "brand": obj.car.brand.name if obj.car.brand else "",
            "model": obj.car.model.name if obj.car.model else "",
            "variant": obj.car.variant,
            "mileage": obj.car.mileage,
            "fuel_type": obj.car.fuel_type,
            "transmission": obj.car.transmission,
            "location": obj.car.location,
            "condition": obj.car.condition,
            "color": obj.car.color,
        }


class LiveStatsSerializer(serializers.Serializer):
    current_bid = serializers.DecimalField(max_digits=12, decimal_places=2)
    views_count = serializers.IntegerField()
    watchers_count = serializers.IntegerField()
    bid_count = serializers.IntegerField()
    active_bidders = serializers.IntegerField()
    reserve_met = serializers.BooleanField()
    bid_frequency = serializers.FloatField()


class AuctionEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = AuctionEvent
        fields = ["id", "event_type", "actor", "actor_name", "payload", "created_at"]
