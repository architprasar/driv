"""Transactional marketplace order, inventory and fulfilment rules."""

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from apps.accounts.models import UserAddress
from apps.cart.models import Cart
from apps.cars.models import Car
from apps.parts.models import Part
from apps.notifications.models import Notification
from .models import Order, OrderItem, OrderTimeline, ReturnRequest

CENT = Decimal("0.01")


def cash(value):
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def notify(user_id, title, message, url, category="orders"):
    if user_id:
        notification = Notification.objects.create(
            user_id=user_id,
            category=category,
            title=title,
            message=message,
            action_url=url,
        )
        from apps.notifications.delivery import queue_email
        from django.contrib.auth import get_user_model

        recipient = (
            get_user_model()
            .objects.filter(pk=user_id)
            .values_list("email", flat=True)
            .first()
        )
        if recipient:
            queue_email(
                f"notification-{notification.pk}",
                recipient,
                title,
                f"{message}\n\nView your account: {settings.FRONTEND_URL.rstrip('/')}{url}",
            )


def timeline(order, status, title, description=""):
    OrderTimeline.objects.create(
        order=order, status=status, title=title, description=description
    )


def address_snapshot(address):
    if not address:
        return {}
    return {
        name: getattr(address, name)
        for name in (
            "id",
            "label",
            "full_name",
            "street",
            "city",
            "state",
            "postal_code",
            "country",
        )
    }


def check_product(user, product, kind, quantity, *, auction=False):
    if product.seller_id == user.pk:
        raise ValidationError("You cannot buy your own listing.")
    if quantity < 1 or (kind == "car" and quantity != 1):
        raise ValidationError(
            "Choose a positive quantity. A vehicle can only be purchased once."
        )
    if product.price <= 0:
        raise ValidationError("This listing does not have a valid price.")
    if kind == "part" and product.stock < quantity:
        raise ValidationError(
            f"Only {product.stock} units of {product.name} are available."
        )
    if kind == "car":
        from apps.auctions.models import Auction

        if product.status != "active":
            raise ValidationError("This vehicle is no longer available.")
        if (
            not auction
            and Auction.objects.filter(
                car=product, status__in=["upcoming", "live", "sold"]
            ).exists()
        ):
            raise ValidationError(
                "This vehicle is assigned to an auction. Open its auction to bid."
            )


def cart_lines(user, lock=False):
    qs = Cart.objects.select_for_update() if lock else Cart.objects
    cart = qs.filter(user=user).first()
    if not cart:
        raise ValidationError("Cart is empty.")
    items = list(cart.items.select_related("part", "car").order_by("item_type", "pk"))
    if not items:
        raise ValidationError("Cart is empty.")
    lines = []
    for item in items:
        product = item.part if item.item_type == "part" else item.car
        if not product:
            raise ValidationError(
                "A cart item is no longer available. Remove it before checkout."
            )
        if lock:
            model = Part if item.item_type == "part" else Car
            product = model.objects.select_for_update().get(pk=product.pk)
        check_product(user, product, item.item_type, item.quantity)
        lines.append((item.item_type, product, item.quantity))
    return cart, lines


def quote(lines, method):
    only_cars = all(kind == "car" for kind, _, _ in lines)
    if only_cars:
        method = "pickup"
    if method not in {"pickup", "standard", "express"}:
        raise ValidationError("Choose a valid delivery method.")
    subtotal = cash(sum(product.price * quantity for _, product, quantity in lines))
    shipping = (
        cash(settings.MARKETPLACE_EXPRESS_FEE) if method == "express" else cash(0)
    )
    rate = Decimal(settings.MARKETPLACE_TAX_RATE)
    tax = cash(subtotal * rate)
    if subtotal + shipping + tax > Decimal("999999999999.99"):
        raise ValidationError(
            "This order exceeds the supported checkout limit. Contact support."
        )
    return {
        "subtotal": subtotal,
        "shipping_cost": shipping,
        "tax": tax,
        "total": cash(subtotal + shipping + tax),
        "currency": settings.MARKETPLACE_CURRENCY,
        "delivery_method": method,
        "requires_address": method != "pickup",
        "tax_rate": str(rate),
        "return_window_days": settings.RETURN_WINDOW_DAYS,
    }


def quote_payload(user, lines, totals):
    return {
        "user": user.pk,
        "items": [
            [kind, product.pk, quantity, str(product.price)]
            for kind, product, quantity in lines
        ],
        "total": str(totals["total"]),
        "currency": totals["currency"],
        "delivery_method": totals["delivery_method"],
    }


