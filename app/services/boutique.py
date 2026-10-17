"""Boutique catalog, cart checkout, inventory locking."""

from __future__ import annotations

from app.db import audit, get_db, utcnow
from app.services.payments import PaymentError, process_card_deposit  # noqa: F401


class BoutiqueError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def list_products(q: str | None = None, category: str | None = None):
    db = get_db()
    sql = "SELECT * FROM products WHERE is_published = 1"
    params: list = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    if q:
        sql += " AND (name LIKE ? OR description LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%"])
    sql += " ORDER BY category, name"
    return db.execute(sql, params).fetchall()


def create_order(
    *,
    user_id: int,
    items: list[tuple[int, int]],
    fulfillment: str = "pickup",
    payment_method: str = "bank_transfer",
    notes: str | None = None,
) -> dict:
    if fulfillment not in ("pickup", "delivery"):
        raise BoutiqueError("Invalid fulfillment option.")
    if not items:
        raise BoutiqueError("Cart is empty.")

    db = get_db()
    # Inventory lock: check then decrement in one transaction
    lines = []
    subtotal = 0.0
    for product_id, qty in items:
        if qty < 1:
            raise BoutiqueError("Invalid quantity.")
        row = db.execute(
            "SELECT * FROM products WHERE id = ? AND is_published = 1",
            (product_id,),
        ).fetchone()
        if not row:
            raise BoutiqueError("Product not found.")
        if row["stock"] < qty:
            raise BoutiqueError(
                f"Insufficient stock for {row['name']} (available: {row['stock']})."
            )
        lines.append((row, qty))
        subtotal += row["price_ttd"] * qty

    now = utcnow()
    status = "awaiting_bank" if payment_method == "bank_transfer" else "pending"
    cur = db.execute(
        """
        INSERT INTO orders (
            user_id, status, fulfillment, subtotal_ttd, total_ttd,
            payment_method, payment_status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)
        """,
        (
            user_id,
            status,
            fulfillment,
            subtotal,
            subtotal,
            payment_method,
            notes,
            now,
            now,
        ),
    )
    order_id = cur.lastrowid
    for row, qty in lines:
        db.execute(
            """
            INSERT INTO order_items (order_id, product_id, qty, unit_price_ttd)
            VALUES (?, ?, ?, ?)
            """,
            (order_id, row["id"], qty, row["price_ttd"]),
        )
        updated = db.execute(
            """
            UPDATE products SET stock = stock - ?, updated_at = ?
            WHERE id = ? AND stock >= ?
            """,
            (qty, now, row["id"], qty),
        )
        if updated.rowcount != 1:
            db.rollback()
            raise BoutiqueError(f"Could not reserve stock for {row['name']}.")
    db.commit()
    audit(
        "order.created",
        actor_id=user_id,
        entity_type="order",
        entity_id=order_id,
        detail=f"{len(lines)} items, {subtotal} TTD",
    )
    return dict(
        db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    )
