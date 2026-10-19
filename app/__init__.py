"""Lady J Salon & Day Spa — Flask application factory."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_login import LoginManager

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

    root = Path(__file__).resolve().parent.parent
    instance = root / "instance"
    instance.mkdir(exist_ok=True)

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
        OWNER_PASSWORD=os.environ.get("OWNER_PASSWORD", "ChangeMeImmediately!"),
        OWNER_NAME=os.environ.get("OWNER_NAME", "Lady J Owner"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "0") == "1",
    )

    if test_config:
        app.config.update(test_config)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id: str):
        return load_user_by_id(user_id)

    app.teardown_appcontext(close_db)

    from app.routes import register_blueprints

    register_blueprints(app)

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