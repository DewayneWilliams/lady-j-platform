"""Non-destructive seed: demo catalog + owner bootstrap. Never overwrites real services."""

from __future__ import annotations

import secrets

from flask import Flask
from werkzeug.security import generate_password_hash

from app.db import get_db, utcnow

# Preserved from original static/app.js catalog + demo expansion.
# format: (category, name, price, duration, is_addon, max_qty, qty_suffix)
LEGACY_SERVICES = [
    ("HAIR", "Wash & Blow Dry", 300, 60, 0, 1, None),
    ("HAIR", "Silk Press", 450, 90, 0, 1, None),
    ("HAIR", "Cut & Style", 350, 60, 0, 1, None),
    ("HAIR", "Natural Hair Styling", 350, 75, 0, 1, None),
    ("HAIR", "Loc Retwist", 400, 120, 0, 1, None),
    ("HAIR", "Braids / Twists", 450, 150, 0, 1, None),
    ("HAIR", "Relaxer", 400, 90, 0, 1, None),
    ("HAIR", "Hair Color", 500, 120, 0, 1, None),
    ("HAIR", "Highlights", 550, 120, 0, 1, None),
    ("HAIR", "Wig / Weave Installation", 500, 120, 0, 1, None),
    ("HAIR", "Deep Conditioning Treatment", 250, 45, 0, 1, None),
    ("HAIR", "Trim", 100, 15, 1, 1, None),
    ("HAIR", "Scalp Treatment", 150, 20, 1, 1, None),
    ("HAIR", "Extra Length / Density", 150, 30, 1, 1, None),
    ("SKIN & FACIALS", "Skin Analysis", 150, 30, 0, 1, None),
    ("SKIN & FACIALS", "Brightening Facial", 475, 60, 0, 1, None),
    ("SKIN & FACIALS", "Acne Facial", 500, 60, 0, 1, None),
    ("SKIN & FACIALS", "Rejuv RX Facial", 500, 60, 0, 1, None),
    ("SKIN & FACIALS", "Fire & Ice Facial", 700, 75, 0, 1, None),
    ("SKIN & FACIALS", "Korean Medi-Glow Facial", 650, 75, 0, 1, None),
    ("SKIN & FACIALS", "Zena Algae Peel", 850, 60, 0, 1, None),
    ("SKIN & FACIALS", "V.I Peel", 1850, 60, 0, 1, None),
    ("SKIN & FACIALS", "Perfect Derma Peel", 1650, 60, 0, 1, None),
    ("MANICURES", "Spa Manicure", 200, 45, 0, 1, None),
    ("MANICURES", "Gel-X", 325, 75, 0, 1, None),
    ("MANICURES", "BIAB / Gel Overlay", 325, 75, 0, 1, None),
    ("MANICURES", "Hard Gel Overlay", 350, 75, 0, 1, None),
    ("MANICURES", "Acrylic Full Set", 350, 90, 0, 1, None),
    ("MANICURES", "Acrylic Refill", 250, 60, 0, 1, None),
    ("MANICURES", "Nail Art", 10, 5, 1, 10, "per nail"),
    ("PEDICURES", "Spa Pedicure", 300, 60, 0, 1, None),
    ("PEDICURES", "Medical Pedicure", 600, 75, 0, 1, None),
    ("PEDICURES", "Deluxe Pedicure", 400, 75, 0, 1, None),
    ("LASHES", "Classic Lash Extensions", 450, 120, 0, 1, None),
    ("LASHES", "Hybrid Lash Extensions", 600, 135, 0, 1, None),
    ("LASHES", "Volume Lash Extensions", 700, 150, 0, 1, None),
    ("LASHES", "Lash Lift & Tint", 450, 75, 0, 1, None),
    ("BROWS", "Brow Shaping / Wax", 75, 20, 0, 1, None),
    ("BROWS", "Brow Tinting", 150, 30, 0, 1, None),
    ("BROWS", "Brow Lamination", 275, 45, 0, 1, None),
    ("BROWS", "Microblading", 1200, 120, 0, 1, None),
    ("WAXING", "Brows", 75, 15, 0, 1, None),
    ("WAXING", "Upper Lip", 50, 10, 0, 1, None),
    ("WAXING", "Full Face", 200, 30, 0, 1, None),
    ("WAXING", "Women's Brazilian", 300, 45, 0, 1, None),
    ("MASSAGE", "Swedish Massage — 60 min", 550, 60, 0, 1, None),
    ("MASSAGE", "Deep Tissue Massage — 60 min", 600, 60, 0, 1, None),
    ("MASSAGE", "Hot Stone Massage — 60 min", 600, 60, 0, 1, None),
    ("BODY & SPA", "Cocoa Bean Body Wrap", 500, 75, 0, 1, None),
    ("BODY & SPA", "Full Body Scrub", 350, 60, 0, 1, None),
    ("MAKEUP", "Makeup Application", 400, 60, 0, 1, None),
    ("MAKEUP", "Soft Glam", 400, 60, 0, 1, None),
    ("MAKEUP", "Full Glam", 500, 75, 0, 1, None),
    ("MAKEUP", "Bridal Makeup", 700, 90, 0, 1, None),
]

# Clearly labeled demonstration extras (is_demo=1) if catalog gaps remain.
DEMO_EXTRAS = [
    ("BRIDAL & PACKAGES", "Bridal Hair & Makeup Package", 1800, 180, 0, 1, None),
    ("BRIDAL & PACKAGES", "Spa Day Package", 1200, 150, 0, 1, None),
    ("HAIRCUTS & STYLING", "Precision Haircut (Demo)", 280, 45, 0, 1, None),
    ("SHAMPOO & BLOWOUTS", "Express Blowout (Demo)", 220, 45, 0, 1, None),
]

