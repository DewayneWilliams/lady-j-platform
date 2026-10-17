"""Appointment booking with server-side overlap validation."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from flask import current_app

from app.db import audit, get_db, utcnow
from app.services.hours import (
    generate_slots,
    get_tz,
    is_business_day,
    minutes_to_label,
    now_local,
)


class BookingError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def get_setting_deposit() -> int:
    db = get_db()
    row = db.execute(
        "SELECT value FROM business_settings WHERE key = 'deposit_percent'"
    ).fetchone()
    if row:
        return int(row["value"])
    return int(current_app.config.get("DEPOSIT_PERCENT", 50))


def load_services(service_ids: list[int]) -> list[Any]:
    if not service_ids:
        return []
    db = get_db()
    placeholders = ",".join("?" * len(service_ids))
    rows = db.execute(
        f"SELECT * FROM services WHERE id IN ({placeholders}) AND is_active = 1",
        service_ids,
    ).fetchall()
    by_id = {r["id"]: r for r in rows}
    return [by_id[i] for i in service_ids if i in by_id]


def total_duration(items: list[tuple[Any, int]]) -> int:
    return sum(svc["duration_minutes"] * qty for svc, qty in items)


def total_price(items: list[tuple[Any, int]]) -> float:
    return sum(svc["price_ttd"] * qty for svc, qty in items)


def overlaps(
    day: str,
    start: int,
    end: int,
    *,
    staff_id: int | None = None,
    exclude_id: int | None = None,
) -> bool:
    db = get_db()
    params: list[Any] = [day, start, end]
    sql = """
        SELECT id FROM appointments
        WHERE appointment_date = ?
          AND status NOT IN ('cancelled')
          AND start_minutes < ?
          AND end_minutes > ?
    """
    # overlap: existing.start < new.end AND existing.end > new.start
    # params: day, new_end, new_start
    params = [day, end, start]
    if staff_id:
        sql += " AND (staff_id = ? OR staff_id IS NULL)"
        params.append(staff_id)
    if exclude_id:
        sql += " AND id != ?"
        params.append(exclude_id)
    row = db.execute(sql, params).fetchone()
    if row:
        return True

    # Blocked times
    day_start = f"{day}T00:00:00"
    day_end = f"{day}T23:59:59"
    blocks = db.execute(
        """
        SELECT start_at, end_at FROM blocked_times
        WHERE start_at < ? AND end_at > ?
        """,
        (f"{day}T{end // 60:02d}:{end % 60:02d}:00", f"{day}T{start // 60:02d}:{start % 60:02d}:00"),
    ).fetchall()
    return len(blocks) > 0


def available_slots(day: date, duration: int, staff_id: int | None = None) -> list[dict]:
    if not is_business_day(day):
        return []
    day_s = day.isoformat()
    result = []
    for start in generate_slots(day, duration):
        end = start + duration
        if overlaps(day_s, start, end, staff_id=staff_id):
            continue
        result.append(
            {
                "start_minutes": start,
                "end_minutes": end,
                "label": minutes_to_label(start),
                "end_label": minutes_to_label(end),
            }
        )
    return result


def create_appointment(
    *,
    client_id: int | None,
    guest_name: str | None,
    guest_email: str | None,
    guest_phone: str | None,
    appointment_date: str,
    start_minutes: int,
    service_qty: list[tuple[int, int]],
    notes: str | None,
    payment_method: str,
    policy_accepted: bool,
    actor_id: int | None = None,
) -> dict:
    if not policy_accepted:
        raise BookingError("You must accept the cancellation policy.")
    if payment_method not in ("card", "bank_transfer", "salon"):
        raise BookingError("Invalid payment method.")

    try:
        day = date.fromisoformat(appointment_date)
    except ValueError as exc:
        raise BookingError("Invalid appointment date.") from exc

    if not is_business_day(day):
        raise BookingError("Selected date is outside business days (Tue–Sat).")

    services = []
    for sid, qty in service_qty:
        rows = load_services([sid])
        if not rows:
            raise BookingError(f"Service {sid} not found.")
        qty = max(1, min(qty, rows[0]["max_qty"] or 1))
        services.append((rows[0], qty))

    if not services:
        raise BookingError("Select at least one service.")

    duration = total_duration(services)
    total = total_price(services)
    end_minutes = start_minutes + duration
    deposit_pct = get_setting_deposit()
    deposit = round(total * deposit_pct / 100, 2)

    slots = available_slots(day, duration)
    if start_minutes not in {s["start_minutes"] for s in slots}:
        raise BookingError("Selected time is no longer available.")

    if overlaps(appointment_date, start_minutes, end_minutes):
        raise BookingError("This time overlaps an existing appointment.")

    db = get_db()
    now = utcnow()
    payment_status = (
        "deposit_pending"
        if payment_method in ("card", "bank_transfer")
        else "unpaid"
    )
    status = "pending"

    cur = db.execute(
        """
        INSERT INTO appointments (
            client_id, guest_name, guest_email, guest_phone,
            appointment_date, start_minutes, end_minutes, timezone,
            status, notes, cancellation_policy_accepted,
            total_ttd, deposit_percent, deposit_ttd, amount_paid_ttd,
            payment_method, payment_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?)
        """,
        (
            client_id,
            guest_name,
            guest_email,
            guest_phone,
            appointment_date,
            start_minutes,
            end_minutes,
            current_app.config.get("TIMEZONE", "America/Port_of_Spain"),
            status,
            notes,
            total,
            deposit_pct,
            deposit,
            payment_method,
            payment_status,
            now,
            now,
        ),
    )
    appt_id = cur.lastrowid
    for svc, qty in services:
        db.execute(
            """
            INSERT INTO appointment_services (
                appointment_id, service_id, qty, unit_price_ttd, duration_minutes
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (appt_id, svc["id"], qty, svc["price_ttd"], svc["duration_minutes"]),
        )
    db.commit()
    audit(
        "appointment.created",
        actor_id=actor_id or client_id,
        entity_type="appointment",
        entity_id=appt_id,
        detail=f"{appointment_date} {minutes_to_label(start_minutes)}",
    )
    return get_appointment(appt_id)


