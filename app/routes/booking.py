"""Three-step booking experience."""

from __future__ import annotations

import os
import secrets

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import current_user
from werkzeug.utils import secure_filename

from app.ai.photo_recommend import recommend_from_image
from app.db import get_db
from app.services.booking import (
    BookingError,
    available_slots,
    create_appointment,
    get_appointment,
    get_setting_deposit,
    load_services,
    total_duration,
    total_price,
)
from app.services.hours import minutes_to_label
from app.services.payments import (
    PaymentError,
    process_card_deposit,
    submit_bank_transfer,
)

bp = Blueprint("booking", __name__, url_prefix="/book")


def _cart() -> list[dict]:
    return session.get("booking_cart", [])


def _set_cart(items: list[dict]) -> None:
    session["booking_cart"] = items
    session.modified = True


@bp.get("/")
def book_start():
    return redirect(url_for("booking.step1"))


@bp.route("/step-1", methods=["GET", "POST"])
def step1():
    db = get_db()
    from app.services.catalog import group_services

    rows = db.execute(
        """
        SELECT * FROM services
        WHERE is_active = 1
        ORDER BY category, is_addon, sort_order, name
        """
    ).fetchall()
    groups = group_services(rows)

    recommendations = None
    if request.method == "POST":
        action = request.form.get("action")
        if action == "update_cart":
            cart = []
            for key in request.form:
                if key.startswith("service_"):
                    sid = int(key.split("_", 1)[1])
                    cart.append({"service_id": sid, "qty": 1})
            _set_cart(cart)
            if request.form.get("continue"):
                if not cart:
                    flash("Please select at least one service.", "error")
                else:
                    return redirect(url_for("booking.step2"))
        elif action == "photo_guide":
            f = request.files.get("inspiration")
            filename = secure_filename(f.filename) if f and f.filename else "inspiration.jpg"
            image_bytes = f.read() if f and f.filename else None
            recommendations = recommend_from_image(
                filename=filename, image_bytes=image_bytes
            )

    cart_ids = {c["service_id"] for c in _cart()}
    # Flatten for Fresha-style summary sidebar
    catalog = {r["id"]: r for rows in groups.values() for r in rows}
    # Also include any row not in groups (safety)
    for rows in groups.values():
        for r in rows:
            catalog[r["id"]] = r
    cart_items = []
    cart_total = 0.0
    cart_mins = 0
    for sid in cart_ids:
        svc = catalog.get(sid)
        if not svc:
            continue
        cart_items.append(svc)
        cart_total += float(svc["price_ttd"])
        cart_mins += int(svc["duration_minutes"])
    return render_template(
        "booking/step1.html",
        groups=groups,
        cart_ids=cart_ids,
        cart_items=cart_items,
        cart_total=cart_total,
        cart_mins=cart_mins,
        recommendations=recommendations,
        step=1,
    )


@bp.route("/step-2", methods=["GET", "POST"])
def step2():
    from datetime import date as date_cls

    from app.services.hours import (
        month_calendar,
        now_local,
        open_close,
        same_day_notice,
    )

    cart = _cart()
    if not cart:
        flash("Select your services first.", "info")
        return redirect(url_for("booking.step1"))

    items = []
    for c in cart:
        svcs = load_services([c["service_id"]])
        if svcs:
            items.append((svcs[0], c["qty"]))
    duration = total_duration(items)
    price = total_price(items)

    today = now_local().date()
    year = int(request.args.get("year", today.year))
    month = int(request.args.get("month", today.month))
    if month < 1:
        month, year = 12, year - 1
    if month > 12:
        month, year = 1, year + 1

    selected_date = session.get("booking_date")
    selected_time = session.get("booking_time")

    if request.method == "POST":
        selected_date = request.form.get("date")
        selected_time = request.form.get("time")
        if selected_date:
            session["booking_date"] = selected_date
        if selected_time:
            session["booking_time"] = int(selected_time)
        if request.form.get("continue") and selected_date and selected_time:
            return redirect(url_for("booking.step3"))
        if request.form.get("continue"):
            flash("Please choose a date and time.", "error")

    # Default to today when same-day slots exist
    if not selected_date:
        today_slots = available_slots(today, duration)
        if today_slots:
            selected_date = today.isoformat()
            session["booking_date"] = selected_date

    slots = []
    if selected_date:
        try:
            slots = available_slots(date_cls.fromisoformat(selected_date), duration)
        except ValueError:
            slots = []

    cal = month_calendar(year, month, duration)
    open_m, close_m = open_close()
    prev_y, prev_m = (year - 1, 12) if month == 1 else (year, month - 1)
    next_y, next_m = (year + 1, 1) if month == 12 else (year, month + 1)
    can_show_previous_month = (year, month) > (today.year, today.month)

    return render_template(
        "booking/step2.html",
        calendar=cal,
        slots=slots,
        selected_date=selected_date,
        selected_time=selected_time,
        duration=duration,
        price=price,
        items=items,
        minutes_to_label=minutes_to_label,
        open_label=minutes_to_label(open_m),
        close_label=minutes_to_label(close_m),
        same_day_notice=same_day_notice(),
        prev_year=prev_y,
        prev_month=prev_m,
        can_show_previous_month=can_show_previous_month,
        next_year=next_y,
        next_month=next_m,
        step=2,
    )


