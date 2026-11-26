from django.urls import path
from .views import CreatePaymentIntentView, ConfirmPaymentView, EMICalculatorView, PaymentConfigView, StripeWebhookView, CashfreeWebhookView

urlpatterns = [
    path("config/", PaymentConfigView.as_view(), name="payment-config"),
    path("webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("cashfree/webhook/", CashfreeWebhookView.as_view(), name="cashfree-webhook"),
    path("create-intent/", CreatePaymentIntentView.as_view(), name="create-payment-intent"),
    path("confirm/", ConfirmPaymentView.as_view(), name="confirm-payment"),
    path("emi-calculator/", EMICalculatorView.as_view(), name="emi-calculator"),
]
