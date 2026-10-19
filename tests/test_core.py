"""Core integration tests for Lady J platform upgrade."""

from __future__ import annotations

import os
import tempfile
from datetime import timedelta

import pyotp
import pytest

from app import create_app
from app.db import get_db
from app.models_user import create_user
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
            "OWNER_EMAILS": ("owner@test.local", "admin@test.local"),
        }
    )
    with application.app_context():
        second = create_user(
            email="admin@test.local",
            password="adminpass123",
            full_name="Second Owner",
            role="owner",
        )
        db = get_db()
        db.execute(
            "UPDATE users SET email_verified = 1 WHERE id = ?",
            (second.id,),
        )
        db.commit()
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


def test_two_owners_can_use_independent_simultaneous_sessions(app):
    first = app.test_client()
    second = app.test_client()
    first_login = first.post(
        "/auth/login",
        data={"email": "owner@test.local", "password": "testpass123"},
    )
    second_login = second.post(
        "/auth/login",
        data={"email": "admin@test.local", "password": "adminpass123"},
    )
    assert first_login.headers["Location"].endswith("/owner/today")
    assert second_login.headers["Location"].endswith("/owner/today")
    assert first.get("/owner/today").status_code == 200
    assert second.get("/owner/today").status_code == 200


def test_owner_provisioning_is_idempotent_and_demotes_unlisted_admins(
    app, tmp_path
):
    with app.app_context():
        rogue = create_user(
            email="former-owner@test.local",
            password="formerpass123",
            full_name="Former Owner",
            role="owner",
        )
        get_db().execute(
            "UPDATE users SET email_verified = 1 WHERE id = ?",
            (rogue.id,),
        )
        get_db().commit()
    password_file = tmp_path / "owner-password"
    password_file.write_text("temporary-owner-pass", encoding="utf-8")
    result = app.test_cli_runner().invoke(
        args=["provision-owners", "--password-file", str(password_file)]
    )
    assert result.exit_code == 0
    assert not password_file.exists()
    with app.app_context():
        owners = get_db().execute(
            """
            SELECT email, must_change_password, email_verified
            FROM users WHERE role = 'owner' ORDER BY email
            """
        ).fetchall()
        assert [row["email"] for row in owners] == [
            "admin@test.local",
            "owner@test.local",
        ]
        assert all(row["must_change_password"] for row in owners)
        assert all(row["email_verified"] for row in owners)


def test_unlisted_owner_role_cannot_access_dashboard_or_owner_maria(app):
    with app.app_context():
        rogue = create_user(
            email="rogue@test.local",
            password="roguepass123",
            full_name="Unlisted Owner",
            role="owner",
        )
        db = get_db()
        db.execute(
            "UPDATE users SET email_verified = 1 WHERE id = ?",
            (rogue.id,),
        )
        db.commit()
    rogue_client = app.test_client()
    rogue_client.post(
        "/auth/login",
        data={"email": "rogue@test.local", "password": "roguepass123"},
    )
    assert rogue_client.get("/owner/today").status_code == 403
    maria = rogue_client.post("/api/maria", json={"text": "revenue"}).get_json()
    assert "Only the owner" in maria["message"]


def test_temporary_password_forces_change_before_owner_access(client, app):
    with app.app_context():
        db = get_db()
        db.execute(
            "UPDATE users SET must_change_password = 1 WHERE email = ?",
            ("owner@test.local",),
        )
        db.commit()
    login = client.post(
        "/auth/login",
        data={"email": "owner@test.local", "password": "testpass123"},
    )
    assert login.headers["Location"].endswith("/auth/change-password")
    blocked = client.get("/owner/today")
    assert blocked.status_code == 302
    assert blocked.headers["Location"].endswith("/auth/change-password")
    changed = client.post(
        "/auth/change-password",
        data={
            "current_password": "testpass123",
            "new_password": "A-new-owner-password-2026",
            "confirm_password": "A-new-owner-password-2026",
        },
    )
    assert changed.headers["Location"].endswith("/owner/today")
    assert client.get("/owner/today").status_code == 200


def test_password_recovery_and_owner_mfa(client, app, monkeypatch):
    reset_urls = []
    monkeypatch.setattr(
        "app.routes.auth.send_password_reset_email",
        lambda email, url: reset_urls.append((email, url)) or True,
    )
    response = client.post(
        "/auth/forgot-password",
        data={"email": "owner@test.local"},
    )
    assert response.status_code == 302
    assert reset_urls and reset_urls[0][0] == "owner@test.local"
    reset_path = reset_urls[0][1].split("http://localhost", 1)[-1]
    reset = client.post(
        reset_path,
        data={
            "password": "Recovered-owner-password-2026",
            "confirm_password": "Recovered-owner-password-2026",
        },
    )
    assert reset.status_code == 302

    client.post(
        "/auth/login",
        data={
            "email": "owner@test.local",
            "password": "Recovered-owner-password-2026",
        },
    )
    assert client.get("/auth/mfa/setup").status_code == 200
    with client.session_transaction() as sess:
        secret = sess["mfa_setup_secret"]
    enabled = client.post(
        "/auth/mfa/setup",
        data={"code": pyotp.TOTP(secret).now()},
    )
    assert enabled.status_code == 200
    assert b"recovery codes" in enabled.data
    client.get("/auth/logout")

    login = client.post(
        "/auth/login",
        data={
            "email": "owner@test.local",
            "password": "Recovered-owner-password-2026",
        },
    )
    assert login.headers["Location"].endswith("/auth/mfa")
    verified = client.post(
        "/auth/mfa",
        data={"code": pyotp.TOTP(secret).now()},
    )
    assert verified.headers["Location"].endswith("/owner/today")


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
