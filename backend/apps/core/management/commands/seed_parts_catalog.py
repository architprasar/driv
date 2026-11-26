"""Seed a realistic parts catalogue (idempotent, keyed on SKU). No images: the UI renders a spec tile."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.cars.models import CarBrand
from apps.parts.models import Part, PartCategory

CATEGORIES = {
    "Engine & Intake": "Turbos, intakes, gaskets, belts and complete engine components.",
    "Brakes": "Discs, pads, calipers and brake lines, matched to your model.",
    "Suspension & Steering": "Shocks, control arms, bushes and steering racks.",
    "Transmission & Drivetrain": "Gearboxes, clutches, flywheels and driveshafts.",
    "Electrical & Lighting": "Headlamps, sensors, batteries, alternators and modules.",
    "Wheels & Tyres": "OEM and aftermarket alloys and performance tyres.",
    "Filters & Fluids": "Service-interval parts: filters, oils and coolants.",
    "Exterior & Interior": "Mirrors, bumpers, trim, seats and cabin parts.",
}

# (category, name, sku, price INR, condition, genuine, stock, featured, brands, description)
P = [
    ("Engine & Intake", "Turbocharger Assembly 2.0 TFSI", "ENG-TB-2001", 68500, "refurbished", True, 3, True, ["audi"], "Remanufactured turbo with new bearings and wastegate actuator. Balanced and flow-tested. 12-month warranty. Fits 2.0 TFSI EA888 engines."),
    ("Engine & Intake", "Cold Air Intake Kit, Carbon", "ENG-CI-2002", 28900, "new", False, 12, True, ["bmw", "audi"], "Closed-airbox carbon intake with oiled-free filter. Typical gain 8-12 bhp. No ECU remap required."),
    ("Engine & Intake", "Timing Chain Kit with Tensioner", "ENG-TC-2003", 21400, "new", True, 9, False, ["bmw"], "Complete chain, guides and hydraulic tensioner. Replace as a set at 120,000 km."),
    ("Engine & Intake", "Engine Mount, Hydraulic (Front Right)", "ENG-EM-2004", 9800, "new", True, 14, False, ["land-rover"], "Hydraulic damped mount; reduces idle vibration. Sold individually."),
    ("Brakes", "Front Brake Disc Pair, Vented 345mm", "BRK-FD-3001", 14200, "new", True, 20, True, ["bmw", "audi"], "Coated, vented discs with centre-hat balance. Supplied as a pair. Pads sold separately."),
    ("Brakes", "Ceramic Brake Pad Set, Front", "BRK-BP-3002", 6900, "new", True, 35, False, ["porsche", "bmw", "audi"], "Low-dust ceramic compound with wear sensor. Quiet, stable up to 600 degrees C."),
    ("Brakes", "Brake Caliper, Rear Left (Reman)", "BRK-CL-3003", 17600, "refurbished", True, 4, False, ["land-rover"], "Rebuilt with new pistons, seals and slider pins. Core charge not applicable."),
    ("Brakes", "Stainless Braided Brake Line Kit", "BRK-BL-3004", 5400, "new", False, 18, False, ["porsche"], "Teflon-lined, stainless braided lines for a firmer pedal. Full vehicle set."),
    ("Suspension & Steering", "Front Shock Absorber Pair, Adaptive", "SUS-SH-4001", 46800, "new", True, 6, True, ["audi", "porsche"], "Electronically controlled dampers with connectors. Supplied as a pair."),
    ("Suspension & Steering", "Front Lower Control Arm with Bush", "SUS-CA-4002", 11900, "new", True, 16, False, ["bmw"], "Forged-aluminium arm with pre-fitted bushes and ball joint."),
    ("Suspension & Steering", "Air Suspension Spring, Rear", "SUS-AS-4003", 24500, "used", True, 2, False, ["land-rover"], "Tested OEM air bag, no leaks under 8-bar pressure test. 90-day warranty."),
    ("Suspension & Steering", "Power Steering Rack (Reman)", "SUS-SR-4004", 38200, "refurbished", True, 3, False, ["chevrolet"], "Remanufactured rack with new inner joints. Alignment required after fitting."),
    ("Transmission & Drivetrain", "Clutch Kit with Dual-Mass Flywheel", "TRN-CK-5001", 43500, "new", True, 5, True, ["audi", "bmw"], "Matched pressure plate, disc, release bearing and flywheel for manual gearboxes."),
    ("Transmission & Drivetrain", "8-Speed Automatic Gearbox (Used)", "TRN-GB-5002", 189000, "used", True, 1, False, ["bmw"], "Low-mileage donor unit, 48,000 km. Mechatronic tested. 6-month warranty. Fitting recommended."),
    ("Transmission & Drivetrain", "CV Driveshaft, Front Left", "TRN-DS-5003", 12700, "new", False, 10, False, ["land-rover", "chevrolet"], "Complete shaft with new boots and joints, torque-tested."),
    ("Transmission & Drivetrain", "Transmission Oil Service Kit", "TRN-OK-5004", 7800, "new", True, 22, False, ["bmw", "audi", "porsche"], "OEM-spec fluid, filter, pan gasket and bolts for a complete sump service."),
    ("Electrical & Lighting", "LED Matrix Headlamp, Right", "ELE-HL-6001", 58900, "new", True, 4, True, ["audi"], "Adaptive matrix LED unit with control module. Plug and play. Sold individually."),
    ("Electrical & Lighting", "Alternator 180A (Reman)", "ELE-AL-6002", 18900, "refurbished", True, 7, False, ["bmw", "land-rover"], "Rebuilt with new regulator and bearings. Output tested at load."),
    ("Electrical & Lighting", "AGM Battery 90Ah, Start-Stop", "ELE-BT-6003", 16400, "new", False, 25, False, ["bmw", "audi", "chevrolet"], "AGM battery for start-stop vehicles. Battery registration required on BMW and Audi."),
    ("Electrical & Lighting", "Oxygen Sensor, Upstream", "ELE-OS-6004", 4600, "new", True, 30, False, ["porsche", "bmw"], "Wideband sensor with factory connector. Resolves fuel-trim fault codes."),
    ("Wheels & Tyres", "19-inch Forged Alloy Set (4)", "WHL-AL-7001", 142000, "new", False, 3, True, ["porsche", "audi"], "Lightweight forged wheels, 5x112 PCD, 8.5J/9.5J. Centre caps and bolts included."),
    ("Wheels & Tyres", "Performance Tyre 245/40 R19 (Set of 4)", "WHL-TY-7002", 84000, "new", True, 8, False, ["bmw", "audi"], "Max-performance summer tyres. DOT within 12 months of purchase."),
    ("Wheels & Tyres", "OEM Alloy Wheel 20-inch, Used", "WHL-OE-7003", 21500, "used", True, 6, False, ["land-rover"], "Genuine alloy, straight and true; minor kerb marks. Sold individually."),
    ("Wheels & Tyres", "TPMS Sensor Set (4)", "WHL-TP-7004", 9200, "new", False, 15, False, ["bmw", "chevrolet"], "Programmable sensors, 433 MHz. Includes valve stems."),
    ("Filters & Fluids", "Oil Filter and Air Filter Service Kit", "FLT-SK-8001", 3900, "new", True, 60, False, ["bmw", "audi", "porsche", "land-rover"], "OEM-equivalent oil, air and cabin filters in one box."),
    ("Filters & Fluids", "Synthetic Engine Oil 5W-30, 5L", "FLT-OL-8002", 5200, "new", True, 80, True, ["bmw", "audi", "porsche", "chevrolet", "land-rover"], "Long-life low-SAPS synthetic. Meets major European OEM approvals."),
    ("Filters & Fluids", "Coolant Concentrate, Pink, 5L", "FLT-CL-8003", 2100, "new", True, 45, False, ["bmw", "audi", "porsche"], "G12-plus type coolant. Mix 1:1 with demineralised water."),
    ("Filters & Fluids", "Fuel Filter with Housing", "FLT-FF-8004", 4300, "new", True, 28, False, ["chevrolet", "land-rover"], "Complete cartridge and seals. Replace every 60,000 km."),
    ("Exterior & Interior", "Wing Mirror Assembly, Left (Heated)", "EXT-MR-9001", 13800, "new", True, 9, False, ["bmw", "audi"], "Heated, power-fold mirror with indicator and blind-spot ready wiring. Primed cap."),
    ("Exterior & Interior", "Front Bumper Cover, Primed", "EXT-BM-9002", 19800, "new", False, 5, False, ["chevrolet", "bmw"], "Primed, ready to paint. Grille and sensor cut-outs included."),
    ("Exterior & Interior", "Sport Seat, Leather (Used), Driver", "EXT-ST-9003", 32500, "used", True, 2, False, ["porsche"], "Electric adjust, lumbar and heating tested. Light bolster wear."),
    ("Exterior & Interior", "All-Weather Floor Mat Set", "EXT-FM-9004", 6400, "new", False, 40, False, ["bmw", "audi", "land-rover", "porsche"], "Moulded TPE liners, laser-cut fit. Anti-slip backing."),
]


class Command(BaseCommand):
    def handle(self, *args, **options):
        seller = get_user_model().objects.filter(role="seller").first()
        if not seller:
            self.stdout.write(self.style.ERROR("No seller found. Run seed_data first."))
            return
        cats = {}
        for name, desc in CATEGORIES.items():
            cats[name], _ = PartCategory.objects.get_or_create(
                slug=slugify(name), defaults={"name": name, "description": desc}
            )
        brands = {b.slug: b for b in CarBrand.objects.all()}
        made = 0
        for cat, name, sku, price, cond, genuine, stock, featured, brand_slugs, desc in P:
            part, created = Part.objects.get_or_create(
                sku=sku,
                defaults={
                    "seller": seller,
                    "category": cats[cat],
                    "name": name,
                    "description": desc,
                    "price": Decimal(price),
                    "stock": stock,
                    "condition": cond,
                    "is_genuine": genuine,
                    "is_featured": featured,
                    "rating": Decimal("4.2") + Decimal(len(sku) % 7) / 10,
                    "review_count": 3 + (price % 17),
                },
            )
            if created:
                made += 1
                for slug in brand_slugs:
                    if slug in brands:
                        part.compatible_brands.add(brands[slug])
                        part.compatible_models.add(*brands[slug].models.all())
        self.stdout.write(self.style.SUCCESS(f"Parts catalogue ready ({made} new, {Part.objects.count()} total)"))