DEMO_WORKSHOPS = [
    (
        "bridal-glam-masterclass",
        "Bridal Glam Masterclass",
        "Hands-on bridal makeup and soft glam techniques for professionals.",
        "Lady J Team",
        "live",
        850,
        12,
        180,
    ),
    (
        "protective-styling-lab",
        "Protective Styling Lab",
        "Braids, twists, and healthy scalp practices — live with recorded replay.",
        "Lady J Team",
        "hybrid",
        650,
        16,
        150,
    ),
    (
        "skin-analysis-essentials",
        "Skin Analysis Essentials (Recorded)",
        "Learn consultation and product mapping for facial clients.",
        "Lady J Team",
        "recorded",
        400,
        None,
        90,
    ),
]

DEMO_PRODUCTS = [
    ("silk-press-serum", "Silk Press Serum", "Hair Care", "Lightweight heat-protect serum.", 185, 24),
    ("glow-facial-mist", "Glow Facial Mist", "Skincare", "Hydrating mist for post-facial care.", 145, 30),
    ("cuticle-oil-gold", "Cuticle Oil Gold", "Nails", "Nourishing cuticle oil with gold shimmer.", 95, 40),
    ("brow-gel-clear", "Brow Gel Clear", "Brows", "Soft-hold clear brow gel.", 110, 20),
]


def _slug(category: str, name: str) -> str:
    raw = f"{category}__{name}".lower()
    return "".join(c if c.isalnum() else "_" for c in raw).strip("_")


def ensure_seed_data(app: Flask) -> None:
    db = get_db()
    now = utcnow()

    # Test-only owner bootstrap. Production owners are provisioned explicitly
    # through the protected CLI command in app.admin.
    owner = db.execute(
        "SELECT id FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
        (app.config["OWNER_EMAIL"],),
    ).fetchone()
    if app.config.get("TESTING") and not owner:
        db.execute(
            """
            INSERT INTO users (
                email, password_hash, full_name, role, referral_code, email_verified,
                created_at, updated_at
            ) VALUES (?, ?, ?, 'owner', ?, 1, ?, ?)
            """,
            (
                app.config["OWNER_EMAIL"].strip().lower(),
                generate_password_hash(app.config["OWNER_PASSWORD"]),
                app.config["OWNER_NAME"],
                "LJ-" + secrets.token_hex(3).upper(),
                now,
                now,
            ),
        )

    # Services: insert only when slug missing (never overwrite)
    existing = {
        r["slug"]
        for r in db.execute("SELECT slug FROM services").fetchall()
    }
    order = 0
    for cat, name, price, dur, addon, max_qty, suffix in LEGACY_SERVICES:
        slug = _slug(cat, name)
        order += 1
        if slug in existing:
            continue
        db.execute(
            """
            INSERT INTO services (
                slug, name, category, description, price_ttd, duration_minutes,
                is_addon, max_qty, qty_suffix, is_demo, is_active, sort_order,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)
            """,
            (
                slug,
                name,
                cat,
                f"Professional {name.lower()} at Lady J Salon & Day Spa.",
                price,
                dur,
                addon,
                max_qty,
                suffix,
                order,
                now,
                now,
            ),
        )
        existing.add(slug)

    for cat, name, price, dur, addon, max_qty, suffix in DEMO_EXTRAS:
        slug = _slug(cat, name)
        order += 1
        if slug in existing:
            continue
        db.execute(
            """
            INSERT INTO services (
                slug, name, category, description, price_ttd, duration_minutes,
                is_addon, max_qty, qty_suffix, is_demo, is_active, sort_order,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
            """,
            (
                slug,
                name,
                cat,
                f"[DEMO] Editable demonstration service — confirm pricing with the salon.",
                price,
                dur,
                addon,
                max_qty,
                suffix,
                order,
                now,
                now,
            ),
        )

    # Workshops
    for slug, title, desc, instructor, mode, price, capacity, duration in DEMO_WORKSHOPS:
        if db.execute(
            "SELECT id FROM workshops WHERE slug = ?", (slug,)
        ).fetchone():
            continue
        db.execute(
            """
            INSERT INTO workshops (
                slug, title, description, instructor_name, mode, price_ttd,
                capacity, duration_minutes, is_published, is_demo,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
            """,
            (slug, title, desc, instructor, mode, price, capacity, duration, now, now),
        )

    # Products
    for slug, name, cat, desc, price, stock in DEMO_PRODUCTS:
        if db.execute(
            "SELECT id FROM products WHERE slug = ?", (slug,)
        ).fetchone():
            continue
        db.execute(
            """
            INSERT INTO products (
                slug, name, category, description, price_ttd, stock,
                is_published, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
            """,
            (slug, name, cat, f"[DEMO] {desc}", price, stock, now, now),
        )

    # Business settings defaults
    defaults = {
        "deposit_percent": str(app.config["DEPOSIT_PERCENT"]),
        "cancellation_policy": (
            "Cancellations 24+ hours before: full deposit refund eligibility. "
            "Under 24 hours: 50% of deposit credited to a future appointment; 50% retained. "
            "No-show: deposit forfeited."
        ),
        "open_minutes": "600",
        "close_minutes": "1080",
        "open_weekdays": "2,3,4,5,6",  # Tue–Sat
        "slot_step_minutes": "30",
        "same_day_notice_minutes": "30",
        "max_advance_days": "90",
        "fulfillment_pickup": "1",
        "fulfillment_delivery": "0",
    }
    for key, value in defaults.items():
        row = db.execute(
            "SELECT key FROM business_settings WHERE key = ?", (key,)
        ).fetchone()
        if not row:
            db.execute(
                "INSERT INTO business_settings (key, value, updated_at) VALUES (?, ?, ?)",
                (key, value, now),
            )

    db.commit()
