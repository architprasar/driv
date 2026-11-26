import django_filters
from .models import Car


class CarFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    year_min = django_filters.NumberFilter(field_name="year", lookup_expr="gte")
    year_max = django_filters.NumberFilter(field_name="year", lookup_expr="lte")
    brand = django_filters.CharFilter(field_name="brand__slug")
    model = django_filters.CharFilter(field_name="model__slug")
    city = django_filters.CharFilter(field_name="location", lookup_expr="icontains")
    sort = django_filters.CharFilter(method="filter_sort")

    SORT_MAP = {
        "price_asc": "price",
        "price_desc": "-price",
        "year_asc": "year",
        "year_desc": "-year",
        "mileage_asc": "mileage",
        "mileage_desc": "-mileage",
        "newest": "-created_at",
    }

    def filter_sort(self, queryset, name, value):
        order_by = self.SORT_MAP.get(value)
        if not order_by:
            return queryset
        return queryset.order_by(order_by, "-created_at")

    class Meta:
        model = Car
        fields = [
            "city",
            "sort",
            "fuel_type", "transmission", "body_type",
            "condition", "status", "is_featured",
        ]
