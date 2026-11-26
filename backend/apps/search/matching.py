from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from apps.cars.models import Car

ALLOWED_FILTERS = {"brand", "min_price", "max_price", "city", "fuel_type", "transmission", "year_min", "year_max", "source", "route", "model", "body_type", "condition", "sort", "ordering", "page", "page_size", "search"}


def validate_filters(value):
    if not isinstance(value, dict) or any(key not in ALLOWED_FILTERS for key in value):
        raise serializers.ValidationError("Choose supported vehicle search criteria.")
    for key, item in value.items():
        if not isinstance(item, (str, int, float)) or isinstance(item, bool):
            raise serializers.ValidationError("Search criteria must be text or numbers.")
        if key in {"min_price", "max_price", "year_min", "year_max"}:
            try:
                number = Decimal(str(item))
                if not number.is_finite() or number < 0: raise InvalidOperation
            except (InvalidOperation, ValueError):
                raise serializers.ValidationError(f"{key.replace('_', ' ')} must be a positive number.")
    if value.get("min_price") and value.get("max_price") and Decimal(str(value["min_price"])) > Decimal(str(value["max_price"])):
        raise serializers.ValidationError("Maximum price must be at least the minimum price.")
    if value.get("fuel_type") and value["fuel_type"] not in dict(Car.FUEL_CHOICES):
        raise serializers.ValidationError("Choose a supported fuel type.")
    if value.get("transmission") and value["transmission"] not in dict(Car.TRANSMISSION_CHOICES):
        raise serializers.ValidationError("Choose a supported transmission.")
    return {key: item for key, item in value.items() if key not in {"sort", "ordering", "page", "page_size"}}


def matching_cars(saved_search):
    from django.db.models import Q
    qs = Car.objects.filter(status="active").select_related("brand", "model").prefetch_related("images")
    filters = saved_search.filters if isinstance(saved_search.filters, dict) else {}
    lookups = {"min_price": "price__gte", "max_price": "price__lte", "year_min": "year__gte", "year_max": "year__lte", "city": "location__icontains", "fuel_type": "fuel_type", "transmission": "transmission", "model": "model__slug", "body_type": "body_type", "condition": "condition"}
    for key, lookup in lookups.items():
        if filters.get(key) not in (None, ""):
            qs = qs.filter(**{lookup: filters[key]})
    if filters.get("search"):
        qs = qs.filter(Q(brand__name__icontains=filters["search"]) | Q(model__name__icontains=filters["search"]) | Q(variant__icontains=filters["search"]))
    if filters.get("brand"):
        qs = qs.filter(Q(brand__slug__iexact=filters["brand"]) | Q(brand__name__iexact=filters["brand"]))
    return qs.order_by("-created_at", "-id")
