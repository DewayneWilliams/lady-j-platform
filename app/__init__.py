"""Lady J Salon & Day Spa — Flask application factory."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, redirect, request, url_for
from flask_login import LoginManager
from werkzeug.middleware.proxy_fix import ProxyFix

from app.db import close_db, init_db
from app.models_user import User, load_user_by_id

login_manager = LoginManager()
login_manager.login_view = "auth.login"
login_manager.login_message_category = "info"


def create_app(test_config: dict | None = None) -> Flask:
    load_dotenv()

    app = Flask(
        __name__,
        template_folder=str(Path(__file__).resolve().parent.parent / "templates"),
        static_folder=str(Path(__file__).resolve().parent.parent / "static"),
    )
    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=1,
        x_proto=1,
        x_host=1,
    )

    root = Path(__file__).resolve().parent.parent
    instance = root / "instance"
    instance.mkdir(exist_ok=True)
    owner_emails = tuple(
        email.strip().lower()
        for email in os.environ.get(
            "OWNER_EMAILS", "msjforde@gmail.com,dwetour@gmail.com"
        ).split(",")
        if email.strip()
    )

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-change-me"),
        DATABASE=os.environ.get(
            "DATABASE_PATH", str(instance / "ladyj.db")
        ),
        TIMEZONE=os.environ.get("TIMEZONE", "America/Port_of_Spain"),
        DEPOSIT_PERCENT=int(os.environ.get("DEPOSIT_PERCENT", "50")),
        BUSINESS_NAME=os.environ.get(
            "BUSINESS_NAME", "Lady J Salon & Day Spa"
        ),
        WHATSAPP_NUMBER=os.environ.get("WHATSAPP_NUMBER", "18683745517"),
        BANK_NAME=os.environ.get("BANK_NAME", "First Citizens Bank"),
        BANK_ACCOUNT_NAME=os.environ.get(
            "BANK_ACCOUNT_NAME", "LADY J SALON AND DAY SPA"
        ),
        BANK_ACCOUNT_TYPE=os.environ.get("BANK_ACCOUNT_TYPE", "Savings"),
        BANK_ACCOUNT_NUMBER=os.environ.get("BANK_ACCOUNT_NUMBER", "3201297"),
        PAYMENT_CARD_PROVIDER=os.environ.get(
            "PAYMENT_CARD_PROVIDER", "simulated"
        ),
        UPLOAD_FOLDER=str(root / "static" / "uploads"),
        MAX_CONTENT_LENGTH=8 * 1024 * 1024,
        OWNER_EMAIL=os.environ.get("OWNER_EMAIL", "owner@ladyjglobal.com"),
        OWNER_PASSWORD=os.environ.get("OWNER_PASSWORD", ""),
        OWNER_NAME=os.environ.get("OWNER_NAME", "Lady J Owner"),
        OWNER_EMAILS=owner_emails,
        SMTP_HOST=os.environ.get("SMTP_HOST", ""),
        SMTP_PORT=int(os.environ.get("SMTP_PORT", "587")),
        SMTP_USERNAME=os.environ.get("SMTP_USERNAME", ""),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
        SMTP_FROM=os.environ.get("SMTP_FROM", "no-reply@ladyjglobal.com"),
        SMTP_USE_TLS=os.environ.get("SMTP_USE_TLS", "1") == "1",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "0") == "1",
    )

    if test_config:
        app.config.update(test_config)
        if "OWNER_EMAILS" not in test_config and test_config.get("OWNER_EMAIL"):
            app.config["OWNER_EMAILS"] = (
                str(test_config["OWNER_EMAIL"]).strip().lower(),
            )

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    login_manager.init_app(app)

    @app.before_request
    def require_temporary_password_change():
        from flask_login import current_user

        if (
            current_user.is_authenticated
            and current_user.must_change_password
            and request.endpoint
            not in {
                "auth.change_password",
                "auth.logout",
                "static",
            }
        ):
            return redirect(url_for("auth.change_password"))

    @login_manager.user_loader
    def load_user(user_id: str):
        return load_user_by_id(user_id)

    app.teardown_appcontext(close_db)

    from app.routes import register_blueprints

    register_blueprints(app)

    from app.admin import register_admin_commands

    register_admin_commands(app)

    with app.app_context():
        init_db()
        from app.seed import ensure_seed_data

        ensure_seed_data(app)

    @app.context_processor
    def inject_globals():
        from flask_login import current_user

        return {
            "business_name": app.config["BUSINESS_NAME"],
            "whatsapp": app.config["WHATSAPP_NUMBER"],
            "deposit_percent": app.config["DEPOSIT_PERCENT"],
            "current_user": current_user,
        }

    return app