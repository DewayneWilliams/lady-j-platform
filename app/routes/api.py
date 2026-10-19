"""JSON API endpoints for booking availability and Maria."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import date
from time import monotonic

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.ai.maria import handle_command
from app.ai.photo_recommend import recommend_from_image
from app.services.booking import available_slots
from app.services.hours import month_calendar, now_local, valid_dates
from app.services.translation import (
    LANGUAGES,
    LANGUAGE_CODES,
    TranslationUnavailable,
    translate_text,
)

bp = Blueprint("api", __name__, url_prefix="/api")
_translation_requests: dict[str, deque[float]] = defaultdict(deque)


def _translation_rate_limited() -> bool:
    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",", 1)[0].strip() or request.remote_addr or "unknown"
    now = monotonic()
    history = _translation_requests[client_ip]
    while history and history[0] < now - 60:
        history.popleft()
    if len(history) >= 30:
        return True
    history.append(now)
    return False


@bp.get("/availability")
def availability():
    day_s = request.args.get("date")
    duration = int(request.args.get("duration", 60))
    if not day_s:
        return jsonify({"error": "date required"}), 400
    try:
        day = date.fromisoformat(day_s)
    except ValueError:
        return jsonify({"error": "invalid date"}), 400
    slots = available_slots(day, duration)
    return jsonify(
        {
            "date": day_s,
            "duration": duration,
            "slots": slots,
            "same_day": day == now_local().date(),
        }
    )


@bp.get("/calendar")
def calendar_api():
    """Month grid for the booking calendar (includes same-day when slots remain)."""
    today = now_local().date()
    year = int(request.args.get("year", today.year))
    month = int(request.args.get("month", today.month))
    duration = int(request.args.get("duration", 60))
    if month < 1 or month > 12:
        return jsonify({"error": "invalid month"}), 400
    return jsonify(month_calendar(year, month, duration))


@bp.get("/dates")
def dates():
    page = int(request.args.get("page", 0))
    days = [d.isoformat() for d in valid_dates(page, 7)]
    return jsonify({"page": page, "dates": days})


@bp.get("/languages")
def languages():
    return jsonify(
        {
            "languages": [
                {"code": code, "name": name} for code, name in LANGUAGES
            ],
            "featured": ["es", "fr", "zh", "hi"],
        }
    )


@bp.post("/translate")
def translate():
    if _translation_rate_limited():
        return jsonify({"error": "Too many translation requests"}), 429

    payload = request.get_json(silent=True) or {}
    target = str(payload.get("target_language", ""))
    texts = payload.get("texts")
    if target not in LANGUAGE_CODES:
        return jsonify({"error": "Unsupported target language"}), 400
    if not isinstance(texts, list) or not texts or len(texts) > 30:
        return jsonify({"error": "Provide between 1 and 30 text items"}), 400
    if any(not isinstance(text, str) for text in texts):
        return jsonify({"error": "Every text item must be a string"}), 400
    if sum(len(text) for text in texts) > 30_000:
        return jsonify({"error": "Translation request is too large"}), 413
    if any(len(text.encode("utf-8")) > 9_000 for text in texts):
        return jsonify({"error": "A text item is too large"}), 413

    try:
        translated = [translate_text(text, target) for text in texts]
    except ValueError:
        return jsonify({"error": "Unsupported target language"}), 400
    except TranslationUnavailable:
        return jsonify({"error": "Translation service is not configured"}), 503
    return jsonify({"target_language": target, "translations": translated})


@bp.post("/photo-recommend")
@login_required
def photo_recommend():
    f = request.files.get("inspiration")
    filename = f.filename if f else "inspiration.jpg"
    data = f.read() if f else None
    result = recommend_from_image(filename=filename, image_bytes=data)
    return jsonify(result)


@bp.post("/maria")
@login_required
def maria_api():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text") or request.form.get("command", "")
    result = handle_command(
        text,
        actor_id=current_user.id,
        actor_role="owner" if current_user.is_owner else "client",
        confirm_token=payload.get("confirm_token"),
        confirm_payload=payload.get("confirm_payload"),
    )
    return jsonify(result)
