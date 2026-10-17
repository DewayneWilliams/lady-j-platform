"""Core integration tests for Lady J platform upgrade."""

from __future__ import annotations

import os
import tempfile
from datetime import timedelta

import pytest

from app import create_app
from app.db import get_db
from app.services.hours import is_business_day, now_local, valid_dates
from app.services.booking import available_slots, create_appointment


@pytest.fixture()
def app():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    application = create_app(
        {
            "TESTING": True,
            "DATABASE": db_path,
            "SECRET_KEY": "test",
            "OWNER_EMAIL": "owner@test.local",
            "OWNER_PASSWORD": "testpass123",
            "OWNER_NAME": "Test Owner",
        }
    )
    yield application
    os.unlink(db_path)


@pytest.fixture()
def client(app):
    return app.test_client()


def test_home_ok(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"Lady J" in res.data


def test_public_routes(client):
    for path in (
        "/services",
        "/workshops",
        "/boutique",
        "/about",
        "/contact",
        "/book/step-1",
    ):
        assert client.get(path).status_code == 200


def test_business_days_tue_sat(app):
    with app.app_context():
        d = now_local().date()
        found_open = False
        found_closed = False
        for i in range(14):
            day = d + timedelta(days=i)
            js = (day.weekday() + 1) % 7
            if js in (2, 3, 4, 5, 6):
                assert is_business_day(day) is True
                found_open = True
            if js in (0, 1):
                assert is_business_day(day) is False
                found_closed = True
        assert found_open and found_closed


def test_seeded_services(app):
    with app.app_context():
        db = get_db()
        count = db.execute("SELECT COUNT(*) AS c FROM services").fetchone()["c"]
        assert count >= 40


def test_owner_login_and_dashboard(client, app):
    res = client.post(
        "/auth/login",
        data={"email": "owner@test.local", "password": "testpass123"},
        follow_redirects=True,
    )
    assert res.status_code == 200
    assert b"Today" in res.data or b"Owner" in res.data
    assert client.get("/owner/today").status_code == 200
    assert client.get("/owner/maria").status_code == 200


def test_booking_three_steps_and_overlap(app, client):
    with app.app_context():
        db = get_db()
        svc = db.execute(
            "SELECT id, duration_minutes FROM services WHERE is_addon = 0 LIMIT 1"
        ).fetchone()
        days = valid_dates(0, 7)
        assert days
        day = days[0]
        slots = available_slots(day, svc["duration_minutes"])
        assert slots
        start = slots[0]["start_minutes"]
        create_appointment(
            client_id=None,
            guest_name="Test Guest",
            guest_email="guest@test.local",
            guest_phone="18680000000",
            appointment_date=day.isoformat(),
            start_minutes=start,
            service_qty=[(svc["id"], 1)],
            notes=None,
            payment_method="salon",
            policy_accepted=True,
        )
        # Same slot should now be unavailable
        slots2 = available_slots(day, svc["duration_minutes"])
        assert start not in {s["start_minutes"] for s in slots2}


def test_register_client(client):
    res = client.post(
        "/auth/register",
        data={
            "full_name": "Client One",
            "email": "client1@test.local",
            "phone": "18681112222",
            "password": "password12",
        },
        follow_redirects=True,
    )
    assert res.status_code == 200
    assert b"private" in res.data.lower() or b"Hello" in res.data or b"Account" in res.data
