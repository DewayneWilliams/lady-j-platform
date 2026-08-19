from flask import Flask, render_template, request
import sqlite3
from pathlib import Path
from datetime import datetime

app = Flask(__name__)

DATABASE = Path("ladyj_bookings.db")

SERVICES = [
    # HAIR
    {"id": "hair-01", "category": "Hair", "name": "Women's Haircut", "price": 200, "minutes": 45},
    {"id": "hair-02", "category": "Hair", "name": "Wash & Blow Dry", "price": 300, "minutes": 60},
    {"id": "hair-03", "category": "Hair", "name": "Blow Dry & Flat Iron", "price": 300, "minutes": 90},
    {"id": "hair-04", "category": "Hair", "name": "Hydrating Silk Press", "price": 600, "minutes": 150},
    {"id": "hair-05", "category": "Hair", "name": "Shampoo & Roller Set", "price": 200, "minutes": 120},
    {"id": "hair-06", "category": "Hair", "name": "Deep Conditioning", "price": 250, "minutes": 45},
    {"id": "hair-07", "category": "Hair", "name": "Relaxer Retouch", "price": 300, "minutes": 120},
    {"id": "hair-08", "category": "Hair", "name": "Virgin Relaxer", "price": 500, "minutes": 120},
    {"id": "hair-09", "category": "Hair", "name": "Root Colour Touch-Up", "price": 400, "minutes": 90},
    {"id": "hair-10", "category": "Hair", "name": "All-Over Hair Colour", "price": 550, "minutes": 120},
    {"id": "hair-11", "category": "Hair", "name": "Special Occasion Updo", "price": 450, "minutes": 90},
    {"id": "hair-12", "category": "Hair", "name": "Hair Consultation", "price": 100, "minutes": 20},

    # NAILS
    {"id": "nails-01", "category": "Nails", "name": "Classic Manicure", "price": 180, "minutes": 45},
    {"id": "nails-02", "category": "Nails", "name": "Spa Manicure", "price": 250, "minutes": 60},
    {"id": "nails-03", "category": "Nails", "name": "Gel Manicure", "price": 350, "minutes": 60},
    {"id": "nails-04", "category": "Nails", "name": "Classic Pedicure", "price": 250, "minutes": 60},
    {"id": "nails-05", "category": "Nails", "name": "Spa Pedicure", "price": 350, "minutes": 75},
    {"id": "nails-06", "category": "Nails", "name": "Gel Pedicure", "price": 380, "minutes": 75},
    {"id": "nails-07", "category": "Nails", "name": "Gel Polish Change", "price": 225, "minutes": 30},
    {"id": "nails-08", "category": "Nails", "name": "Gel Soak-Off", "price": 150, "minutes": 30},
    {"id": "nails-09", "category": "Nails", "name": "Acrylic Full Set", "price": 400, "minutes": 120},
    {"id": "nails-10", "category": "Nails", "name": "Acrylic Refill", "price": 300, "minutes": 90},

    # SKIN
    {"id": "skin-01", "category": "Skin & Facials", "name": "Express Glow Facial", "price": 300, "minutes": 30},
    {"id": "skin-02", "category": "Skin & Facials", "name": "Classic Facial", "price": 450, "minutes": 60},
    {"id": "skin-03", "category": "Skin & Facials", "name": "Deep Cleansing Facial", "price": 500, "minutes": 75},
    {"id": "skin-04", "category": "Skin & Facials", "name": "Hydrating Facial", "price": 550, "minutes": 60},
    {"id": "skin-05", "category": "Skin & Facials", "name": "Brightening Facial", "price": 600, "minutes": 60},
    {"id": "skin-06", "category": "Skin & Facials", "name": "Age-Defying Facial", "price": 650, "minutes": 75},
    {"id": "skin-07", "category": "Skin & Facials", "name": "Dermaplaning Facial", "price": 675, "minutes": 60},
    {"id": "skin-08", "category": "Skin & Facials", "name": "LED Lumi Facial", "price": 300, "minutes": 30},
    {"id": "skin-09", "category": "Skin & Facials", "name": "Gentleman's Facial", "price": 600, "minutes": 60},
    {"id": "skin-10", "category": "Skin & Facials", "name": "Back Facial", "price": 450, "minutes": 60},

    # WAXING
    {"id": "wax-01", "category": "Waxing", "name": "Eyebrow Wax", "price": 50, "minutes": 15},
    {"id": "wax-02", "category": "Waxing", "name": "Upper Lip Wax", "price": 30, "minutes": 10},
    {"id": "wax-03", "category": "Waxing", "name": "Chin Wax", "price": 50, "minutes": 10},
    {"id": "wax-04", "category": "Waxing", "name": "Full Face Wax", "price": 180, "minutes": 30},
    {"id": "wax-05", "category": "Waxing", "name": "Underarm Wax", "price": 80, "minutes": 20},
    {"id": "wax-06", "category": "Waxing", "name": "Bikini Line Wax", "price": 120, "minutes": 30},
    {"id": "wax-07", "category": "Waxing", "name": "Brazilian Wax", "price": 300, "minutes": 60},
    {"id": "wax-08", "category": "Waxing", "name": "Half Leg Wax", "price": 180, "minutes": 40},
    {"id": "wax-09", "category": "Waxing", "name": "Full Leg Wax", "price": 280, "minutes": 60},
    {"id": "wax-10", "category": "Waxing", "name": "Full Arm Wax", "price": 220, "minutes": 45},

    # BROWS
    {"id": "brow-01", "category": "Brows", "name": "Brow Shape", "price": 60, "minutes": 20},
    {"id": "brow-02", "category": "Brows", "name": "Brow Tint", "price": 80, "minutes": 20},
    {"id": "brow-03", "category": "Brows", "name": "Brow Wax & Tint", "price": 120, "minutes": 30},
    {"id": "brow-04", "category": "Brows", "name": "Brow Mapping, Wax & Tint", "price": 150, "minutes": 40},

    # LASHES
    {"id": "lash-01", "category": "Lashes", "name": "Strip Lash Application", "price": 80, "minutes": 20},
    {"id": "lash-02", "category": "Lashes", "name": "Classic Lash Extensions", "price": 450, "minutes": 120},
    {"id": "lash-03", "category": "Lashes", "name": "Hybrid Lash Extensions", "price": 600, "minutes": 120},
    {"id": "lash-04", "category": "Lashes", "name": "Lash Lift & Tint", "price": 300, "minutes": 60},
]

