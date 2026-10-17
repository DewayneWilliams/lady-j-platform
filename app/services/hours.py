"""Business hours helpers — America/Port_of_Spain, Tue–Sat 10 AM–6 PM."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from flask import current_app

from app.db import get_db

TZ_NAME = "America/Port_of_Spain"
OPEN_MINUTES = 600   # 10:00
CLOSE_MINUTES = 1080  # 18:00
OPEN_WEEKDAYS = {2, 3, 4, 5, 6}  # Tue–Sat
SLOT_STEP = 30
SAME_DAY_NOTICE = 120  # minutes
MAX_ADVANCE_DAYS = 60


def get_tz() -> ZoneInfo:
    try:
        name = current_app.config.get("TIMEZONE", TZ_NAME)
    except RuntimeError:
        name = TZ_NAME
    return ZoneInfo(name)


def now_local() -> datetime:
    return datetime.now(get_tz())


def setting(key: str, default: str) -> str:
    db = get_db()
    row = db.execute(
        "SELECT value FROM business_settings WHERE key = ?", (key,)
    ).fetchone()
    return row["value"] if row else default


def open_weekdays() -> set[int]:
    raw = setting("open_weekdays", "2,3,4,5,6")
    return {int(x) for x in raw.split(",") if x.strip().isdigit()}


def open_close() -> tuple[int, int]:
    return (
        int(setting("open_minutes", str(OPEN_MINUTES))),
        int(setting("close_minutes", str(CLOSE_MINUTES))),
    )


def _js_weekday(d: date) -> int:
    """Match JS Date.getDay(): Sun=0 … Sat=6. Seed open_weekdays uses this."""
    return (d.weekday() + 1) % 7


def is_business_day(d: date) -> bool:
    return _js_weekday(d) in open_weekdays()


def minutes_to_label(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    period = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {period}"


def label_to_minutes(label: str) -> int | None:
    """Parse '10:00 AM' style labels."""
    try:
        parts = label.strip().upper().replace(".", "").split()
        time_part = parts[0]
        period = parts[1] if len(parts) > 1 else "AM"
        hh, mm = time_part.split(":")
        h = int(hh)
        m = int(mm)
        if period == "PM" and h != 12:
            h += 12
        if period == "AM" and h == 12:
            h = 0
        return h * 60 + m
    except (ValueError, IndexError):
        return None


def valid_dates(from_page: int = 0, page_size: int = 7) -> list[date]:
    """Return bookable dates (business days only) within advance window."""
    today = now_local().date()
    end = today + timedelta(days=MAX_ADVANCE_DAYS)
    all_days: list[date] = []
    d = today
    while d <= end:
        if is_business_day(d):
            all_days.append(d)
        d += timedelta(days=1)
    start = from_page * page_size
    return all_days[start : start + page_size]


def generate_slots(day: date, duration_minutes: int) -> list[int]:
    """Return start_minutes that fit duration before close, respecting notice."""
    open_m, close_m = open_close()
    if not is_business_day(day) or duration_minutes <= 0:
        return []

    now = now_local()
    slots: list[int] = []
    t = open_m
    while t + duration_minutes <= close_m:
        if day == now.date():
            earliest = now.hour * 60 + now.minute + SAME_DAY_NOTICE
            if t < earliest:
                t += SLOT_STEP
                continue
        slots.append(t)
        t += SLOT_STEP
    return slots
