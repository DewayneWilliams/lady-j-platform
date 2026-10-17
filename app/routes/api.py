"""JSON API endpoints for booking availability and Maria."""

from __future__ import annotations

from datetime import date

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.ai.maria import handle_command
from app.ai.photo_recommend import recommend_from_image
from app.services.booking import available_slots
from app.services.hours import valid_dates

bp = Blueprint("api", __name__, url_prefix="/api")


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
    return jsonify({"date": day_s, "duration": duration, "slots": slots})


@bp.get("/dates")
def dates():
    page = int(request.args.get("page", 0))
    days = [d.isoformat() for d in valid_dates(page, 7)]
    return jsonify({"page": page, "dates": days})


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
        actor_role=current_user.role,
        confirm_token=payload.get("confirm_token"),
        confirm_payload=payload.get("confirm_payload"),
    )
    return jsonify(result)
