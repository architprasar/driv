import django_filters
from django.db.models import Q
from .models import Part


class PartFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_query")
    category = django_filters.CharFilter(field_name="category__slug")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    condition = django_filters.ChoiceFilter(
        choices=Part._meta.get_field("condition").choices
    )
    make = django_filters.CharFilter(method="filter_make")
    brand = django_filters.CharFilter(method="filter_make")
    model = django_filters.CharFilter(method="filter_model")
    in_stock = django_filters.BooleanFilter(method="filter_stock")
    sort = django_filters.CharFilter(method="filter_sort")

    class Meta:
        model = Part
        fields = ["is_genuine", "is_featured", "category__slug"]

    def filter_query(self, qs, name, value):
        return qs.filter(
            Q(name__icontains=value)
            | Q(sku__icontains=value)
            | Q(description__icontains=value)
        )

    def filter_make(self, qs, name, value):
        return qs.filter(
            Q(compatible_brands__name__iexact=value)
            | Q(compatible_brands__slug=value)
            | Q(compatible_models__brand__name__iexact=value)
            | Q(compatible_models__brand__slug=value)
        ).distinct()

    def filter_model(self, qs, name, value):
        return qs.filter(
            Q(compatible_models__name__iexact=value) | Q(compatible_models__slug=value)
        ).distinct()

    def filter_stock(self, qs, name, value):
        return qs.filter(stock__gt=0) if value else qs.filter(stock=0)

    def filter_sort(self, qs, name, value):
        return qs.order_by(
            {"price_asc": "price", "price_desc": "-price", "newest": "-created_at"}.get(
                value, "-created_at"
            ),
            "pk",
        )
