"""Business hours helpers — configurable days/times; same-day booking supported."""

from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from flask import current_app

from app.db import get_db

TZ_NAME = "America/Port_of_Spain"
OPEN_MINUTES = 600   # 10:00
CLOSE_MINUTES = 1080  # 18:00
# JS weekday: Sun=0 … Sat=6 — default Tue–Sat
OPEN_WEEKDAYS = {2, 3, 4, 5, 6}
SLOT_STEP = 30
SAME_DAY_NOTICE = 30  # minutes — same-day OK if slot still free
MAX_ADVANCE_DAYS = 90

WEEKDAY_LABELS = (
    ("0", "Sunday"),
    ("1", "Monday"),
    ("2", "Tuesday"),
    ("3", "Wednesday"),
    ("4", "Thursday"),
    ("5", "Friday"),
    ("6", "Saturday"),
)


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


def slot_step() -> int:
    return max(5, int(setting("slot_step_minutes", str(SLOT_STEP))))


def same_day_notice() -> int:
    """Minutes of lead time required for same-day slots. 0 = book immediately if free."""
    return max(0, int(setting("same_day_notice_minutes", str(SAME_DAY_NOTICE))))


def max_advance_days() -> int:
    return max(1, int(setting("max_advance_days", str(MAX_ADVANCE_DAYS))))


def _js_weekday(d: date) -> int:
    """Match JS Date.getDay(): Sun=0 … Sat=6."""
    return (d.weekday() + 1) % 7


def is_business_day(d: date) -> bool:
    return _js_weekday(d) in open_weekdays()


def minutes_to_label(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    period = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {period}"


def minutes_to_hhmm(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    return f"{h:02d}:{m:02d}"


def hhmm_to_minutes(value: str) -> int | None:
    try:
        hh, mm = value.strip().split(":")
        return int(hh) * 60 + int(mm)
    except (ValueError, AttributeError):
        return None


def label_to_minutes(label: str) -> int | None:
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


def bookable_window() -> tuple[date, date]:
    today = now_local().date()
    return today, today + timedelta(days=max_advance_days())


def valid_dates(from_page: int = 0, page_size: int = 7) -> list[date]:
    today, end = bookable_window()
    all_days: list[date] = []
    d = today
    while d <= end:
        if is_business_day(d):
            all_days.append(d)
        d += timedelta(days=1)
    start = from_page * page_size
    return all_days[start : start + page_size]


def generate_slots(day: date, duration_minutes: int) -> list[int]:
    """Return start_minutes that fit duration before close, including same-day."""
    open_m, close_m = open_close()
    step = slot_step()
    if not is_business_day(day) or duration_minutes <= 0:
        return []

    today, end = bookable_window()
    if day < today or day > end:
        return []

    now = now_local()
    notice = same_day_notice()
    slots: list[int] = []
    t = open_m
    while t + duration_minutes <= close_m:
        if day == now.date():
            earliest = now.hour * 60 + now.minute + notice
            # Round up to next slot boundary for cleaner same-day offers
            if t < earliest:
                t += step
                continue
        slots.append(t)
        t += step
    return slots


def month_calendar(year: int, month: int, duration_minutes: int = 60) -> dict:
    """Build a month grid for the booking calendar UI."""
    from app.services.booking import available_slots

    today, end = bookable_window()
    weeks = calendar.Calendar(firstweekday=6).monthdatescalendar(year, month)
    days_out = []
    for week in weeks:
        row = []
        for d in week:
            in_month = d.month == month
            business = is_business_day(d)
            in_window = today <= d <= end
            selectable = in_month and business and in_window
            slot_count = 0
            if selectable:
                slot_count = len(available_slots(d, duration_minutes))
                selectable = slot_count > 0
            row.append(
                {
                    "date": d.isoformat(),
                    "day": d.day,
                    "in_month": in_month,
                    "is_past": d < today,
                    "is_today": d == today,
                    "is_business": business,
                    "selectable": selectable,
                    "slot_count": slot_count,
                    "label": d.strftime("%a %b %d"),
                }
            )
        days_out.append(row)

    open_m, close_m = open_close()
    return {
        "year": year,
        "month": month,
        "month_label": date(year, month, 1).strftime("%B %Y"),
        "weeks": days_out,
        "today": today.isoformat(),
        "open_label": minutes_to_label(open_m),
        "close_label": minutes_to_label(close_m),
        "same_day_notice": same_day_notice(),
        "max_advance_days": max_advance_days(),
        "weekday_headers": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    }
