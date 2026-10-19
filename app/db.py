"""SQLite database helpers."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app, g


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        path = current_app.config["DATABASE"]
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client'
        CHECK(role IN ('client','staff','owner')),
    text_size TEXT NOT NULL DEFAULT 'default'
        CHECK(text_size IN ('default','large','xlarge')),
    theme TEXT NOT NULL DEFAULT 'light'
        CHECK(theme IN ('light','dark','system')),
    birthday TEXT,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    credits_balance REAL NOT NULL DEFAULT 0,
    notes_private TEXT,
    allergies TEXT,
    preferences TEXT,
    oauth_providers TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    password_changed_at TEXT,
    reset_token_hash TEXT,
    reset_token_expires_at TEXT,
    mfa_secret_encrypted TEXT,
    mfa_enabled INTEGER NOT NULL DEFAULT 0,
    mfa_recovery_codes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price_ttd REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    image_url TEXT,
    is_addon INTEGER NOT NULL DEFAULT 0,
    max_qty INTEGER NOT NULL DEFAULT 1,
    qty_suffix TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
    start_minutes INTEGER NOT NULL,
    end_minutes INTEGER NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS blocked_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER REFERENCES users(id),
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES users(id),
    staff_id INTEGER REFERENCES users(id),
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    appointment_date TEXT NOT NULL,
    start_minutes INTEGER NOT NULL,
    end_minutes INTEGER NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Port_of_Spain',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
            'pending','confirmed','completed','cancelled','no_show'
        )),
    notes TEXT,
    cancellation_policy_accepted INTEGER NOT NULL DEFAULT 0,
    total_ttd REAL NOT NULL,
    deposit_percent INTEGER NOT NULL,
    deposit_ttd REAL NOT NULL,
    amount_paid_ttd REAL NOT NULL DEFAULT 0,
    credit_applied_ttd REAL NOT NULL DEFAULT 0,
    payment_method TEXT
        CHECK(payment_method IN ('card','bank_transfer','salon','credit', NULL)),
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK(payment_status IN (
            'unpaid','deposit_pending','deposit_paid','paid',
            'refund_pending','refunded','partial_credit','forfeited'
        )),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointment_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price_ttd REAL NOT NULL,
    duration_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id),
    appointment_id INTEGER REFERENCES appointments(id),
    workshop_registration_id INTEGER,
    order_id INTEGER,
    amount_ttd REAL NOT NULL,
    method TEXT NOT NULL
        CHECK(method IN ('card','bank_transfer','credit','salon')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
            'pending','awaiting_verification','completed','failed',
            'refunded','partially_refunded'
        )),
    provider TEXT,
    provider_ref TEXT,
    bank_reference TEXT,
    bank_payment_date TEXT,
    proof_path TEXT,
    verified_by INTEGER REFERENCES users(id),
    verified_at TEXT,
    meta_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount_ttd REAL NOT NULL,
    reason TEXT NOT NULL,
    appointment_id INTEGER REFERENCES appointments(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    instructor_name TEXT,
    instructor_bio TEXT,
    mode TEXT NOT NULL CHECK(mode IN ('live','recorded','hybrid')),
    price_ttd REAL NOT NULL,
    capacity INTEGER,
    scheduled_at TEXT,
    duration_minutes INTEGER,
    image_url TEXT,
    content_path TEXT,
    certificate_enabled INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshop_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workshop_id INTEGER NOT NULL REFERENCES workshops(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','confirmed','attended','cancelled','completed')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    attendance_at TEXT,
    certificate_issued INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(workshop_id, user_id)
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price_ttd REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_published INTEGER NOT NULL DEFAULT 1,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
            'pending','paid','awaiting_bank','fulfilling',
            'ready_pickup','delivered','cancelled'
        )),
    fulfillment TEXT NOT NULL DEFAULT 'pickup'
        CHECK(fulfillment IN ('pickup','delivery')),
    subtotal_ttd REAL NOT NULL,
    total_ttd REAL NOT NULL,
    payment_method TEXT,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL,
    unit_price_ttd REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    percent_off REAL,
    amount_off_ttd REAL,
    starts_at TEXT,
    ends_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL CHECK(kind IN ('before','after','inspiration')),
    path TEXT NOT NULL,
    appointment_id INTEGER REFERENCES appointments(id),
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    detail TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    channel TEXT NOT NULL CHECK(channel IN ('email','whatsapp')),
    purpose TEXT NOT NULL,
    payload TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
"""


def init_db() -> None:
    db = get_db()
    db.executescript(SCHEMA)
    columns = {
        row["name"] for row in db.execute("PRAGMA table_info(users)").fetchall()
    }
    migrations = {
        "email_verified": "INTEGER NOT NULL DEFAULT 0",
        "must_change_password": "INTEGER NOT NULL DEFAULT 0",
        "password_changed_at": "TEXT",
        "reset_token_hash": "TEXT",
        "reset_token_expires_at": "TEXT",
        "mfa_secret_encrypted": "TEXT",
        "mfa_enabled": "INTEGER NOT NULL DEFAULT 0",
        "mfa_recovery_codes": "TEXT",
    }
    for name, definition in migrations.items():
        if name not in columns:
            db.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
    db.commit()


def audit(
    action: str,
    *,
    actor_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    detail: str | None = None,
) -> None:
    db = get_db()
    db.execute(
        """
        INSERT INTO audit_log (actor_id, action, entity_type, entity_id, detail, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (actor_id, action, entity_type, entity_id, detail, utcnow()),
    )
    db.commit()