@transaction.atomic
def create_checkout(user, data):
    from django.contrib.auth import get_user_model

    get_user_model().objects.select_for_update().get(pk=user.pk)
    key = data.get("checkout_key") or None
    if key:
        existing = (
            Order.objects.select_for_update()
            .filter(user=user, checkout_key=key)
            .first()
        )
        if existing:
            return existing, False
    car_id = data.get("car_id")
    if car_id:
        car = get_object_or_404(
            Car.objects.select_for_update().select_related("brand", "model"), pk=car_id
        )
        check_product(user, car, "car", 1)
        lines = [("car", car, 1)]
        cart = None
    else:
        cart, lines = cart_lines(user, lock=True)
    totals = quote(lines, data.get("delivery_method", "standard"))
    if data.get("quote_token"):
        from django.core import signing

        try:
            quoted = signing.loads(
                data["quote_token"], salt="marketplace-quote", max_age=600
            )
        except signing.BadSignature:
            raise ValidationError(
                "This checkout quote has expired. Refresh the quote before continuing."
            )
        if quoted != quote_payload(user, lines, totals):
            raise ValidationError(
                "Prices or cart contents changed. Review the refreshed quote before placing your order."
            )
    address = None
    if data.get("shipping_address_id"):
        address = UserAddress.objects.filter(
            pk=data["shipping_address_id"], user=user
        ).first()
        if not address:
            raise NotFound("Address not found.")
    if totals["requires_address"] and not address:
        raise ValidationError("Choose a delivery address before placing this order.")
    order = Order.objects.create(
        user=user,
        shipping_address=address,
        shipping_snapshot=address_snapshot(address),
        checkout_key=key,
        source="car" if car_id else "cart",
        inventory_reserved=True,
        reservation_expires_at=timezone.now()
        + timedelta(minutes=max(31, settings.CART_RESERVATION_MINUTES)),
        **{
            k: totals[k]
            for k in (
                "subtotal",
                "shipping_cost",
                "tax",
                "total",
                "currency",
                "delivery_method",
            )
        },
    )
    for kind, product, quantity in lines:
        if kind == "part":
            updated = Part.objects.filter(pk=product.pk, stock__gte=quantity).update(
                stock=F("stock") - quantity
            )
        else:
            updated = Car.objects.filter(pk=product.pk, status="active").update(
                status="reserved"
            )
        if not updated:
            raise ValidationError(
                "Availability changed during checkout. Review your cart and try again."
            )
        OrderItem.objects.create(
            order=order,
            seller_id=product.seller_id,
            part=product if kind == "part" else None,
            car=product if kind == "car" else None,
            name=product.name if kind == "part" else str(product),
            quantity=quantity,
            unit_price=product.price,
        )
    timeline(
        order,
        "placed",
        "Order Placed",
        "Your items are reserved while you complete payment.",
    )
    if cart:
        cart.items.all().delete()
    return order, True


@transaction.atomic
def release_inventory(order):
    order = Order.objects.select_for_update().get(pk=order.pk)
    if not order.inventory_reserved or order.inventory_released:
        return
    for item in order.items.exclude(
        fulfillment_status__in=["cancelled", "returned"]
    ).select_related("part", "car"):
        if item.part_id:
            Part.objects.filter(pk=item.part_id).update(
                stock=F("stock") + item.quantity
            )
        elif item.car_id:
            Car.objects.filter(pk=item.car_id, status__in=["reserved", "sold"]).update(
                status="active"
            )
    order.inventory_released = True
    order.save(update_fields=["inventory_released"])
    if order.auction_id:
        from apps.auctions.models import Auction

        Auction.objects.filter(pk=order.auction_id).update(
            status="ended", close_reason="payment_not_completed"
        )


def sync_order_status(order):
    states = set(order.items.values_list("fulfillment_status", flat=True))
    active = states - {"cancelled", "returned"}
    if not active:
        state = "returned" if "returned" in states else "cancelled"
    elif active == {"delivered"}:
        state = "delivered"
    elif active <= {"delivered", "out_for_delivery"}:
        state = "out_for_delivery"
    elif active <= {"delivered", "out_for_delivery", "shipped", "ready_for_pickup"}:
        state = "shipped"
    else:
        state = "confirmed"
    if order.status != state:
        order.status = state
        order.save(update_fields=["status", "updated_at"])


