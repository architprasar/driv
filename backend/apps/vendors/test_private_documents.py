import tempfile
from pathlib import Path
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import VendorProfile


class PrivateVerificationDocumentTests(TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.public = Path(self.temporary.name) / "public"
        self.private = Path(self.temporary.name) / "private"
        setting = override_settings(
            MEDIA_ROOT=self.public, PRIVATE_MEDIA_ROOT=self.private
        )
        setting.enable()
        self.addCleanup(setting.disable)
        User = get_user_model()
        self.owner = User.objects.create_user(
            email="owner@documents.test", username="owner"
        )
        self.other = User.objects.create_user(
            email="other@documents.test", username="other"
        )
        self.staff = User.objects.create_user(
            email="staff@documents.test", username="staff", is_staff=True
        )
        self.profile = VendorProfile.objects.create(
            user=self.owner,
            business_name="Private Garage",
            contact_person="Owner",
            business_email=self.owner.email,
            phone="9876543210",
        )
        self.client = APIClient()

    def test_vendor_documents_are_private_and_downloadable_only_by_owner_or_staff(self):
        self.client.force_authenticate(self.owner)
        document = SimpleUploadedFile(
            "license.pdf",
            b"%PDF-1.4\nTest verification file",
            content_type="application/pdf",
        )
        response = self.client.patch(
            "/api/vendors/register/documents/",
            {"business_license": document},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertTrue(
            Path(self.profile.business_license.path).is_relative_to(self.private)
        )
        self.assertFalse((self.public / self.profile.business_license.name).exists())
        path = f"/api/vendors/documents/{self.profile.pk}/business-license/"
        for user in [self.owner, self.staff]:
            self.client.force_authenticate(user)
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertIn("attachment", response["Content-Disposition"])
            self.assertIn("no-store", response["Cache-Control"])
            self.assertTrue(b"".join(response.streaming_content).startswith(b"%PDF-"))
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(path).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(path).status_code, 401)

    def test_document_filename_and_contents_must_match_an_allowed_format(self):
        self.client.force_authenticate(self.owner)
        for name, body, mime in [
            ("payload.html", b"%PDF-1.4", "application/pdf"),
            ("broken.pdf", b"not a PDF", "application/pdf"),
            ("broken.png", b"not a PNG", "image/png"),
        ]:
            response = self.client.patch(
                "/api/vendors/register/documents/",
                {"business_license": SimpleUploadedFile(name, body, content_type=mime)},
                format="multipart",
            )
            self.assertEqual(response.status_code, 400, response.data)

    def test_replacing_a_verified_document_requires_a_fresh_review(self):
        self.profile.verification_status = "verified"
        self.profile.save()
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            "/api/vendors/register/documents/",
            {
                "business_license": SimpleUploadedFile(
                    "replacement.pdf",
                    b"%PDF-1.4\nReplacement",
                    content_type="application/pdf",
                )
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "under_review")

    def test_verified_identity_changes_require_review_but_unchanged_details_do_not(
        self,
    ):
        self.profile.verification_status = "verified"
        self.profile.save()
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            "/api/vendors/dashboard/",
            {"business_name": self.profile.business_name},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "verified")
        response = self.client.patch(
            "/api/vendors/dashboard/",
            {"business_name": "A different business"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "under_review")
