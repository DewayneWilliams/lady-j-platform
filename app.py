from datetime import datetime
import sqlite3

from flask import Flask, render_template, request

app = Flask(__name__)

SERVICES = {
    "silk_press": {
        "name": "Silk Press",
        "price": 350,
        "duration": "2 hrs",
        "category": "Hair",
    },
    "wash_style": {
        "name": "Wash & Style",
        "price": 250,
        "duration": "1 hr 30 min",
        "category": "Hair",
    },
    "relaxer": {
        "name": "Relaxer & Style",
        "price": 400,
        "duration": "2 hrs",
        "category": "Hair",
    },
    "color": {
        "name": "Colour Experience",
        "price": 450,
        "duration": "2 hrs 30 min",
        "category": "Colour",
    },
    "facial": {
        "name": "Luxury Facial",
        "price": 350,
        "duration": "1 hr",
        "category": "Spa",
    },
    "massage": {
        "name": "Relaxation Massage",
        "price": 450,
        "duration": "1 hr",
        "category": "Spa",
    },
}


def init_db():
    with sqlite3.connect("bookings.db") as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT NOT NULL,
                services TEXT NOT NULL,
                total REAL NOT NULL,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL
            )
            """
        )


@app.route("/")
def home():
    return render_template("index.html", services=SERVICES)


@app.route("/booking", methods=["GET", "POST"])
def booking():
    success = False

    if request.method == "POST":
        selected_ids = request.form.getlist("services")

        selected_services = [
            SERVICES[service_id]
            for service_id in selected_ids
            if service_id in SERVICES
        ]

        if not selected_services:
            return render_template(
                "booking.html",
                services=SERVICES,
                error="Please select at least one service.",
            )

        total = sum(service["price"] for service in selected_services)

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        appointment_date = request.form.get("appointment_date", "")
        appointment_time = request.form.get("appointment_time", "")
        notes = request.form.get("notes", "").strip()

        if not all([name, email, phone, appointment_date, appointment_time]):
            return render_template(
                "booking.html",
                services=SERVICES,
                error="Please complete all required fields.",
            )

        service_names = ", ".join(
            service["name"] for service in selected_services
        )

        with sqlite3.connect("bookings.db") as conn:
            conn.execute(
                """
                INSERT INTO bookings (
                    name,
                    email,
                    phone,
                    appointment_date,
                    appointment_time,
                    services,
                    total,
                    notes,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    email,
                    phone,
                    appointment_date,
                    appointment_time,
                    service_names,
                    total,
                    notes,
                    datetime.now().isoformat(timespec="seconds"),
                ),
            )

        success = True

    return render_template(
        "booking.html",
        services=SERVICES,
        success=success,
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)