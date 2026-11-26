from django.db import models
from django.conf import settings


class Inspection(models.Model):
    GRADE_CHOICES = [
        ("exceptional", "Exceptional"), ("excellent", "Excellent"),
        ("good", "Good"), ("fair", "Fair"), ("poor", "Poor"),
    ]
    STATUS_CHOICES = [("scheduled", "Scheduled"), ("in_progress", "In Progress"), ("completed", "Completed")]

    car = models.ForeignKey("cars.Car", on_delete=models.CASCADE, related_name="inspections")
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="inspections_conducted")
    report_number = models.CharField(max_length=20, unique=True)
    overall_score = models.DecimalField(max_digits=3, decimal_places=1)
    grade = models.CharField(max_length=15, choices=GRADE_CHOICES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="scheduled")
    inspection_date = models.DateField()
    inspector_name = models.CharField(max_length=100, blank=True)
    inspector_title = models.CharField(max_length=100, blank=True)
    inspector_completions = models.PositiveIntegerField(default=0)
    inspector_notes = models.TextField(blank=True)
    is_cpo = models.BooleanField(default=False)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Inspection #{self.report_number}"


class InspectionCategory(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True)
    total_points = models.PositiveIntegerField()
    passed_points = models.PositiveIntegerField()
    grade = models.CharField(max_length=20)
    has_flag = models.BooleanField(default=False)
    flag_description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Inspection categories"


class InspectionCheckpoint(models.Model):
    STATUS_CHOICES = [
        ("passed", "Passed"), ("fair", "Fair"),
        ("replaced", "Replaced"), ("failed", "Failed"),
    ]
    category = models.ForeignKey(InspectionCategory, on_delete=models.CASCADE, related_name="checkpoints")
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    value = models.CharField(max_length=50, blank=True)


class InspectionPhoto(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="inspections/")
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    has_flag = models.BooleanField(default=False)
