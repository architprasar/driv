from django.db import models
from django.conf import settings


class Auction(models.Model):
    DAMAGE_CHOICES = [
        ("front", "Front End"), ("rear", "Rear End"), ("side", "Side Impact"),
        ("rollover", "Rollover"), ("flood", "Flood"), ("fire", "Fire"),
        ("hail", "Hail"), ("mechanical", "Mechanical"), ("none", "None"),
    ]
    SEVERITY_CHOICES = [
        ("minor", "Minor"), ("moderate", "Moderate"), ("major", "Major"), ("total", "Total Loss"),
    ]
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"), ("live", "Live"), ("ended", "Ended"), ("sold", "Sold"),
    ]

    car = models.ForeignKey("cars.Car", on_delete=models.CASCADE, related_name="auction_history")
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auctions")
    lot_number = models.CharField(max_length=20, unique=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    starting_bid = models.DecimalField(max_digits=12, decimal_places=2)
    reserve_price = models.DecimalField(max_digits=12, decimal_places=2)
    current_bid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_increment = models.DecimalField(max_digits=8, decimal_places=2, default=100)
    damage_type = models.CharField(max_length=15, choices=DAMAGE_CHOICES, default="none")
    damage_severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="minor")
    estimated_repair_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="upcoming")
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="won_auctions",
        null=True,
        blank=True,
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    close_reason = models.CharField(max_length=30, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    watchers_count = models.PositiveIntegerField(default=0)
    lifecycle_managed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_time"]
        constraints = [models.UniqueConstraint(fields=["car"], condition=models.Q(status__in=["upcoming", "live"]), name="one_open_auction_per_car")]

    def __str__(self):
        return f"LOT #{self.lot_number}"

    @property
    def reserve_met(self):
        return self.current_bid >= self.reserve_price


class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="bids")
    bidder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bids")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_proxy = models.BooleanField(default=False)
    proxy_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.bidder.username}: ${self.amount}"


class AuctionWatcher(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="watchers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["auction", "user"]


class AuctionEvent(models.Model):
    EVENT_TYPES = [
        ("bid_accepted", "Bid Accepted"),
        ("auction_extended", "Auction Extended"),
        ("auction_closed", "Auction Closed"),
        ("winner_declared", "Winner Declared"),
        ("outbid", "Outbid"),
    ]

    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