@bp.route("/step-3", methods=["GET", "POST"])
def step3():
    cart = _cart()
    selected_date = session.get("booking_date")
    selected_time = session.get("booking_time")
    if not cart or not selected_date or selected_time is None:
        flash("Complete the previous booking steps first.", "info")
        return redirect(url_for("booking.step1"))

    items = []
    for c in cart:
        svcs = load_services([c["service_id"]])
        if svcs:
            items.append((svcs[0], c["qty"]))
    duration = total_duration(items)
    price = total_price(items)
    deposit_pct = get_setting_deposit()
    deposit = round(price * deposit_pct / 100, 2)

    db = get_db()
    policy = db.execute(
        "SELECT value FROM business_settings WHERE key = 'cancellation_policy'"
    ).fetchone()
    policy_text = policy["value"] if policy else ""

    if request.method == "POST":
        name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        notes = request.form.get("notes", "").strip()
        payment_method = request.form.get("payment_method", "bank_transfer")
        policy_ok = bool(request.form.get("policy_accepted"))

        if current_user.is_authenticated:
            name = name or current_user.full_name
            email = email or current_user.email
            phone = phone or (current_user.phone or "")

        if not all([name, email, phone]):
            flash("Please complete your contact details.", "error")
        elif not policy_ok:
            flash("Please accept the cancellation policy.", "error")
        else:
            try:
                result = create_appointment(
                    client_id=current_user.id if current_user.is_authenticated else None,
                    guest_name=name,
                    guest_email=email,
                    guest_phone=phone,
                    appointment_date=selected_date,
                    start_minutes=int(selected_time),
                    service_qty=[(c["service_id"], c["qty"]) for c in cart],
                    notes=notes or None,
                    payment_method=payment_method,
                    policy_accepted=policy_ok,
                    actor_id=current_user.id if current_user.is_authenticated else None,
                )
                appt = result["appointment"]
                appt_id = appt["id"]

                if payment_method == "card":
                    pay = process_card_deposit(
                        appt_id,
                        current_user.id if current_user.is_authenticated else None,
                    )
                    flash(
                        pay["provider_result"].get("note")
                        or "Card deposit processed (simulated).",
                        "success",
                    )
                elif payment_method == "bank_transfer":
                    proof = request.files.get("proof")
                    proof_path = None
                    if proof and proof.filename:
                        fname = secure_filename(
                            f"{secrets.token_hex(4)}_{proof.filename}"
                        )
                        dest = os.path.join(
                            current_app.config["UPLOAD_FOLDER"], fname
                        )
                        proof.save(dest)
                        proof_path = f"uploads/{fname}"
                    submit_bank_transfer(
                        appointment_id=appt_id,
                        user_id=current_user.id if current_user.is_authenticated else None,
                        amount_ttd=deposit,
                        bank_reference=request.form.get("bank_reference", ""),
                        bank_payment_date=request.form.get("bank_payment_date", ""),
                        proof_path=proof_path,
                    )
                    flash(
                        "Bank transfer submitted. Your appointment is pending owner verification.",
                        "success",
                    )
                else:
                    flash(
                        "Appointment reserved. Pay your balance at the salon.",
                        "success",
                    )

                # Clear booking session
                for k in ("booking_cart", "booking_date", "booking_time"):
                    session.pop(k, None)
                return redirect(url_for("booking.confirmation", appt_id=appt_id))
            except (BookingError, PaymentError) as exc:
                flash(exc.message, "error")

    return render_template(
        "booking/step3.html",
        items=items,
        duration=duration,
        price=price,
        deposit_pct=deposit_pct,
        deposit=deposit,
        selected_date=selected_date,
        selected_time=selected_time,
        start_label=minutes_to_label(int(selected_time)),
        policy_text=policy_text,
        bank={
            "name": current_app.config["BANK_NAME"],
            "account_name": current_app.config["BANK_ACCOUNT_NAME"],
            "account_type": current_app.config["BANK_ACCOUNT_TYPE"],
            "account_number": current_app.config["BANK_ACCOUNT_NUMBER"],
        },
        step=3,
    )


@bp.get("/confirmation/<int:appt_id>")
def confirmation(appt_id: int):
    try:
        result = get_appointment(appt_id)
    except BookingError:
        flash("Appointment not found.", "error")
        return redirect(url_for("booking.step1"))
    return render_template("booking/confirmation.html", result=result)
