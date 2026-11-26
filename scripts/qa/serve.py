"""Start an isolated browser-test API and worker; never connect to the user's DB."""

import io
import json
import os
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
qa_root = Path(os.environ["DRIVIO_QA_ROOT"]).resolve()
if not qa_root.name.startswith("drivio-qa-") or not qa_root.is_relative_to(
    Path(tempfile.gettempdir()).resolve()
):
    raise SystemExit("Browser tests require their own temporary drivio-qa-* directory.")
qa_root.mkdir(mode=0o700, parents=True, exist_ok=True)
os.environ.update(
    DJANGO_SETTINGS_MODULE="config.settings",
    DB_ENGINE="django.db.backends.sqlite3",
    DB_NAME=str(qa_root / "db.sqlite3"),
    MEDIA_ROOT=str(qa_root / "media"),
    PRIVATE_MEDIA_ROOT=str(qa_root / "private"),
    DJANGO_DEBUG="True",
    PAYMENTS_MODE="test",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:3100",
    REQUIRE_WORKER_HEALTH="False",
)
os.environ.pop("REDIS_URL", None)
subprocess.run(
    [sys.executable, str(root / "backend/manage.py"), "migrate", "--noinput"],
    check=True,
)
sys.path.insert(0, str(root / "backend"))
import django

django.setup()
from django.contrib.auth import get_user_model
from apps.accounts.models import UserAddress
from apps.cars.models import CarBrand, CarModel, Car
from apps.parts.models import PartCategory, Part
from apps.vendors.models import VendorProfile

User = get_user_model()
if User.objects.exists():
    raise SystemExit(
        "Refusing to overwrite an existing QA database. Start a fresh test run."
    )
fixture = {}
password = "Temporary-Browser-Only-952!"
for role in ("buyer", "seller", "rival"):
    user = User.objects.create_user(
        email=f"{role}@browser.example",
        username=role,
        password=password,
        first_name=f"QA {role}",
    )
    fixture[role] = {"id": user.pk, "email": user.email, "password": password}
    if role != "seller":
        UserAddress.objects.create(
            user=user,
            label="Home",
            full_name="QA Buyer",
            street="12 Test Road",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
            country="India",
            is_default=True,
        )
    else:
        VendorProfile.objects.create(
            user=user,
            business_name="QA Garage",
            contact_person="QA Seller",
            business_email=user.email,
            phone="9876543210",
            verification_status="verified",
        )
brand = CarBrand.objects.create(name="QA Motors", slug="qa")
model = CarModel.objects.create(brand=brand, name="Tourer", slug="tourer")
category = PartCategory.objects.create(name="Brakes", slug="brakes")
fixture.update(brand=brand.pk, model=model.pk, category=category.pk)
for index in range(2):
    car = Car.objects.create(
        seller_id=fixture["seller"]["id"],
        brand=brand,
        model=model,
        year=2024,
        price=500000,
        mileage=1000,
        fuel_type="petrol",
        transmission="manual",
        color="Blue",
        vin=f"BROWSERTEST{index:06}",
        location="Mumbai",
        status="active",
    )
    fixture["car" if index == 0 else "auction_car"] = car.pk
for index in range(22):
    part = Part.objects.create(
        seller_id=fixture["seller"]["id"],
        category=category,
        name=f"QA brake kit {index:02}",
        sku=f"QA-{index:03}",
        description="Confirm fitment with the seller before buying.",
        price=100 + index,
        stock=10,
        condition="new",
    )
    if index == 0:
        fixture["part"] = part.pk
fixture_path = qa_root / "fixture.json"
fixture_path.write_text(json.dumps(fixture))
fixture_path.chmod(0o600)
children = []


def stop(signum, frame):
    raise SystemExit(0)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    children.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "config.asgi:application",
                "--host",
                "127.0.0.1",
                "--port",
                "8100",
            ],
            cwd=root / "backend",
        )
    )
    children.append(
        subprocess.Popen(
            [sys.executable, "manage.py", "marketplace_worker", "--interval", "1"],
            cwd=root / "backend",
        )
    )
    children[0].wait()
finally:
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
