"""Owner / staff dashboard — large readable controls."""

from __future__ import annotations

import csv
import io
import calendar as calendar_lib
from datetime import date, timedelta

from flask import (
    Blueprint,
    Response,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required

from app.ai.maria import handle_command
from app.db import audit, get_db, utcnow
from app.services.booking import mark_no_show
from app.services.hours import minutes_to_label, now_local
from app.services.payments import PaymentError, verify_bank_payment

bp = Blueprint("owner", __name__, url_prefix="/owner")


@bp.before_request
@login_required
def owner_only():
    if not current_user.is_owner:
        abort(403)


@bp.get("/")
def index():
    return redirect(url_for("owner.today"))


@bp.get("/today")
def today():
    db = get_db()
    day = now_local().date().isoformat()
    appts = db.execute(
        """
        SELECT a.*, u.full_name AS client_name
        FROM appointments a
        LEFT JOIN users u ON u.id = a.client_id
        WHERE a.appointment_date = ?
        ORDER BY a.start_minutes
        """,
        (day,),
    ).fetchall()
    pending_payments = db.execute(
        """
        SELECT COUNT(*) AS c FROM payments
        WHERE status = 'awaiting_verification'
        """
    ).fetchone()["c"]
    return render_template(
        "owner/today.html",
        appointments=appts,
        day=day,
        pending_payments=pending_payments,
        minutes_to_label=minutes_to_label,
        nav="today",
    )


@bp.get("/calendar")
def calendar():
    db = get_db()
    day = request.args.get("date") or now_local().date().isoformat()
    try:
        selected_day = date.fromisoformat(day)
    except ValueError:
        selected_day = now_local().date()
        day = selected_day.isoformat()
    month_value = request.args.get("month") or selected_day.strftime("%Y-%m")
    try:
        month_start = date.fromisoformat(month_value + "-01")
    except ValueError:
        month_start = selected_day.replace(day=1)
        month_value = month_start.strftime("%Y-%m")
    month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

    appts = db.execute(
        """
        SELECT a.*, u.full_name AS client_name
        FROM appointments a
        LEFT JOIN users u ON u.id = a.client_id
        WHERE a.appointment_date = ?
        ORDER BY a.start_minutes
        """,
        (day,),
    ).fetchall()
    blocks = db.execute(
        """
        SELECT * FROM blocked_times
        WHERE start_at LIKE ?
        ORDER BY start_at
        """,
        (f"{day}%",),
    ).fetchall()

    month_appts = db.execute(
        """
        SELECT appointment_date, status, notes
        FROM appointments
        WHERE appointment_date >= ? AND appointment_date < ?
          AND status IN ('confirmed', 'completed')
        """,
        (month_start.isoformat(), month_end.isoformat()),
    ).fetchall()
    month_blocks = db.execute(
        """
        SELECT start_at, end_at, reason
        FROM blocked_times
        WHERE start_at < ? AND end_at >= ?
        """,
        (month_end.isoformat(), month_start.isoformat()),
    ).fetchall()
    month_workshops = db.execute(
        """
        SELECT scheduled_at
        FROM workshops
        WHERE scheduled_at >= ? AND scheduled_at < ? AND is_published = 1
        """,
        (month_start.isoformat(), month_end.isoformat()),
    ).fetchall()

    day_types: dict[str, set[str]] = {}
    for row in month_appts:
        notes = (row["notes"] or "").lower()
        kind = (
            "vip"
            if "vip" in notes
            else "consultation"
            if "consult" in notes
            else "confirmed"
        )
        day_types.setdefault(row["appointment_date"], set()).add(kind)
    for row in month_blocks:
        reason = (row["reason"] or "").lower()
        kind = (
            "vip"
            if reason == "vip" or reason.startswith("vip:")
            else "consultation"
            if reason == "consultation" or reason.startswith("consultation:")
            else "event"
            if reason == "event" or reason.startswith("event:")
            else "blocked"
        )
        block_day = max(date.fromisoformat(row["start_at"][:10]), month_start)
        raw_end_day = date.fromisoformat(row["end_at"][:10])
        if row["end_at"][10:16] == "T00:00":
            raw_end_day -= timedelta(days=1)
        final_day = min(raw_end_day, month_end - timedelta(days=1))
        while block_day <= final_day:
            day_types.setdefault(block_day.isoformat(), set()).add(kind)
            block_day += timedelta(days=1)
    for row in month_workshops:
        if row["scheduled_at"]:
            day_types.setdefault(row["scheduled_at"][:10], set()).add("event")

    dot_order = ("confirmed", "blocked", "vip", "consultation", "event")
    month_weeks = []
    for week in calendar_lib.Calendar(firstweekday=6).monthdatescalendar(
        month_start.year, month_start.month
    ):
        month_weeks.append(
            [
                {
                    "date": d.isoformat(),
                    "day": d.day,
                    "in_month": d.month == month_start.month,
                    "selected": d == selected_day,
                    "today": d == now_local().date(),
                    "dots": [x for x in dot_order if x in day_types.get(d.isoformat(), set())],
                }
                for d in week
            ]
        )
    previous_month = month_start - timedelta(days=1)
    next_month = month_end

    return render_template(
        "owner/calendar.html",
        appointments=appts,
        blocks=blocks,
        day=day,
        month_value=month_value,
        month_label=month_start.strftime("%B %Y"),
        month_weeks=month_weeks,
        previous_month=previous_month.strftime("%Y-%m"),
        next_month=next_month.strftime("%Y-%m"),
        minutes_to_label=minutes_to_label,
        nav="calendar",
    )


@bp.post("/calendar/block")
def block_time():
    start_at = request.form.get("start_at", "").strip()
    end_at = request.form.get("end_at", "").strip()
    reason = request.form.get("reason", "personal").strip()
    custom_reason = request.form.get("custom_reason", "").strip()
    if reason == "other":
        if not custom_reason:
            flash("Please describe Other (Specify).", "error")
            return redirect(url_for("owner.calendar", date=start_at[:10]))
        reason = f"other:{custom_reason}"
    if not start_at or not end_at:
        flash("Start and end are required.", "error")
        return redirect(url_for("owner.calendar"))
    if end_at <= start_at:
        flash("End time must be after start time.", "error")
        return redirect(url_for("owner.calendar", date=start_at[:10]))
    db = get_db()
    db.execute(
        """
        INSERT INTO blocked_times (staff_id, start_at, end_at, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (current_user.id, start_at, end_at, reason, current_user.id, utcnow()),
    )
    db.commit()
    flash("Time blocked.", "success")
    return redirect(url_for("owner.calendar", date=start_at[:10]))


@bp.get("/clients")
def clients():
    q = request.args.get("q", "").strip()
    db = get_db()
    if q:
        rows = db.execute(
            """
            SELECT * FROM users WHERE role = 'client' AND (
                full_name LIKE ? OR email LIKE ? OR phone LIKE ?
            ) ORDER BY full_name
            """,
            (f"%{q}%", f"%{q}%", f"%{q}%"),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM users WHERE role = 'client' ORDER BY full_name"
        ).fetchall()
    return render_template("owner/clients.html", clients=rows, q=q, nav="clients")


@bp.get("/clients/<int:client_id>")
def client_detail(client_id: int):
    db = get_db()
    client = db.execute(
        "SELECT * FROM users WHERE id = ? AND role = 'client'", (client_id,)
    ).fetchone()
    if not client:
        abort(404)
    appts = db.execute(
        """
        SELECT * FROM appointments WHERE client_id = ?
        ORDER BY appointment_date DESC LIMIT 20
        """,
        (client_id,),
    ).fetchall()
    return render_template(
        "owner/client_detail.html",
        client=client,
        appointments=appts,
        minutes_to_label=minutes_to_label,
        nav="clients",
    )


@bp.post("/clients/<int:client_id>/notes")
def client_notes(client_id: int):
    notes = request.form.get("notes_private", "")
    allergies = request.form.get("allergies", "")
    db = get_db()
    db.execute(
        """
        UPDATE users SET notes_private = ?, allergies = ?, updated_at = ?
        WHERE id = ?
        """,
        (notes, allergies, utcnow(), client_id),
    )
    db.commit()
    audit("client.notes_updated", actor_id=current_user.id, entity_type="user", entity_id=client_id)
    flash("Client notes saved.", "success")
    return redirect(url_for("owner.client_detail", client_id=client_id))


@bp.get("/business")
def business():
    db = get_db()
    services = db.execute(
        "SELECT * FROM services ORDER BY category, sort_order, name"
    ).fetchall()
    products = db.execute("SELECT * FROM products ORDER BY name").fetchall()
    workshops = db.execute("SELECT * FROM workshops ORDER BY title").fetchall()
    payments = db.execute(
        """
        SELECT * FROM payments
        WHERE status = 'awaiting_verification'
        ORDER BY created_at
        """
    ).fetchall()
    from app.services.hours import WEEKDAY_LABELS, minutes_to_hhmm

    settings = {
        r["key"]: r["value"]
        for r in db.execute("SELECT key, value FROM business_settings").fetchall()
    }
    open_days = {
        x.strip()
        for x in (settings.get("open_weekdays") or "2,3,4,5,6").split(",")
        if x.strip()
    }
    open_hhmm = minutes_to_hhmm(int(settings.get("open_minutes", "600")))
    close_hhmm = minutes_to_hhmm(int(settings.get("close_minutes", "1080")))
    today = now_local().date().isoformat()
    revenue = db.execute(
        "SELECT COALESCE(SUM(amount_ttd),0) AS t FROM payments WHERE status='completed'"
    ).fetchone()["t"]
    return render_template(
        "owner/business.html",
        services=services,
        products=products,
        workshops=workshops,
        payments=payments,
        settings=settings,
        open_days=open_days,
        open_hhmm=open_hhmm,
        close_hhmm=close_hhmm,
        weekday_labels=WEEKDAY_LABELS,
        today=today,
        revenue=revenue,
        nav="business",
    )


@bp.post("/payments/<int:payment_id>/verify")
def verify_payment(payment_id: int):
    if not current_user.is_owner:
        abort(403)
    approve = request.form.get("approve") == "1"
    try:
        verify_bank_payment(payment_id, current_user.id, approve=approve)
        flash("Payment updated." if approve else "Payment rejected.", "success")
    except PaymentError as exc:
        flash(exc.message, "error")
    return redirect(url_for("owner.business"))


@bp.post("/appointments/<int:appt_id>/no-show")
def no_show(appt_id: int):
    mark_no_show(appt_id, actor_id=current_user.id)
    flash("Marked as no-show; deposit forfeited.", "success")
    return redirect(request.referrer or url_for("owner.today"))


@bp.post("/services/save")
def save_service():
    db = get_db()
    service_id = request.form.get("id")
    name = request.form.get("name", "").strip()
    category = request.form.get("category", "").strip()
    price = float(request.form.get("price_ttd") or 0)
    duration = int(request.form.get("duration_minutes") or 0)
    description = request.form.get("description", "").strip()
    now = utcnow()
    if service_id:
        db.execute(
            """
            UPDATE services SET name=?, category=?, price_ttd=?, duration_minutes=?,
                description=?, updated_at=?
            WHERE id=?
            """,
            (name, category, price, duration, description, now, int(service_id)),
        )
    else:
        slug = "".join(c if c.isalnum() else "_" for c in f"{category}_{name}".lower())
        db.execute(
            """
            INSERT INTO services (
                slug, name, category, description, price_ttd, duration_minutes,
                is_demo, is_active, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 999, ?, ?)
            """,
            (slug, name, category, description, price, duration, now, now),
        )
    db.commit()
    flash("Service saved.", "success")
    return redirect(url_for("owner.business"))


@bp.post("/services/import-csv")
def import_services_csv():
    """Validated CSV import — never deletes existing rows; skips duplicate slugs."""
    f = request.files.get("csv_file")
    if not f or not f.filename:
        flash("Choose a CSV file.", "error")
        return redirect(url_for("owner.business"))
    text = f.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    required = {"name", "category", "price_ttd", "duration_minutes"}
    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
        flash(
            "CSV must include columns: name, category, price_ttd, duration_minutes",
            "error",
        )
        return redirect(url_for("owner.business"))
    db = get_db()
    now = utcnow()
    added = 0
    skipped = 0
    for row in reader:
        name = (row.get("name") or "").strip()
        category = (row.get("category") or "").strip()
        try:
            price = float(row.get("price_ttd") or 0)
            duration = int(float(row.get("duration_minutes") or 0))
        except ValueError:
            skipped += 1
            continue
        if not name or not category or price < 0 or duration <= 0:
            skipped += 1
            continue
        slug = "".join(c if c.isalnum() else "_" for c in f"{category}__{name}".lower())
        if db.execute("SELECT id FROM services WHERE slug=?", (slug,)).fetchone():
            skipped += 1
            continue
        db.execute(
            """
            INSERT INTO services (
                slug, name, category, description, price_ttd, duration_minutes,
                is_demo, is_active, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 500, ?, ?)
            """,
            (
                slug,
                name,
                category,
                (row.get("description") or "").strip(),
                price,
                duration,
                now,
                now,
            ),
        )
        added += 1
    db.commit()
    flash(f"Imported {added} services ({skipped} skipped).", "success")
    return redirect(url_for("owner.business"))


@bp.post("/settings")
def save_settings():
    if not current_user.is_owner:
        abort(403)
    from app.services.hours import hhmm_to_minutes

    db = get_db()
    now = utcnow()
    values: dict[str, str] = {}

    open_hhmm = request.form.get("open_time")
    close_hhmm = request.form.get("close_time")
    if open_hhmm:
        om = hhmm_to_minutes(open_hhmm)
        if om is not None:
            values["open_minutes"] = str(om)
    if close_hhmm:
        cm = hhmm_to_minutes(close_hhmm)
        if cm is not None:
            values["close_minutes"] = str(cm)

    for key in (
        "deposit_percent",
        "cancellation_policy",
        "slot_step_minutes",
        "same_day_notice_minutes",
        "max_advance_days",
    ):
        if key in request.form and request.form.get(key) is not None:
            values[key] = request.form.get(key, "").strip()

    # Any combination of weekdays (Sun=0 … Sat=6)
    days = request.form.getlist("open_weekdays")
    if days:
        values["open_weekdays"] = ",".join(sorted(days, key=lambda x: int(x)))
    elif "open_weekdays_submitted" in request.form:
        values["open_weekdays"] = ""

    for key, value in values.items():
        db.execute(
            """
            INSERT INTO business_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """,
            (key, value, now),
        )
    db.commit()
    flash("Schedule and business settings saved.", "success")
    return redirect(url_for("owner.business"))


@bp.get("/export/appointments.csv")
def export_appointments():
    """Download appointment records for any date range (defaults to all time)."""
    start = (request.args.get("from") or "").strip() or "1970-01-01"
    end = (request.args.get("to") or "").strip() or "2999-12-31"
    db = get_db()
    rows = db.execute(
        """
        SELECT a.id, a.appointment_date, a.start_minutes, a.end_minutes,
               a.status, a.payment_status, a.payment_method,
               a.total_ttd, a.deposit_ttd, a.amount_paid_ttd,
               a.guest_name, a.guest_email, a.guest_phone, a.notes,
               u.full_name AS client_name, u.email AS client_email, u.phone AS client_phone
        FROM appointments a
        LEFT JOIN users u ON u.id = a.client_id
        WHERE a.appointment_date >= ? AND a.appointment_date <= ?
        ORDER BY a.appointment_date, a.start_minutes
        """,
        (start, end),
    ).fetchall()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "date",
            "start",
            "end",
            "status",
            "payment_status",
            "payment_method",
            "total_ttd",
            "deposit_ttd",
            "amount_paid_ttd",
            "client_name",
            "email",
            "phone",
            "notes",
            "services",
        ]
    )
    for r in rows:
        services = db.execute(
            """
            SELECT s.name, asv.qty
            FROM appointment_services asv
            JOIN services s ON s.id = asv.service_id
            WHERE asv.appointment_id = ?
            """,
            (r["id"],),
        ).fetchall()
        svc_txt = "; ".join(
            f"{s['name']}" + (f" x{s['qty']}" if s["qty"] > 1 else "") for s in services
        )
        name = r["client_name"] or r["guest_name"] or ""
        email = r["client_email"] or r["guest_email"] or ""
        phone = r["client_phone"] or r["guest_phone"] or ""
        writer.writerow(
            [
                r["id"],
                r["appointment_date"],
                minutes_to_label(r["start_minutes"]),
                minutes_to_label(r["end_minutes"]),
                r["status"],
                r["payment_status"],
                r["payment_method"] or "",
                r["total_ttd"],
                r["deposit_ttd"],
                r["amount_paid_ttd"],
                name,
                email,
                phone,
                r["notes"] or "",
                svc_txt,
            ]
        )

    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=appointments_{start}_to_{end}.csv"
        },
    )


@bp.post("/prefs")
def prefs():
    from app.models_user import update_user_prefs

    update_user_prefs(
        current_user.id,
        text_size=request.form.get("text_size"),
        theme=request.form.get("theme"),
    )
    flash("Display preferences saved.", "success")
    return redirect(request.referrer or url_for("owner.today"))


@bp.route("/maria", methods=["GET", "POST"])
def maria():
    result = None
    if request.method == "POST":
        text = request.form.get("command", "")
        confirm = request.form.get("confirm_token")
        payload_raw = request.form.get("confirm_payload")
        payload = None
        if payload_raw:
            import json

            try:
                payload = json.loads(payload_raw)
            except json.JSONDecodeError:
                payload = None
        result = handle_command(
            text,
            actor_id=current_user.id,
            actor_role=current_user.role,
            confirm_token=confirm,
            confirm_payload=payload,
        )
    return render_template("owner/maria.html", result=result, nav="maria")


@bp.get("/analytics")
def analytics():
    db = get_db()
    completed = db.execute(
        "SELECT COALESCE(SUM(amount_ttd),0) AS t FROM payments WHERE status='completed'"
    ).fetchone()["t"]
    appt_count = db.execute(
        "SELECT COUNT(*) AS c FROM appointments WHERE status != 'cancelled'"
    ).fetchone()["c"]
    product_sales = db.execute(
        "SELECT COUNT(*) AS c FROM orders WHERE payment_status IN ('paid')"
    ).fetchone()["c"]
    workshop_regs = db.execute(
        "SELECT COUNT(*) AS c FROM workshop_registrations WHERE status != 'cancelled'"
    ).fetchone()["c"]
    outstanding = db.execute(
        """
        SELECT COALESCE(SUM(deposit_ttd - amount_paid_ttd),0) AS t
        FROM appointments
        WHERE payment_status IN ('unpaid','deposit_pending')
        """
    ).fetchone()["t"]
    return render_template(
        "owner/analytics.html",
        completed=completed,
        appt_count=appt_count,
        product_sales=product_sales,
        workshop_regs=workshop_regs,
        outstanding=outstanding,
        nav="analytics",
    )


@bp.get("/sample-services.csv")
def sample_csv():
    sample = (
        "name,category,price_ttd,duration_minutes,description\n"
        "Demo Blowout,HAIR,250,45,Editable demo row\n"
    )
    return Response(
        sample,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_services.csv"},
    )
