from django.db import models


class HelpCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True)
    slug = models.SlugField(unique=True)
    article_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "Help categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class HelpArticle(models.Model):
    category = models.ForeignKey(
        HelpCategory, on_delete=models.CASCADE, related_name="articles"
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_faq = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-views"]

    def __str__(self):
        return self.title


class SupportTicket(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="tickets"
    )
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class Testimonial(models.Model):
    user_name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to="testimonials/", blank=True)
    text = models.TextField()
    rating = models.PositiveIntegerField()
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SupportReply(models.Model):
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name="replies"
    )
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    body = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
