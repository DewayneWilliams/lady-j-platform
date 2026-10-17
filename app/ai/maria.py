"""Maria — bilingual English/Spanish AI assistant.

Prepares AWS Transcribe, Bedrock, and Polly integrations.
Provides functional local command handling when AWS credentials are unavailable.
Requires confirmation before destructive or financially significant actions.
"""

from __future__ import annotations

import os
import re
from datetime import date
from typing import Any

from app.db import get_db
from app.services.booking import available_slots, get_appointment
from app.services.hours import minutes_to_label, now_local, valid_dates
from app.services.payments import verify_bank_payment


PENDING_CONFIRM = "pending_confirmation"


def aws_ready() -> bool:
    return bool(
        os.environ.get("AWS_ACCESS_KEY_ID")
        and os.environ.get("AWS_SECRET_ACCESS_KEY")
        and os.environ.get("BEDROCK_MODEL_ID")
    )


def detect_language(text: str) -> str:
    spanish_cues = (
        "hola", "cita", "disponibilidad", "cliente", "informe", "cancelar",
        "taller", "producto", "pago", "gracias", "ayúdame", "reservar",
    )
    lower = text.lower()
    hits = sum(1 for c in spanish_cues if c in lower)
    return "es" if hits >= 2 else "en"


def _ok(message: str, *, lang: str, data: Any = None, needs_confirm: dict | None = None):
    return {
        "assistant": "Maria",
        "language": lang,
        "message": message,
        "data": data,
        "needs_confirmation": needs_confirm,
        "voice_ready": aws_ready(),
        "mode": "aws" if aws_ready() else "local",
    }


def handle_command(
    text: str,
    *,
    actor_id: int,
    actor_role: str,
    confirm_token: str | None = None,
    confirm_payload: dict | None = None,
) -> dict:
    """Execute authorized backend actions for staff/owner (and limited client queries)."""
    lang = detect_language(text)
    raw = text.strip()
    lower = raw.lower()

    # Confirmation path for destructive / financial actions
    if confirm_token and confirm_payload:
        return _execute_confirmed(
            confirm_payload, actor_id=actor_id, actor_role=actor_role, lang=lang
        )

    if actor_role not in ("owner", "staff", "client"):
        return _ok(
            "No autorizado." if lang == "es" else "Not authorized.",
            lang=lang,
        )

    # Availability
    if any(k in lower for k in ("availability", "disponibilidad", "slots", "horarios")):
        days = valid_dates(0, 3)
        if not days:
            msg = (
                "No hay fechas disponibles."
                if lang == "es"
                else "No available dates found."
            )
            return _ok(msg, lang=lang)
        day = days[0]
        slots = available_slots(day, 60)
        labels = [s["label"] for s in slots[:8]]
        msg = (
            f"Próxima fecha {day.isoformat()}: {', '.join(labels) or 'sin cupos'}."
            if lang == "es"
            else f"Next date {day.isoformat()}: {', '.join(labels) or 'no slots'}."
        )
        return _ok(msg, lang=lang, data={"date": day.isoformat(), "slots": slots[:8]})

    # Today's appointments (staff/owner)
    if any(k in lower for k in ("today", "hoy", "appointments today", "citas de hoy")):
        if actor_role == "client":
            return _client_own_appointments(actor_id, lang)
        db = get_db()
        today = now_local().date().isoformat()
        rows = db.execute(
            """
            SELECT id, guest_name, start_minutes, end_minutes, status, total_ttd
            FROM appointments
            WHERE appointment_date = ? AND status NOT IN ('cancelled')
            ORDER BY start_minutes
            """,
            (today,),
        ).fetchall()
        items = [
            {
                "id": r["id"],
                "name": r["guest_name"],
                "time": minutes_to_label(r["start_minutes"]),
                "status": r["status"],
            }
            for r in rows
        ]
        msg = (
            f"Hoy hay {len(items)} citas."
            if lang == "es"
            else f"There are {len(items)} appointments today."
        )
        return _ok(msg, lang=lang, data=items)

    # Revenue summary (owner)
    if any(k in lower for k in ("revenue", "ingresos", "sales", "ventas", "report")):
        if actor_role != "owner":
            return _ok(
                "Solo la propietaria puede ver ingresos."
                if lang == "es"
                else "Only the owner can view revenue.",
                lang=lang,
            )
        db = get_db()
        paid = db.execute(
            """
            SELECT COALESCE(SUM(amount_ttd),0) AS t
            FROM payments WHERE status = 'completed'
            """
        ).fetchone()["t"]
        pending = db.execute(
            """
            SELECT COALESCE(SUM(amount_ttd),0) AS t
            FROM payments WHERE status = 'awaiting_verification'
            """
        ).fetchone()["t"]
        msg = (
            f"Pagos completados: ${paid:.2f} TTD. Pendientes de verificar: ${pending:.2f} TTD."
            if lang == "es"
            else f"Completed payments: ${paid:.2f} TTD. Awaiting verification: ${pending:.2f} TTD."
        )
        return _ok(msg, lang=lang, data={"completed": paid, "pending": pending})

    # Cancel appointment — requires confirmation
    m = re.search(r"(?:cancel|cancelar)\s+(?:appointment|cita)?\s*#?(\d+)", lower)
    if m:
        if actor_role == "client":
            return _ok(
                "Pide cancelación desde tu cuenta o contacta al salón."
                if lang == "es"
                else "Please cancel from your account or contact the salon.",
                lang=lang,
            )
        appt_id = int(m.group(1))
        payload = {"action": "cancel_appointment", "appointment_id": appt_id}
        msg = (
            f"Confirma para cancelar la cita #{appt_id}."
            if lang == "es"
            else f"Confirm to cancel appointment #{appt_id}."
        )
        return _ok(
            msg,
            lang=lang,
            needs_confirm={"token": PENDING_CONFIRM, "payload": payload},
        )

    # Verify bank payment — requires confirmation
    m = re.search(r"(?:verify|verificar)\s+(?:payment|pago)\s*#?(\d+)", lower)
    if m:
        if actor_role != "owner":
            return _ok(
                "Solo la propietaria puede verificar pagos."
                if lang == "es"
                else "Only the owner can verify payments.",
                lang=lang,
            )
        pid = int(m.group(1))
        payload = {"action": "verify_payment", "payment_id": pid}
        msg = (
            f"Confirma para verificar el pago bancario #{pid}."
            if lang == "es"
            else f"Confirm to verify bank payment #{pid}."
        )
        return _ok(
            msg,
            lang=lang,
            needs_confirm={"token": PENDING_CONFIRM, "payload": payload},
        )

    # Clients search
    if any(k in lower for k in ("client", "cliente", "find ", "buscar")):
        if actor_role == "client":
            return _ok(
                "Puedo ayudarte con tus citas desde tu cuenta."
                if lang == "es"
                else "I can help with your appointments from your account.",
                lang=lang,
            )
        q = raw.split(" ", 1)[-1] if " " in raw else ""
        db = get_db()
        rows = db.execute(
            """
            SELECT id, full_name, email, phone, credits_balance
            FROM users WHERE role = 'client' AND (
                full_name LIKE ? OR email LIKE ? OR phone LIKE ?
            ) LIMIT 10
            """,
            (f"%{q}%", f"%{q}%", f"%{q}%"),
        ).fetchall()
        data = [dict(r) for r in rows]
        msg = (
            f"Encontré {len(data)} cliente(s)."
            if lang == "es"
            else f"Found {len(data)} client(s)."
        )
        return _ok(msg, lang=lang, data=data)

    # Help
    if any(k in lower for k in ("help", "ayuda", "commands", "comandos")):
        if lang == "es":
            msg = (
                "Puedo ayudar con: disponibilidad, citas de hoy, ingresos, "
                "buscar cliente, cancelar cita #ID (confirma), verificar pago #ID (confirma). "
                "Modo local activo si AWS no está configurado."
            )
        else:
            msg = (
                "I can help with: availability, today's appointments, revenue, "
                "find client, cancel appointment #ID (confirm), verify payment #ID (confirm). "
                "Local mode is active when AWS is not configured."
            )
        return _ok(msg, lang=lang)

    # Default
    if lang == "es":
        msg = (
            "Soy María. Escribe 'ayuda' para ver comandos. "
            + ("AWS listo." if aws_ready() else "Usso comandos locales (AWS no configurado).")
        )
    else:
        msg = (
            "I'm Maria. Type 'help' for commands. "
            + ("AWS ready." if aws_ready() else "Using local commands (AWS not configured).")
        )
    return _ok(msg, lang=lang)


