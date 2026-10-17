"""Register Flask blueprints."""

from __future__ import annotations

from flask import Flask


def register_blueprints(app: Flask) -> None:
    from app.routes.public import bp as public_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.booking import bp as booking_bp
    from app.routes.account import bp as account_bp
    from app.routes.owner import bp as owner_bp
    from app.routes.api import bp as api_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(account_bp)
    app.register_blueprint(owner_bp)
    app.register_blueprint(api_bp)
