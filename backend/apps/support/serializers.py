from rest_framework import serializers
from .models import HelpCategory, HelpArticle, SupportTicket, Testimonial


class HelpCategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(source="articles.count", read_only=True)

    class Meta:
        model = HelpCategory
        fields = ["id", "name", "icon", "slug", "article_count"]


class HelpArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = HelpArticle
        fields = [
            "id",
            "category",
            "category_name",
            "title",
            "content",
            "is_faq",
            "views",
            "created_at",
        ]


class SupportReplySerializer(serializers.ModelSerializer):
    from_staff = serializers.BooleanField(source="author.is_staff", read_only=True)

    class Meta:
        from .models import SupportReply

        model = SupportReply
        fields = ["id", "body", "from_staff", "created_at"]
        read_only_fields = ["id", "from_staff", "created_at"]
        extra_kwargs = {"body": {"min_length": 5, "max_length": 5000}}


class SupportTicketSerializer(serializers.ModelSerializer):
    replies = SupportReplySerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "subject",
            "message",
            "status",
            "priority",
            "created_at",
            "updated_at",
            "replies",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ["id", "user_name", "avatar", "text", "rating", "is_featured"]