CATEGORIES = ["Hair", "Nails", "Skin & Facials", "Waxing", "Brows", "Lashes"]


def init_db():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                service_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                service_price INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                exact_time INTEGER DEFAULT 0,
                extended_hours INTEGER DEFAULT 0,
                status TEXT DEFAULT 'Requested'
            )
        """)


@app.route("/")
def home():
    return render_template(
        "index.html",
        services=SERVICES,
        categories=CATEGORIES
    )


@app.route("/book", methods=["POST"])
def book():
    service_id = request.form.get("service_id")

    service = next(
        (item for item in SERVICES if item["id"] == service_id),
        None
    )

    if not service:
        return "Invalid service", 400

    appointment_time = request.form.get("appointment_time", "")

    try:
        hour = int(appointment_time.split(":")[0])
        extended_hours = hour < 10 or hour >= 18
    except (ValueError, IndexError):
        extended_hours = False

    exact_time = request.form.get("exact_time") == "yes"

    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
            INSERT INTO bookings (
                created_at,
                customer_name,
                phone,
                email,
                service_id,
                service_name,
                service_price,
                appointment_date,
                appointment_time,
                exact_time,
                extended_hours,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(timespec="seconds"),
            request.form.get("customer_name", "").strip(),
            request.form.get("phone", "").strip(),
            request.form.get("email", "").strip(),
            service["id"],
            service["name"],
            service["price"],
            request.form.get("appointment_date", ""),
            appointment_time,
            int(exact_time),
            int(extended_hours),
            "Deposit Required" if exact_time else "Requested"
        ))

    return render_template(
        "success.html",
        service=service,
        appointment_date=request.form.get("appointment_date"),
        appointment_time=appointment_time,
        exact_time=exact_time,
        extended_hours=extended_hours
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)