@transaction.atomic
def complete_payment(payment):
    from apps.payments.models import Payment
    from apps.vendors.models import VendorEarning

    order = Order.objects.select_for_update().get(pk=payment.order_id)
    payment = (
        Payment.objects.select_for_update(of=("self",))
        .select_related("order")
        .get(pk=payment.pk)
    )
    if payment.status in {"completed", "partially_refunded", "refunded"}:
        return order
    if order.status == "cancelled" or order.inventory_released:
        raise ValidationError(
            "This order has expired or was cancelled. Do not fulfil it; contact support for payment reconciliation."
        )
    payment.status = "completed"
    payment.save(update_fields=["status"])
    order.status = "confirmed"
    order.reservation_expires_at = None
    order.save(update_fields=["status", "reservation_expires_at", "updated_at"])
    for item in order.items.all():
        if item.car_id:
            Car.objects.filter(pk=item.car_id).update(status="sold")
        if item.seller_id:
            VendorEarning.objects.get_or_create(
                item=item,
                defaults={
                    "seller_id": item.seller_id,
                    "amount": item.subtotal,
                    "currency": order.currency,
                },
            )
            notify(
                item.seller_id,
                "New paid order",
                f"Prepare {item.name} for order {order.order_number}.",
                f"/dashboard/sales/{item.pk}",
            )
    timeline(
        order,
        "confirmed",
        "Payment Confirmed",
        "Your payment was verified. Your sellers can now prepare the order.",
    )
    notify(
        order.user_id,
        "Payment confirmed",
        f"Order {order.order_number} is confirmed.",
        f"/profile/orders/{order.pk}",
    )
    return order


@transaction.atomic
def cancel_order(order, user, reason="Cancelled by customer"):
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.user_id != user.pk and not user.is_staff:
        raise PermissionDenied()
    if order.status == "cancelled":
        return order
    if order.status in {"delivered", "returned"}:
        raise ValidationError(
            "This order is already complete. Use the return process for received items."
        )
    if order.items.exclude(
        fulfillment_status__in=["pending", "processing", "cancelled"]
    ).exists():
        raise ValidationError(
            "This order has already been dispatched or prepared for handover. Request a return after receiving it."
        )
    payment = getattr(order, "payment", None)
    if payment and payment.status in {"completed", "partially_refunded"}:
        from apps.payments.services import refund_payment

        refund_payment(
            payment,
            cash(payment.amount - payment.refunded_amount),
            f"cancel-order-{order.pk}",
            reason,
        )
    elif payment and payment.status == "processing" and payment.mode == "stripe":
        from apps.payments.services import cancel_checkout_session

        cancel_checkout_session(payment)
    elif payment and payment.status in {"pending", "processing"}:
        payment.status = "failed"
        payment.save(update_fields=["status"])
    release_inventory(order)
    order.status = "cancelled"
    order.save(update_fields=["status", "updated_at"])
    order.items.update(fulfillment_status="cancelled")
    from apps.vendors.models import VendorEarning

    VendorEarning.objects.filter(item__order=order).update(status="reversed")
    timeline(order, "cancelled", "Order cancelled", reason)
    notify(
        order.user_id,
        "Order cancelled",
        f"Order {order.order_number} was cancelled.",
        f"/profile/orders/{order.pk}",
    )
    for seller_id in order.items.values_list("seller_id", flat=True).distinct():
        notify(
            seller_id,
            "Order cancelled",
            f"Do not fulfil order {order.order_number}.",
            "/dashboard/sales",
        )
    return order


def locked_order_item(item):
    # All item operations take the parent order first, matching cancellation/payment.
    Order.objects.select_for_update().get(pk=item.order_id)
    return (
        OrderItem.objects.select_for_update(of=("self",))
        .select_related("order")
        .get(pk=item.pk)
    )


