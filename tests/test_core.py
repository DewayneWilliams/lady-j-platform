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
        "/products",
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


def test_mobile_navigation_matches_draftbit_and_products_route(client):
    res = client.get("/")
    assert res.status_code == 200
    html = res.get_data(as_text=True)
    assert 'id="languageTrigger"' in html
    assert 'id="languageSearch"' in html
    for language in ("Spanish", "French", "Chinese", "Hindi"):
        assert language in html
    assert 'class="app-tab-bar"' in html
    nav_start = html.index('class="app-tab-bar"')
    nav_html = html[nav_start : html.index("</nav>", nav_start)]
    labels = ["Home", "Services", "Products", "Workshops", "Contact", "Account"]
    positions = [nav_html.index(f">{label}</span>") for label in labels]
    assert positions == sorted(positions)
    assert client.get("/products").status_code == 200
    legacy = client.get("/boutique")
    assert legacy.status_code == 301
    assert legacy.headers["Location"].endswith("/products")


def test_public_service_categories_are_expandable_and_click_to_book(client, app):
    home = client.get("/").get_data(as_text=True)
    assert 'class="service-categories"' in home
    assert 'class="service-category"' in home

    with app.app_context():
        service_id = get_db().execute(
            "SELECT id FROM services WHERE is_active = 1 LIMIT 1"
        ).fetchone()["id"]
    selected = client.get(f"/book/step-1?service={service_id}")
    assert selected.status_code == 200
    with client.session_transaction() as sess:
        assert {"service_id": service_id, "qty": 1} in sess["booking_cart"]


def test_public_pages_and_footer_order(client):
    expectations = {
        "/about": "Beauty care that feels personal",
        "/services": "Find your perfect service",
        "/products": "Professional care, at home",
        "/workshops": "Learn the craft",
    }
    for path, heading in expectations.items():
        html = client.get(path).get_data(as_text=True)
        assert heading in html

    html = client.get("/").get_data(as_text=True)
    footer = html[html.index('<footer class="site-footer">') :]
    labels = ["About", "Services", "Products", "Workshops"]
    positions = [footer.index(f">{label}</a>") for label in labels]
    assert positions == sorted(positions)


def test_amazon_translate_api(client, monkeypatch):
    monkeypatch.setattr(
        "app.routes.api.translate_text",
        lambda text, target: f"{target}:{text}",
    )
    available = client.get("/api/languages")
    assert available.status_code == 200
    language_data = available.get_json()
    assert language_data["featured"] == ["es", "fr", "zh", "hi"]
    assert any(item["code"] == "ja" for item in language_data["languages"])

    translated = client.post(
        "/api/translate",
        json={"target_language": "fr", "texts": ["Book", "Services"]},
    )
    assert translated.status_code == 200
    assert translated.get_json()["translations"] == ["fr:Book", "fr:Services"]

    invalid = client.post(
        "/api/translate",
        json={"target_language": "not-a-language", "texts": ["Book"]},
    )
    assert invalid.status_code == 400


def test_booking_calendar_hides_past_days(client, app):
    with app.app_context():
        db = get_db()
        service_id = db.execute(
            "SELECT id FROM services WHERE is_addon = 0 LIMIT 1"
        ).fetchone()["id"]
    with client.session_transaction() as sess:
        sess["booking_cart"] = [{"service_id": service_id, "qty": 1}]
    html = client.get("/book/step-2").get_data(as_text=True)
    assert "day.is_past" not in html
    assert 'class="cal-day empty"' in html
    assert 'aria-label="Previous month"' not in html


def test_owner_block_time_calendar_color_sync(client):
    client.post(
        "/auth/login",
        data={"email": "owner@test.local", "password": "testpass123"},
    )
    day = now_local().date().isoformat()
    saved = client.post(
        "/owner/calendar/block",
        data={
            "start_at": day + "T12:00",
            "end_at": day + "T13:00",
            "reason": "vip",
        },
        follow_redirects=True,
    )
    assert saved.status_code == 200
    assert b"Time blocked" in saved.data
    assert b"calendar-dot vip" in saved.data
    assert b"VIP" in saved.data


def test_product_checkout_and_workshop_registration(client, app):
    client.post(
        "/auth/register",
        data={
            "full_name": "Commerce Client",
            "email": "commerce@test.local",
            "phone": "18685550123",
            "password": "password12",
        },
    )
    with app.app_context():
        db = get_db()
        product = db.execute(
            "SELECT id, stock FROM products WHERE is_published = 1 AND stock > 0 LIMIT 1"
        ).fetchone()
        workshop = db.execute(
            "SELECT id FROM workshops WHERE is_published = 1 LIMIT 1"
        ).fetchone()

    added = client.post(
        f"/account/cart/add/{product['id']}", follow_redirects=True
    )
    assert added.status_code == 200
    assert b"Added to cart" in added.data
    placed = client.post(
        "/account/cart/checkout",
        data={
            "payment_method": "bank_transfer",
            "fulfillment": "pickup",
            "bank_reference": "TEST-ORDER-REF",
            "bank_payment_date": now_local().date().isoformat(),
        },
        follow_redirects=True,
    )
    assert placed.status_code == 200
    assert b"Order placed successfully" in placed.data

    enrolled = client.post(
        f"/account/workshops/{workshop['id']}/enroll",
        follow_redirects=True,
    )
    assert enrolled.status_code == 200
    assert b"Complete payment" in enrolled.data
    with app.app_context():
        db = get_db()
        reg = db.execute(
            """
            SELECT wr.id
            FROM workshop_registrations wr
            JOIN users u ON u.id = wr.user_id
            WHERE u.email = ?
            """,
            ("commerce@test.local",),
        ).fetchone()
    paid = client.post(
        f"/account/workshops/pay/{reg['id']}",
        data={"payment_method": "card"},
        follow_redirects=True,
    )
    assert paid.status_code == 200
    assert b"Workshop payment confirmed" in paid.data

    with app.app_context():
        db = get_db()
        order = db.execute("SELECT * FROM orders LIMIT 1").fetchone()
        registration = db.execute(
            "SELECT * FROM workshop_registrations WHERE id = ?", (reg["id"],)
        ).fetchone()
        remaining = db.execute(
            "SELECT stock FROM products WHERE id = ?", (product["id"],)
        ).fetchone()["stock"]
        assert order["payment_status"] == "unpaid"
        assert registration["status"] == "confirmed"
        assert registration["payment_status"] == "paid"
        assert remaining == product["stock"] - 1
