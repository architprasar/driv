"""Persistent, bounded retries. No tokens, addresses or mail bodies in logs."""

import logging
from datetime import timedelta
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone
from .models import EmailDelivery

logger = logging.getLogger(__name__)


def queue_email(key, recipient, subject, body, html_body="", lifetime=86400):
    now = timezone.now()
    delivery, _ = EmailDelivery.objects.get_or_create(
        key=key,
        defaults={
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "html_body": html_body,
            "next_attempt_at": now,
            "expires_at": now + timedelta(seconds=lifetime),
        },
    )
    return delivery


@transaction.atomic
def deliver_email(pk):
    delivery = EmailDelivery.objects.select_for_update().get(pk=pk)
    now = timezone.now()
    if delivery.status != "pending" or delivery.next_attempt_at > now:
        return False
    if delivery.expires_at <= now:
        delivery.status = "expired"
        delivery.body = delivery.html_body = ""
        delivery.save(update_fields=["status", "body", "html_body"])
        return False
    delivery.attempts += 1
    try:
        message = EmailMultiAlternatives(
            delivery.subject,
            delivery.body,
            settings.DEFAULT_FROM_EMAIL,
            [delivery.recipient],
        )
        if delivery.html_body:
            message.attach_alternative(delivery.html_body, "text/html")
        if message.send(fail_silently=False) != 1:
            raise RuntimeError("Transport did not accept the email")
    except Exception as error:
        logger.warning(
            "Email delivery %s failed (%s); queued for retry",
            delivery.pk,
            type(error).__name__,
        )
        delivery.next_attempt_at = now + timedelta(
            minutes=min(60, 2 ** min(delivery.attempts, 6))
        )
        delivery.save(update_fields=["attempts", "next_attempt_at"])
        return False
    delivery.status = "sent"
    delivery.sent_at = now
    delivery.body = delivery.html_body = ""
    delivery.save(update_fields=["status", "sent_at", "attempts", "body", "html_body"])
    return True


def deliver_due_emails(limit=5):
    sent = 0
    ids = list(
        EmailDelivery.objects.filter(
            status="pending", next_attempt_at__lte=timezone.now()
        )
        .order_by("next_attempt_at")
        .values_list("pk", flat=True)[:limit]
    )
    for pk in ids:
        try:
            sent += int(deliver_email(pk))
        except Exception:
            logger.exception("Email delivery worker failed on record %s", pk)
    return sent
