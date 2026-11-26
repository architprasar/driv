from django.db import migrations


def preserve_history(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Item = apps.get_model("orders", "OrderItem")
    Payment = apps.get_model("payments", "Payment")
    for order in Order.objects.select_related("shipping_address").iterator():
        snapshot = {}
        if order.shipping_address_id:
            snapshot = {field: getattr(order.shipping_address, field) for field in ("id", "label", "full_name", "street", "city", "state", "postal_code", "country")}
        payment = Payment.objects.filter(order_id=order.pk).first()
        Order.objects.filter(pk=order.pk).update(shipping_snapshot=snapshot, currency=payment.currency if payment else "INR")
    for item in Item.objects.select_related("part", "car", "order").iterator():
        product = item.part if item.part_id else item.car
        values = {"seller_id": product.seller_id if product else None}
        if item.order.status in {"shipped", "out_for_delivery", "delivered", "cancelled"}:
            values["fulfillment_status"] = item.order.status
        Item.objects.filter(pk=item.pk).update(**values)
    Payment.objects.filter(stripe_payment_id__startswith="mock_").update(mode="test")


class Migration(migrations.Migration):
    dependencies = [("orders", "0003_alter_order_shipping_cost_alter_order_subtotal_and_more"), ("payments", "0003_alter_payment_amount_alter_payment_refunded_amount_and_more")]
    operations = [migrations.RunPython(preserve_history, migrations.RunPython.noop)]
