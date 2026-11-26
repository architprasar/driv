"""Run without Redis locally; the same tick is also available as a Celery task."""
import time
import logging
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from apps.core.lifecycle import tick_marketplace


class Command(BaseCommand):
    help = "Open/close managed auctions, expire unpaid reservations and mature seller earnings."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true")
        parser.add_argument("--interval", type=float, default=5)

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            try:
                result = tick_marketplace()
                if options["once"]:
                    self.stdout.write(str(result))
            except Exception:
                logging.getLogger(__name__).exception("Marketplace lifecycle tick failed; retrying on the next tick.")
                if options["once"]:
                    raise
            if options["once"]:
                return
            time.sleep(max(1, options["interval"]))
