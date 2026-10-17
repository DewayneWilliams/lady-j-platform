"""Workshop browse, registration, capacity, protected access."""

from __future__ import annotations

from app.db import audit, get_db, utcnow


class WorkshopError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def list_workshops(published_only: bool = True):
    db = get_db()
    if published_only:
        return db.execute(
            "SELECT * FROM workshops WHERE is_published = 1 ORDER BY scheduled_at, title"
        ).fetchall()
    return db.execute("SELECT * FROM workshops ORDER BY title").fetchall()


def get_workshop(workshop_id: int | None = None, slug: str | None = None):
    db = get_db()
    if slug:
        return db.execute(
            "SELECT * FROM workshops WHERE slug = ?", (slug,)
        ).fetchone()
    return db.execute(
        "SELECT * FROM workshops WHERE id = ?", (workshop_id,)
    ).fetchone()


def seats_taken(workshop_id: int) -> int:
    db = get_db()
    row = db.execute(
        """
        SELECT COUNT(*) AS c FROM workshop_registrations
        WHERE workshop_id = ? AND status NOT IN ('cancelled')
        """,
        (workshop_id,),
    ).fetchone()
    return int(row["c"])


def register(user_id: int, workshop_id: int) -> dict:
    db = get_db()
    ws = get_workshop(workshop_id=workshop_id)
    if not ws or not ws["is_published"]:
        raise WorkshopError("Workshop not found.")
    existing = db.execute(
        """
        SELECT * FROM workshop_registrations
        WHERE workshop_id = ? AND user_id = ?
        """,
        (workshop_id, user_id),
    ).fetchone()
    if existing and existing["status"] != "cancelled":
        raise WorkshopError("You are already registered for this workshop.")
    if ws["capacity"] is not None and seats_taken(workshop_id) >= ws["capacity"]:
        raise WorkshopError("This workshop is at capacity.")

    now = utcnow()
    if existing:
        db.execute(
            """
            UPDATE workshop_registrations
            SET status = 'pending', payment_status = 'unpaid'
            WHERE id = ?
            """,
            (existing["id"],),
        )
        reg_id = existing["id"]
    else:
        cur = db.execute(
            """
            INSERT INTO workshop_registrations (
                workshop_id, user_id, status, payment_status, created_at
            ) VALUES (?, ?, 'pending', 'unpaid', ?)
            """,
            (workshop_id, user_id, now),
        )
        reg_id = cur.lastrowid
    db.commit()
    audit(
        "workshop.registered",
        actor_id=user_id,
        entity_type="workshop_registration",
        entity_id=reg_id,
    )
    return dict(
        db.execute(
            "SELECT * FROM workshop_registrations WHERE id = ?", (reg_id,)
        ).fetchone()
    )


def user_has_access(user_id: int, workshop_id: int) -> bool:
    db = get_db()
    row = db.execute(
        """
        SELECT id FROM workshop_registrations
        WHERE workshop_id = ? AND user_id = ?
          AND status IN ('confirmed','attended','completed')
          AND payment_status IN ('paid','completed')
        """,
        (workshop_id, user_id),
    ).fetchone()
    return row is not None
