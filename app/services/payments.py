"""Payment adapters — card (simulated until T&T processor verified) + bank transfer."""

from __future__ import annotations

import secrets
from abc import ABC, abstractmethod
from typing import Any

from flask import current_app

from app.db import audit, get_db, utcnow


class PaymentError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class CardAdapter(ABC):
    @abstractmethod
    def charge(
        self, *, amount_ttd: float, reference: str, meta: dict
    ) -> dict[str, Any]:
        ...


class SimulatedCardAdapter(CardAdapter):
    """Local/demo card flow. Does not claim real processor support for T&T."""

    def charge(
        self, *, amount_ttd: float, reference: str, meta: dict
    ) -> dict[str, Any]:
        return {
            "ok": True,
            "provider": "simulated",
            "provider_ref": f"sim_{secrets.token_hex(8)}",
            "status": "completed",
            "amount_ttd": amount_ttd,
            "reference": reference,
            "note": (
                "Simulated card payment for local development. "
                "Do not assume a live processor supports Trinidad and Tobago "
                "until verified."
            ),
        }


def get_card_adapter() -> CardAdapter:
    provider = current_app.config.get("PAYMENT_CARD_PROVIDER", "simulated")
    if provider == "simulated":
        return SimulatedCardAdapter()
    # Future: Stripe / local T&T gateway adapters when credentials + region verified
    return SimulatedCardAdapter()


def new_reference(prefix: str = "LJ") -> str:
    return f"{prefix}-{secrets.token_hex(5).upper()}"


def create_payment(
    *,
    amount_ttd: float,
    method: str,
    user_id: int | None = None,
    appointment_id: int | None = None,
    workshop_registration_id: int | None = None,
    order_id: int | None = None,
    bank_reference: str | None = None,
    bank_payment_date: str | None = None,
    proof_path: str | None = None,
    provider: str | None = None,
    provider_ref: str | None = None,
    status: str = "pending",
    meta_json: str | None = None,
) -> dict:
    db = get_db()
    now = utcnow()
    ref = new_reference()
    cur = db.execute(
        """
        INSERT INTO payments (
            reference, user_id, appointment_id, workshop_registration_id, order_id,
            amount_ttd, method, status, provider, provider_ref,
            bank_reference, bank_payment_date, proof_path, meta_json,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            ref,
            user_id,
            appointment_id,
            workshop_registration_id,
            order_id,
            amount_ttd,
            method,
            status,
            provider,
            provider_ref,
            bank_reference,
            bank_payment_date,
            proof_path,
            meta_json,
            now,
            now,
        ),
    )
    db.commit()
    return dict(
        db.execute("SELECT * FROM payments WHERE id = ?", (cur.lastrowid,)).fetchone()
    )


def process_card_deposit(appointment_id: int, user_id: int | None) -> dict:
    db = get_db()
    appt = db.execute(
        "SELECT * FROM appointments WHERE id = ?", (appointment_id,)
    ).fetchone()
    if not appt:
        raise PaymentError("Appointment not found.")
    amount = float(appt["deposit_ttd"])
    adapter = get_card_adapter()
    ref = new_reference("CARD")
    result = adapter.charge(
        amount_ttd=amount,
        reference=ref,
        meta={"appointment_id": appointment_id},
    )
    payment = create_payment(
        amount_ttd=amount,
        method="card",
        user_id=user_id,
        appointment_id=appointment_id,
        provider=result["provider"],
        provider_ref=result["provider_ref"],
        status="completed" if result["ok"] else "failed",
        meta_json=str(result.get("note", "")),
    )
    if result["ok"]:
        db.execute(
            """
            UPDATE appointments
            SET payment_status = 'deposit_paid',
                amount_paid_ttd = amount_paid_ttd + ?,
                status = 'confirmed',
                updated_at = ?
            WHERE id = ?
            """,
            (amount, utcnow(), appointment_id),
        )
        db.commit()
        audit(
            "payment.card.completed",
            actor_id=user_id,
            entity_type="payment",
            entity_id=payment["id"],
            detail=f"Simulated/deposit {amount} TTD",
        )
    return {"payment": payment, "provider_result": result}


def submit_bank_transfer(
    *,
    appointment_id: int | None = None,
    order_id: int | None = None,
    workshop_registration_id: int | None = None,
    user_id: int | None = None,
    amount_ttd: float,
    bank_reference: str,
    bank_payment_date: str,
    proof_path: str | None = None,
) -> dict:
    if not bank_reference.strip():
        raise PaymentError("Bank reference number is required.")
    payment = create_payment(
        amount_ttd=amount_ttd,
        method="bank_transfer",
        user_id=user_id,
        appointment_id=appointment_id,
        order_id=order_id,
        workshop_registration_id=workshop_registration_id,
        bank_reference=bank_reference.strip(),
        bank_payment_date=bank_payment_date,
        proof_path=proof_path,
        status="awaiting_verification",
        provider="manual_bank",
    )
    db = get_db()
    if appointment_id:
        db.execute(
            """
            UPDATE appointments
            SET payment_status = 'deposit_pending', updated_at = ?
            WHERE id = ?
            """,
            (utcnow(), appointment_id),
        )
        db.commit()
    audit(
        "payment.bank.submitted",
        actor_id=user_id,
        entity_type="payment",
        entity_id=payment["id"],
        detail="Awaiting owner verification",
    )
    return payment


def verify_bank_payment(payment_id: int, verifier_id: int, approve: bool = True) -> dict:
    db = get_db()
    row = db.execute(
        "SELECT * FROM payments WHERE id = ?", (payment_id,)
    ).fetchone()
    if not row:
        raise PaymentError("Payment not found.")
    if row["method"] != "bank_transfer":
        raise PaymentError("Not a bank transfer payment.")
    if row["status"] != "awaiting_verification":
        raise PaymentError("Payment is not awaiting verification.")

    now = utcnow()
    if approve:
        db.execute(
            """
            UPDATE payments
            SET status = 'completed', verified_by = ?, verified_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (verifier_id, now, now, payment_id),
        )
        if row["appointment_id"]:
            db.execute(
                """
                UPDATE appointments
                SET payment_status = 'deposit_paid',
                    amount_paid_ttd = amount_paid_ttd + ?,
                    status = 'confirmed',
                    updated_at = ?
                WHERE id = ?
                """,
                (row["amount_ttd"], now, row["appointment_id"]),
            )
        if row["order_id"]:
            db.execute(
                """
                UPDATE orders
                SET payment_status = 'paid', status = 'paid', updated_at = ?
                WHERE id = ?
                """,
                (now, row["order_id"]),
            )
        if row["workshop_registration_id"]:
            db.execute(
                """
                UPDATE workshop_registrations
                SET payment_status = 'paid', status = 'confirmed'
                WHERE id = ?
                """,
                (row["workshop_registration_id"],),
            )
        action = "payment.bank.verified"
    else:
        db.execute(
            """
            UPDATE payments
            SET status = 'failed', verified_by = ?, verified_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (verifier_id, now, now, payment_id),
        )
        action = "payment.bank.rejected"
    db.commit()
    audit(
        action,
        actor_id=verifier_id,
        entity_type="payment",
        entity_id=payment_id,
    )
    return dict(
        db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
    )
