"""User model for Flask-Login."""

from __future__ import annotations

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.db import get_db, utcnow


class User(UserMixin):
    def __init__(self, row):
        self.id = row["id"]
        self.email = row["email"]
        self.password_hash = row["password_hash"]
        self.full_name = row["full_name"]
        self.phone = row["phone"]
        self.role = row["role"]
        self.text_size = row["text_size"]
        self.theme = row["theme"]
        self.credits_balance = row["credits_balance"]
        self._active = bool(row["is_active"])

    @property
    def is_active(self) -> bool:
        return self._active

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    @property
    def is_staff(self) -> bool:
        return self.role in ("owner", "staff")


def load_user_by_id(user_id: str) -> User | None:
    db = get_db()
    row = db.execute(
        "SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)
    ).fetchone()
    return User(row) if row else None


def get_user_by_email(email: str) -> User | None:
    db = get_db()
    row = db.execute(
        "SELECT * FROM users WHERE email = ? COLLATE NOCASE AND is_active = 1",
        (email.strip(),),
    ).fetchone()
    return User(row) if row else None


def create_user(
    *,
    email: str,
    password: str,
    full_name: str,
    phone: str | None = None,
    role: str = "client",
) -> User:
    db = get_db()
    now = utcnow()
    cur = db.execute(
        """
        INSERT INTO users (
            email, password_hash, full_name, phone, role,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            email.strip().lower(),
            generate_password_hash(password),
            full_name.strip(),
            phone,
            role,
            now,
            now,
        ),
    )
    db.commit()
    return load_user_by_id(str(cur.lastrowid))  # type: ignore[return-value]


def verify_password(user: User, password: str) -> bool:
    return check_password_hash(user.password_hash, password)


def update_user_prefs(user_id: int, *, text_size: str | None = None, theme: str | None = None) -> None:
    db = get_db()
    if text_size:
        db.execute(
            "UPDATE users SET text_size = ?, updated_at = ? WHERE id = ?",
            (text_size, utcnow(), user_id),
        )
    if theme:
        db.execute(
            "UPDATE users SET theme = ?, updated_at = ? WHERE id = ?",
            (theme, utcnow(), user_id),
        )
    db.commit()
