from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.auctions.models import Auction, AuctionEvent
from apps.cars.models import CarBrand, CarModel, Car
from apps.orders.models import Order

User = get_user_model()


class AuctionBiddingLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.vendor = User.objects.create_user(
            email="vendor@example.com",
            username="vendor",
            password="testpassword123",
            role="seller",
        )
        self.bidder_one = User.objects.create_user(
            email="bidder1@example.com",
            username="bidder1",
            password="testpassword123",
            role="buyer",
        )
        self.bidder_two = User.objects.create_user(
            email="bidder2@example.com",
            username="bidder2",
            password="testpassword123",
            role="buyer",
        )
        brand = CarBrand.objects.create(name="Porsche", slug="porsche")
        model = CarModel.objects.create(brand=brand, name="911", slug="911")
        self.car = Car.objects.create(
            seller=self.vendor,
            brand=brand,
            model=model,
            year=2023,
            price=Decimal("120000.00"),
            mileage=5000,
            fuel_type="petrol",
            transmission="automatic",
            color="Silver",
            vin="WPOZZZ99Z12345678",
            location="Los Angeles, CA",
            condition="salvage",
            status="active",
        )
        self.auction = Auction.objects.create(
            car=self.car,
            vendor=self.vendor,
            lot_number="DRV-LOT-1001",
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=1),
            starting_bid=Decimal("1000.00"),
            reserve_price=Decimal("1200.00"),
            current_bid=Decimal("1000.00"),
            min_increment=Decimal("100.00"),
            damage_type="front",
            damage_severity="major",
            status="live",
        )

    def test_place_bid_rejects_vendor_on_own_auction(self):
        self.client.force_authenticate(user=self.vendor)
        response = self.client.post(
            f"/api/auctions/{self.auction.id}/place_bid/",
            {"amount": "1100.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Vendor cannot bid on own auction.")

    def test_place_bid_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            f"/api/auctions/{self.auction.id}/place_bid/",
            {"amount": "1100.00"},
            format="json",
        )
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_place_bid_happy_path_updates_winner_and_event(self):
        self.client.force_authenticate(user=self.bidder_one)
        response = self.client.post(
            f"/api/auctions/{self.auction.id}/place_bid/",
            {"amount": "1100.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.current_bid, Decimal("1100.00"))
        self.assertEqual(self.auction.winner_id, self.bidder_one.id)
        self.assertTrue(
            AuctionEvent.objects.filter(
                auction=self.auction,
                event_type="bid_accepted",
                actor=self.bidder_one,
            ).exists()
        )

    def test_proxy_bid_rejects_below_minimum(self):
        self.client.force_authenticate(user=self.bidder_one)
        response = self.client.post(
            f"/api/auctions/{self.auction.id}/proxy-bid/",
            {"proxy_max": "1001.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Proxy max must be at least", response.data["detail"])

    def test_proxy_bid_rejects_invalid_number(self):
        self.client.force_authenticate(user=self.bidder_one)
        response = self.client.post(
            f"/api/auctions/{self.auction.id}/proxy-bid/",
            {"proxy_max": "invalid"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("positive bid", response.data["detail"])

    def test_proxy_vs_proxy_competition_sets_deterministic_current_bid(self):
        self.client.force_authenticate(user=self.bidder_one)
        first = self.client.post(
            f"/api/auctions/{self.auction.id}/proxy-bid/",
            {"proxy_max": "1500.00"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.bidder_two)
        second = self.client.post(
            f"/api/auctions/{self.auction.id}/proxy-bid/",
            {"proxy_max": "1700.00"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        self.auction.refresh_from_db()
        self.assertEqual(self.auction.winner_id, self.bidder_two.id)
        self.assertEqual(self.auction.current_bid, Decimal("1600.00"))

    def test_close_creates_order_when_reserve_met(self):
        self.client.force_authenticate(user=self.bidder_one)
        self.client.post(
            f"/api/auctions/{self.auction.id}/place_bid/",
            {"amount": "1300.00"},
            format="json",
        )
        self.client.force_authenticate(user=self.vendor)
        response = self.client.post(f"/api/auctions/{self.auction.id}/close/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "sold")
        self.assertIsNotNone(response.data["order_id"])

        self.auction.refresh_from_db()
        self.assertEqual(self.auction.status, "sold")
        self.assertEqual(self.auction.winner_id, self.bidder_one.id)
        self.assertTrue(Order.objects.filter(id=response.data["order_id"], user=self.bidder_one).exists())
