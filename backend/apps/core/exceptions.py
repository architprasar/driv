import logging
from django.db import IntegrityError, OperationalError
from redis.exceptions import (
    ConnectionError as RedisConnectionError,
    TimeoutError as RedisTimeoutError,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def marketplace_exception_handler(error, context):
    request = context.get("request")
    reference = getattr(request, "request_id", None)
    if isinstance(error, OperationalError) and any(
        term in str(error).lower()
        for term in (
            "database is locked",
            "database table is locked",
            "deadlock detected",
        )
    ):
        response = Response(
            {
                "detail": "This item is being updated. Check your saved orders before retrying checkout."
            },
            status=409,
        )
    elif isinstance(error, (OperationalError, RedisConnectionError, RedisTimeoutError)):
        logger.error("Marketplace dependency unavailable; reference=%s", reference)
        response = Response(
            {
                "detail": "The marketplace service is temporarily unavailable. Check your saved orders before repeating a purchase, then try again."
            },
            status=503,
        )
    elif isinstance(error, IntegrityError):
        logger.warning("Conflicting database write; reference=%s", reference)
        response = Response(
            {
                "detail": "The information changed while your request was being saved. Refresh and check your saved records before trying again."
            },
            status=409,
        )
    else:
        if isinstance(error, DjangoValidationError):
            error = ValidationError(error.messages)
        response = exception_handler(error, context)
    if response is None:
        logger.error(
            "Unhandled API error; reference=%s",
            reference,
            exc_info=(type(error), error, error.__traceback__),
        )
        response = Response(
            {
                "detail": "We could not complete this request. Your saved records are still available. Please try again or contact support."
            },
            status=500,
        )
    if isinstance(response.data, list):
        response.data = {"detail": " ".join(str(value) for value in response.data)}
    if isinstance(response.data, dict) and reference:
        response.data["request_id"] = reference
    return response
