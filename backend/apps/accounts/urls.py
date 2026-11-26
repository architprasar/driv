from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LogoutView,
    SendVerificationView,
    VerifyEmailView,
    PasswordChangeView,
    LoginView,
    MeView,
    UserAddressViewSet,
    PasswordForgotView,
    PasswordResetConfirmView,
)

router = DefaultRouter()
router.register("addresses", UserAddressViewSet, basename="address")

urlpatterns = [
    path("email/send-verification/", SendVerificationView.as_view(), name="send-verification"),
    path("email/verify/", VerifyEmailView.as_view(), name="verify-email"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("password/forgot/", PasswordForgotView.as_view(), name="password-forgot"),
    path("password/reset/", PasswordResetConfirmView.as_view(), name="password-reset"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
