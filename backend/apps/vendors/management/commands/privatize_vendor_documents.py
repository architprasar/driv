"""Move referenced legacy identity files out of publicly served media."""

import shutil
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from apps.vendors.models import VendorProfile


class Command(BaseCommand):
    help = "Move legacy vendor verification documents to private storage. Back up media before running."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        public = Path(settings.MEDIA_ROOT).resolve()
        private = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
        if private.is_relative_to(public):
            raise CommandError("Private document storage must be outside public media.")
        moved = 0
        for profile in VendorProfile.objects.iterator():
            for field in [profile.business_license, profile.representative_id]:
                if not field.name:
                    continue
                source = (public / field.name).resolve()
                destination = (private / field.name).resolve()
                if not source.is_relative_to(public) or not destination.is_relative_to(
                    private
                ):
                    raise CommandError("Invalid document path; no file was moved.")
                if not source.is_file():
                    continue
                if destination.exists():
                    raise CommandError(
                        "A private document already exists at the destination. Review the duplicate before retrying."
                    )
                if not options["dry_run"]:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(source, destination)
                moved += 1
        self.stdout.write(
            f"{moved} legacy verification documents "
            + ("would be moved." if options["dry_run"] else "moved to private storage.")
        )
