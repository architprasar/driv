"""Cashfree Payment Gateway client (server-side, REST)."""

import base64
import hashlib
import hmac
from decimal import Decimal

import requests
from django.conf import settings
from rest_framework.exceptions import APIException


class CashfreeUnavailable(APIException):
    status_code = 503
    default_detail = "The payment provider is unavailable. Your order is saved; try again from your orders page."


def configured():
    return bool(settings.CASHFREE_APP_ID and settings.CASHFREE_SECRET_KEY)


def base_url():
    host = "api" if settings.CASHFREE_ENV == "production" else "sandbox"
    return f"https://{host}.cashfree.com/pg"


def request(method, path, json=None):
    if not configured():
        raise CashfreeUnavailable(
            "Live checkout is not configured. Contact support; no payment has been collected."
        )
    try:
        response = requests.request(
            method,
            f"{base_url()}{path}",
            json=json,
            timeout=15,
            headers={
                "x-client-id": settings.CASHFREE_APP_ID,
                "x-client-secret": settings.CASHFREE_SECRET_KEY,
                "x-api-version": settings.CASHFREE_API_VERSION,
            },
        )
    except requests.RequestException as error:
        raise CashfreeUnavailable() from error
    if response.status_code >= 500:
        raise CashfreeUnavailable()
    if response.status_code >= 400:
        try:
            message = response.json().get("message", "")
        except ValueError:
            message = ""
        raise CashfreeUnavailable(message or "Cashfree rejected the request.")
    return response.json()


def create_order(*, order_id, amount, currency, customer, return_url, notify_url, expires_at, tags):
    body = {
        "order_id": order_id,
        "order_amount": float(Decimal(amount).quantize(Decimal("0.01"))),
        "order_currency": currency,
        "customer_details": customer,
        "order_meta": {"return_url": return_url},
        "order_expiry_time": expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "order_tags": tags,
    }
    if notify_url:
        body["order_meta"]["notify_url"] = notify_url
    return request("POST", "/orders", body)


def get_order(order_id):
    return request("GET", f"/orders/{order_id}")


def terminate_order(order_id):
    return request("PATCH", f"/orders/{order_id}", {"order_status": "TERMINATED"})


def create_refund(order_id, refund_id, amount, note):
    return request(
        "POST",
        f"/orders/{order_id}/refunds",
        {
            "refund_amount": float(Decimal(amount).quantize(Decimal("0.01"))),
            "refund_id": refund_id,
            "refund_note": note[:100],
        },
    )


def valid_signature(raw_body, timestamp, signature):
    """Cashfree signs `timestamp + raw body` with HMAC-SHA256, base64 encoded."""
    if not (settings.CASHFREE_SECRET_KEY and timestamp and signature):
        return False
    digest = hmac.new(
        settings.CASHFREE_SECRET_KEY.encode(),
        timestamp.encode() + raw_body,
        hashlib.sha256,
    ).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature)