def get_appointment(appt_id: int) -> dict:
    db = get_db()
    row = db.execute(
        "SELECT * FROM appointments WHERE id = ?", (appt_id,)
    ).fetchone()
    if not row:
        raise BookingError("Appointment not found.")
    services = db.execute(
        """
        SELECT s.name, s.category, asv.qty, asv.unit_price_ttd, asv.duration_minutes
        FROM appointment_services asv
        JOIN services s ON s.id = asv.service_id
        WHERE asv.appointment_id = ?
        """,
        (appt_id,),
    ).fetchall()
    return {
        "appointment": dict(row),
        "services": [dict(s) for s in services],
        "start_label": minutes_to_label(row["start_minutes"]),
        "end_label": minutes_to_label(row["end_minutes"]),
    }


def apply_cancellation(appt_id: int, actor_id: int | None = None) -> dict:
    """Enforce cancellation policy relative to America/Port_of_Spain."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM appointments WHERE id = ?", (appt_id,)
    ).fetchone()
    if not row:
        raise BookingError("Appointment not found.")
    if row["status"] == "cancelled":
        raise BookingError("Already cancelled.")

    day = date.fromisoformat(row["appointment_date"])
    start = row["start_minutes"]
    appt_dt = datetime(
        day.year, day.month, day.day, start // 60, start % 60, tzinfo=get_tz()
    )
    hours_until = (appt_dt - now_local()).total_seconds() / 3600
    deposit_paid = float(row["amount_paid_ttd"] or 0)
    deposit = float(row["deposit_ttd"] or 0)
    paid = min(deposit_paid, deposit)

    credit = 0.0
    payment_status = row["payment_status"]
    detail = ""

    if hours_until >= 24:
        # Full deposit refund eligibility
        payment_status = "refund_pending" if paid > 0 else row["payment_status"]
        detail = "Cancelled 24h+: full deposit refund eligibility."
    elif hours_until > 0:
        credit = round(paid * 0.5, 2)
        retained = round(paid * 0.5, 2)
        payment_status = "partial_credit"
        detail = f"Cancelled <24h: credit {credit} TTD; retained {retained} TTD."
        if credit > 0 and row["client_id"]:
            db.execute(
                "UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?",
                (credit, row["client_id"]),
            )
            db.execute(
                """
                INSERT INTO credit_ledger (user_id, amount_ttd, reason, appointment_id, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row["client_id"],
                    credit,
                    "Late cancellation credit (50%)",
                    appt_id,
                    actor_id,
                    utcnow(),
                ),
            )
    else:
        payment_status = "forfeited"
        detail = "No-show / past start: deposit forfeited."

    db.execute(
        """
        UPDATE appointments
        SET status = 'cancelled', payment_status = ?, updated_at = ?
        WHERE id = ?
        """,
        (payment_status, utcnow(), appt_id),
    )
    db.commit()
    audit(
        "appointment.cancelled",
        actor_id=actor_id,
        entity_type="appointment",
        entity_id=appt_id,
        detail=detail,
    )
    return get_appointment(appt_id)


def mark_no_show(appt_id: int, actor_id: int | None = None) -> dict:
    db = get_db()
    db.execute(
        """
        UPDATE appointments
        SET status = 'no_show', payment_status = 'forfeited', updated_at = ?
        WHERE id = ?
        """,
        (utcnow(), appt_id),
    )
    db.commit()
    audit(
        "appointment.no_show",
        actor_id=actor_id,
        entity_type="appointment",
        entity_id=appt_id,
        detail="Deposit forfeited",
    )
    return get_appointment(appt_id)