def _client_own_appointments(user_id: int, lang: str) -> dict:
    db = get_db()
    rows = db.execute(
        """
        SELECT id, appointment_date, start_minutes, status
        FROM appointments
        WHERE client_id = ? AND status NOT IN ('cancelled')
        ORDER BY appointment_date DESC LIMIT 5
        """,
        (user_id,),
    ).fetchall()
    data = [
        {
            "id": r["id"],
            "date": r["appointment_date"],
            "time": minutes_to_label(r["start_minutes"]),
            "status": r["status"],
        }
        for r in rows
    ]
    msg = (
        f"Tienes {len(data)} citas recientes."
        if lang == "es"
        else f"You have {len(data)} recent appointments."
    )
    return _ok(msg, lang=lang, data=data)


def _execute_confirmed(
    payload: dict, *, actor_id: int, actor_role: str, lang: str
) -> dict:
    action = payload.get("action")
    if action == "cancel_appointment":
        from app.services.booking import apply_cancellation

        if actor_role not in ("owner", "staff"):
            return _ok("Not authorized.", lang=lang)
        result = apply_cancellation(int(payload["appointment_id"]), actor_id=actor_id)
        msg = (
            f"Cita #{payload['appointment_id']} cancelada."
            if lang == "es"
            else f"Appointment #{payload['appointment_id']} cancelled."
        )
        return _ok(msg, lang=lang, data=result)
    if action == "verify_payment":
        if actor_role != "owner":
            return _ok("Not authorized.", lang=lang)
        result = verify_bank_payment(int(payload["payment_id"]), actor_id, approve=True)
        msg = (
            f"Pago #{payload['payment_id']} verificado."
            if lang == "es"
            else f"Payment #{payload['payment_id']} verified."
        )
        return _ok(msg, lang=lang, data=result)
    return _ok(
        "Acción desconocida." if lang == "es" else "Unknown action.",
        lang=lang,
    )


def transcribe_stub(audio_bytes: bytes) -> dict:
    """AWS Transcribe hook — returns stub when credentials missing."""
    if not aws_ready():
        return {
            "ok": False,
            "text": "",
            "message": "AWS Transcribe unavailable. Type your command instead.",
        }
    return {
        "ok": False,
        "text": "",
        "message": "Transcribe integration prepared; configure job polling to enable.",
    }


def synthesize_stub(text: str, language: str = "en") -> dict:
    """AWS Polly hook."""
    if not aws_ready():
        return {"ok": False, "message": "Polly unavailable in local mode."}
    voice = os.environ.get(
        "POLLY_VOICE_ES" if language == "es" else "POLLY_VOICE_EN",
        "Lupe" if language == "es" else "Joanna",
    )
    return {
        "ok": False,
        "voice": voice,
        "message": "Polly integration prepared; enable when credentials validated.",
    }
