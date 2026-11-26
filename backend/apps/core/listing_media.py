"""Owned image updates, with a consistent primary image after deletion."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import views, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response


class ListingImageView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    kind = "cars"

    def models(self):
        if self.kind == "cars":
            from apps.cars.models import Car, CarImage

            return Car, CarImage, "car"
        from apps.parts.models import Part, PartImage

        return Part, PartImage, "part"

    @transaction.atomic
    def patch(self, request, listing_id, image_id):
        model, image_model, field = self.models()
        listing = get_object_or_404(
            model.objects.select_for_update(), pk=listing_id, seller=request.user
        )
        image = get_object_or_404(image_model, pk=image_id, **{field: listing})
        if request.data.get("is_primary") is not True:
            raise ValidationError("Select a photo to use as the primary image.")
        listing.images.exclude(pk=image.pk).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=["is_primary"])
        return Response({"id": image.pk, "is_primary": True})

    @transaction.atomic
    def delete(self, request, listing_id, image_id):
        model, image_model, field = self.models()
        listing = get_object_or_404(
            model.objects.select_for_update(), pk=listing_id, seller=request.user
        )
        image = get_object_or_404(image_model, pk=image_id, **{field: listing})
        primary = image.is_primary
        storage = image.image.storage
        name = image.image.name
        image.delete()
        if primary:
            replacement = listing.images.order_by("pk").first()
            if replacement:
                listing.images.update(is_primary=False)
                replacement.is_primary = True
                replacement.save(update_fields=["is_primary"])
        transaction.on_commit(lambda: storage.delete(name), robust=True)
        return Response(status=204)


class CarListingImageView(ListingImageView):
    kind = "cars"


class PartListingImageView(ListingImageView):
    kind = "parts"