@transaction.atomic
def fulfil_item(item, seller, data):
    item = locked_order_item(item)
    if item.seller_id != seller.pk:
        raise PermissionDenied()
    payment = getattr(item.order, "payment", None)
    if (
        not payment
        or payment.status not in {"completed", "partially_refunded"}
        or item.order.status == "cancelled"
    ):
        raise ValidationError("Only paid orders can be prepared or dispatched.")
    state = data.get("status")
    allowed = {
        "pending": {"processing"},
        "processing": {"shipped", "ready_for_pickup"},
        "shipped": {"out_for_delivery"},
    }
    if state not in allowed.get(item.fulfillment_status, set()):
        raise ValidationError("That fulfilment transition is not available.")
    pickup = bool(item.car_id) or item.order.delivery_method == "pickup"
    if pickup and state in {"shipped", "out_for_delivery"}:
        raise ValidationError("Prepare this item for pickup or vehicle handover.")
    if not pickup and state == "ready_for_pickup":
        raise ValidationError("This customer selected delivery, not pickup.")
    if state == "shipped" and not str(data.get("tracking_number", "")).strip():
        raise ValidationError("Add a tracking reference before dispatching this item.")
    item.fulfillment_status = state
    for key in ("tracking_number", "carrier", "fulfillment_note"):
        if key in data:
            setattr(item, key, str(data[key]).strip())
    item.save()
    sync_order_status(item.order)
    timeline(
        item.order,
        state,
        f"{item.name}: {state.replace('_', ' ')}",
        item.fulfillment_note,
    )
    notify(
        item.order.user_id,
        "Order update",
        f"{item.name} is {state.replace('_', ' ')}.",
        f"/profile/orders/{item.order_id}",
    )
    return item


@transaction.atomic
def confirm_received(item, customer, checks=None):
    item = locked_order_item(item)
    if item.order.user_id != customer.pk:
        raise PermissionDenied()
    if item.fulfillment_status == "delivered":
        return item
    if item.fulfillment_status not in {
        "shipped",
        "out_for_delivery",
        "ready_for_pickup",
    }:
        raise ValidationError("This item is not ready for receipt confirmation.")
    if item.car_id and not (
        isinstance(checks, dict)
        and checks.get("keys_received") is True
        and checks.get("documents_received") is True
    ):
        raise ValidationError(
            "Confirm that you received the vehicle keys and transfer documents before completing handover."
        )
    item.fulfillment_status = "delivered"
    item.delivered_at = timezone.now()
    item.save(update_fields=["fulfillment_status", "delivered_at"])
    from apps.vendors.models import VendorEarning

    VendorEarning.objects.filter(item=item, status="pending").update(
        available_at=item.delivered_at + timedelta(days=settings.RETURN_WINDOW_DAYS)
    )
    sync_order_status(item.order)
    timeline(
        item.order,
        "delivered",
        f"{item.name}: receipt confirmed",
        "The customer confirmed receipt or vehicle handover.",
    )
    notify(
        item.seller_id,
        "Customer confirmed receipt",
        f"{item.name} was received. Settlement becomes eligible after the return window.",
        f"/dashboard/sales/{item.pk}",
    )
    return item


@transaction.atomic
def request_return(item, customer, reason):
    item = locked_order_item(item)
    if item.order.user_id != customer.pk:
        raise PermissionDenied()
    from apps.vendors.models import VendorEarning

    earning = VendorEarning.objects.select_for_update().filter(item=item).first()
    if earning and earning.status in {"processing", "paid"}:
        raise ValidationError(
            "Settlement has already begun. Contact support for a return review."
        )
    if item.fulfillment_status != "delivered" or not item.delivered_at:
        raise ValidationError("Only received items can be returned.")
    if timezone.now() > item.delivered_at + timedelta(days=settings.RETURN_WINDOW_DAYS):
        raise ValidationError(
            "The return-request window has ended. Contact support for assistance."
        )
    if not isinstance(reason, str) or len(reason.strip()) < 5:
        raise ValidationError("Explain the reason for this return.")
    if ReturnRequest.objects.filter(item=item).exists():
        raise ValidationError("This item already has a return request.")
    result = ReturnRequest.objects.create(
        item=item, customer=customer, reason=reason.strip()
    )
    notify(
        item.seller_id,
        "Return requested",
        f"Review the return request for {item.name}.",
        "/dashboard/returns",
    )
    return result


