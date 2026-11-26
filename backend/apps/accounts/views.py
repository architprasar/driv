from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.conf import settings
from django.db import transaction

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    UserAddressSerializer,
    PasswordForgotSerializer,
    PasswordResetConfirmSerializer,
)
from .models import UserAddress
from .throttles import AuthenticationThrottle, RecoveryThrottle

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    throttle_classes = [AuthenticationThrottle]
    """Register a new user and return JWT tokens."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        queue_verification(user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(generics.GenericAPIView):
    throttle_classes = [AuthenticationThrottle]
    """Authenticate user and return JWT tokens."""

    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


class PasswordForgotView(generics.GenericAPIView):
    throttle_classes = [RecoveryThrottle]
    """Send password reset email if user exists."""

    serializer_class = PasswordForgotSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            frontend_base = settings.FRONTEND_URL.rstrip("/")
            reset_url = f"{frontend_base}/reset-password?uid={uidb64}&token={token}"
            current_site = get_current_site(request)

            context = {
                "user": user,
                "reset_url": reset_url,
                "site_name": getattr(settings, "SITE_NAME", "DrivioCars"),
                "domain": current_site.domain,
                "support_email": getattr(
                    settings, "SUPPORT_EMAIL", settings.DEFAULT_FROM_EMAIL
                ),
            }

            subject = render_to_string(
                "emails/password_reset_subject.txt", context
            ).strip()
            text_body = render_to_string("emails/password_reset_email.txt", context)
            html_body = render_to_string("emails/password_reset_email.html", context)

            from apps.notifications.delivery import queue_email, deliver_email

            delivery = queue_email(
                f"password-reset-{user.pk}-{token}",
                user.email,
                subject,
                text_body,
                html_body,
                settings.PASSWORD_RESET_TIMEOUT,
            )
            deliver_email(delivery.pk)

        return Response(
            {
                "detail": "If an account with that email exists, a reset link has been sent."
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    throttle_classes = [RecoveryThrottle]
    """Validate token and set a new password."""

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response(
                {"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Reset link is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth.password_validation import validate_password

        validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=["password"])
        revoke_refresh_tokens(user)

        return Response(
            {"detail": "Password reset successful."}, status=status.HTTP_200_OK
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH current authenticated user."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserAddressViewSet(viewsets.ModelViewSet):
    """CRUD for user shipping addresses."""

    serializer_class = UserAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user).order_by(
            "-is_default", "-created_at", "-id"
        )


class PasswordChangeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from rest_framework import serializers
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        old_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not isinstance(old_password, str) or not request.user.check_password(
            old_password
        ):
            raise serializers.ValidationError(
                {"current_password": "Your current password is incorrect."}
            )
        if not isinstance(new_password, str):
            raise serializers.ValidationError({"new_password": "Enter a new password."})
        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": error.messages})
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        revoke_refresh_tokens(request.user)
        refresh = RefreshToken.for_user(request.user)
        return Response(
            {
                "detail": "Password updated. Other sessions have been signed out.",
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            }
        )


class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from rest_framework.exceptions import ValidationError
        from rest_framework_simplejwt.exceptions import TokenError

        raw = request.data.get("refresh")
        if raw:
            try:
                token = RefreshToken(raw)
                if request.user.is_authenticated and str(token["user_id"]) != str(
                    request.user.pk
                ):
                    raise ValidationError(
                        "This session does not belong to your account."
                    )
                token.blacklist()
            except TokenError:
                pass  # Expired/revoked sessions are already signed out.
        return Response({"detail": "Signed out."})


def queue_verification(user):
    import hashlib
    from django.core import signing
    from apps.notifications.delivery import queue_email

    token = signing.dumps(
        {"uid": user.pk, "email": user.email}, salt="email-verification", compress=True
    )
    url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    return queue_email(
        f"email-verification-{hashlib.sha256(token.encode()).hexdigest()}",
        user.email,
        "Verify your DrivioCars email",
        f"Confirm your email address: {url}\n\nThis link expires in 24 hours. If you did not create this account, ignore this message.",
    )


class SendVerificationView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [RecoveryThrottle]

    def post(self, request):
        if not request.user.email_verified_at:
            queue_verification(request.user)
        return Response(
            {
                "detail": "If your address needs verification, a confirmation email has been queued."
            }
        )


class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthenticationThrottle]

    def post(self, request):
        from django.core import signing
        from django.utils import timezone
        from rest_framework import serializers
        from rest_framework.exceptions import ValidationError

        token = serializers.CharField(max_length=1000).run_validation(
            request.data.get("token")
        )
        try:
            data = signing.loads(token, salt="email-verification", max_age=86400)
            user = User.objects.get(pk=data["uid"], email=data["email"], is_active=True)
        except (
            signing.BadSignature,
            User.DoesNotExist,
            KeyError,
            ValueError,
            TypeError,
        ):
            raise ValidationError(
                "This verification link is invalid or expired. Request a new link from account settings."
            )
        if not user.email_verified_at:
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified_at"])
        return Response({"detail": "Your email address is verified."})


def revoke_refresh_tokens(user):
    from rest_framework_simplejwt.token_blacklist.models import (
        OutstandingToken,
        BlacklistedToken,
    )

    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
