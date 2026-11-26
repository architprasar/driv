from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import UserAddress

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, write_only=True, max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "full_name",
            "password",
            "password2",
            "phone",
            "role",
        ]
        extra_kwargs = {"username": {"required": False}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account already uses this email. Sign in or reset your password."
            )
        return value

    def validate_role(self, value):
        if value not in {"buyer", "seller"}:
            raise serializers.ValidationError(
                "Choose a buyer or seller account. Vendors must complete business registration."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if not attrs.get("username"):
            import uuid
            from django.utils.text import slugify

            base = (
                slugify(attrs.get("full_name", "") or attrs["email"].split("@")[0])[:80]
                or "member"
            )
            attrs["username"] = f"{base}-{uuid.uuid4().hex[:10]}"
        return attrs

    def create(self, validated_data):
        name = validated_data.pop("full_name", "")
        return User.objects.create_user(first_name=name, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user = User.objects.filter(email__iexact=value.strip()).only("email").first()
        return user.email if user else value.strip().lower()

    password = serializers.CharField()


class PasswordForgotSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        return obj.get_full_name() or obj.username

    email_verified = serializers.SerializerMethodField()

    def get_email_verified(self, obj):
        return obj.email_verified_at is not None

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "display_name",
            "phone",
            "avatar",
            "role",
            "is_verified",
            "email_verified",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "is_verified", "date_joined"]


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = [
            "id",
            "label",
            "full_name",
            "street",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
        ]

    @transaction.atomic
    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        if validated_data.get("is_default"):
            UserAddress.objects.filter(
                user=validated_data["user"], is_default=True
            ).update(is_default=False)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            UserAddress.objects.filter(user=instance.user, is_default=True).exclude(
                pk=instance.pk
            ).update(is_default=False)
        return super().update(instance, validated_data)


from rest_framework_simplejwt.serializers import TokenRefreshSerializer


class SessionRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        from rest_framework_simplejwt.authentication import JWTAuthentication

        token = self.token_class(attrs["refresh"])
        JWTAuthentication().get_user(token)
        return super().validate(attrs)