@transaction.atomic
def resolve_return(request, seller, state, note):
    from apps.vendors.models import VendorEarning

    Order.objects.select_for_update().get(pk=request.item.order_id)
    request = (
        ReturnRequest.objects.select_for_update(of=("self",))
        .select_related("item__order")
        .get(pk=request.pk)
    )
    item = OrderItem.objects.select_for_update().get(pk=request.item_id)
    if item.seller_id != seller.pk:
        raise PermissionDenied()
    transitions = {"requested": {"approved", "rejected"}, "approved": {"received"}}
    if state not in transitions.get(request.status, set()):
        raise ValidationError("That return transition is not available.")
    if not isinstance(note, str) or len(note.strip()) < 3:
        raise ValidationError("Add a note explaining the return decision or receipt.")
    request.status = state
    request.seller_note = note.strip()
    if state == "received":
        from apps.payments.services import refund_payment

        order = item.order
        refund = cash(
            item.subtotal
            + (order.tax * item.subtotal / order.subtotal if order.subtotal else 0)
        )
        refund_result = refund_payment(
            order.payment, refund, f"return-{request.pk}", request.reason
        )
        if item.part_id:
            Part.objects.filter(pk=item.part_id).update(
                stock=F("stock") + item.quantity
            )
        if item.car_id:
            Car.objects.filter(pk=item.car_id).update(status="draft")
            if order.auction_id:
                from apps.auctions.models import Auction

                Auction.objects.filter(pk=order.auction_id).update(
                    status="ended", close_reason="vehicle_returned"
                )
        item.fulfillment_status = "returned"
        item.save(update_fields=["fulfillment_status"])
        VendorEarning.objects.filter(item=item).update(status="reversed")
        request.status = (
            "refunded" if refund_result.status == "succeeded" else "refund_pending"
        )
        sync_order_status(order)
        timeline(
            order,
            "returned",
            f"{item.name}: return received",
            "The refund has been initiated to the original payment method.",
        )
    request.save()
    notify(
        request.customer_id,
        "Return request updated",
        f"Return for {item.name}: {request.status.replace('_', ' ')}.",
        f"/profile/orders/{item.order_id}",
    )
    return request


def expire_unpaid_orders():
    count = 0
    for pk in Order.objects.filter(
        status="placed", reservation_expires_at__lte=timezone.now()
    ).values_list("pk", flat=True):
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk)
                if order.status != "placed":
                    continue
                payment = getattr(order, "payment", None)
                if (
                    payment
                    and payment.mode == "stripe"
                    and payment.status == "processing"
                ):
                    from apps.payments.services import (
                        verify_provider_payment,
                        cancel_checkout_session,
                    )

                    if verify_provider_payment(payment, require_paid=False):
                        complete_payment(payment)
                        continue
                    cancel_checkout_session(payment)
                cancel_order(order, order.user, "Payment reservation expired.")
                count += 1
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Could not expire order %s; continuing remaining reservations", pk
            )
    return count


@transaction.atomic
def cancel_sale_item(item, seller, reason):
    from apps.payments.services import refund_payment
    from apps.vendors.models import VendorEarning

    item = locked_order_item(item)
    if item.seller_id != seller.pk:
        raise PermissionDenied()
    if item.fulfillment_status == "cancelled":
        return item
    if item.fulfillment_status not in {"pending", "processing"}:
        raise ValidationError(
            "Dispatched or received items must use the return process."
        )
    if not isinstance(reason, str) or len(reason.strip()) < 5:
        raise ValidationError("Explain why this item cannot be fulfilled.")
    order = Order.objects.select_for_update().get(pk=item.order_id)
    payment = getattr(order, "payment", None)
    if not payment or payment.status not in {"completed", "partially_refunded"}:
        raise ValidationError(
            "Only paid sales can be rejected here. Unpaid reservations expire automatically."
        )
    last = (
        not order.items.exclude(pk=item.pk)
        .exclude(fulfillment_status__in=["cancelled", "returned"])
        .exists()
    )
    amount = (
        payment.amount - payment.refunded_amount
        if last
        else cash(item.subtotal + order.tax * item.subtotal / order.subtotal)
    )
    refund_payment(payment, amount, f"cancel-item-{item.pk}", reason)
    if item.part_id:
        Part.objects.filter(pk=item.part_id).update(stock=F("stock") + item.quantity)
    if item.car_id:
        Car.objects.filter(pk=item.car_id).update(status="active")
    item.fulfillment_status = "cancelled"
    item.fulfillment_note = reason.strip()
    item.save(update_fields=["fulfillment_status", "fulfillment_note"])
    VendorEarning.objects.filter(item=item).update(status="reversed")
    if last:
        order.inventory_released = True
        order.save(update_fields=["inventory_released"])
        if order.auction_id:
            from apps.auctions.models import Auction

            Auction.objects.filter(pk=order.auction_id).update(
                status="ended", close_reason="seller_cancelled"
            )
    sync_order_status(order)
    timeline(order, "cancelled", f"{item.name}: cancelled by seller", reason.strip())
    notify(
        order.user_id,
        "Seller cancelled an item",
        f"{item.name} could not be fulfilled. A refund has been initiated.",
        f"/profile/orders/{order.pk}",
    )
    return item
