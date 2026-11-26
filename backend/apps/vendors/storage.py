from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateDocumentStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(file_permissions_mode=0o600, directory_permissions_mode=0o700)

    @property
    def location(self):
        import os

        return os.path.abspath(settings.PRIVATE_MEDIA_ROOT)

    def url(self, name):
        from django.db.models import Q
        from .models import VendorProfile

        profile = VendorProfile.objects.filter(
            Q(business_license=name) | Q(representative_id=name)
        ).first()
        if not profile:
            return "/api/vendors/documents/unavailable/"
        kind = (
            "business-license"
            if profile.business_license.name == name
            else "representative-id"
        )
        return f"/api/vendors/documents/{profile.pk}/{kind}/"


private_documents = PrivateDocumentStorage()
