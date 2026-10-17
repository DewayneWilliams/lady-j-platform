"""Authentication — email/password; OAuth hooks prepared but inactive."""

from __future__ import annotations

import secrets

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user

from app.db import audit, get_db, utcnow
from app.models_user import create_user, get_user_by_email, verify_password

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.get("/login")
def login():
    if current_user.is_authenticated:
        return _post_login_redirect()
    return render_template(
        "auth/login.html",
        oauth_ready={
            "google": False,
            "apple": False,
            "facebook": False,
        },
    )


@bp.post("/login")
def login_post():
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    user = get_user_by_email(email)
    if not user or not verify_password(user, password):
        flash("Invalid email or password.", "error")
        return render_template("auth/login.html", oauth_ready={}), 401
    login_user(user, remember=bool(request.form.get("remember")))
    audit("auth.login", actor_id=user.id)
    return _post_login_redirect()


@bp.get("/register")
def register():
    if current_user.is_authenticated:
        return redirect(url_for("account.dashboard"))
    return render_template("auth/register.html")


@bp.post("/register")
def register_post():
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    full_name = request.form.get("full_name", "").strip()
    phone = request.form.get("phone", "").strip() or None
    if not email or not password or not full_name:
        flash("Please complete all required fields.", "error")
        return render_template("auth/register.html"), 400
    if len(password) < 8:
        flash("Password must be at least 8 characters.", "error")
        return render_template("auth/register.html"), 400
    if get_user_by_email(email):
        flash("An account with that email already exists.", "error")
        return render_template("auth/register.html"), 400
    user = create_user(
        email=email, password=password, full_name=full_name, phone=phone
    )
    db = get_db()
    db.execute(
        "UPDATE users SET referral_code = ? WHERE id = ?",
        ("LJ-" + secrets.token_hex(3).upper(), user.id),
    )
    db.commit()
    login_user(user)
    audit("auth.register", actor_id=user.id)
    flash("Welcome to Lady J. Your private account is ready.", "success")
    return redirect(url_for("account.dashboard"))


@bp.get("/logout")
@login_required
def logout():
    audit("auth.logout", actor_id=current_user.id)
    logout_user()
    flash("You have been signed out.", "info")
    return redirect(url_for("public.home"))


@bp.get("/oauth/<provider>")
def oauth_start(provider: str):
    """Optional Google / Apple / Facebook — inactive until credentials set."""
    if provider not in ("google", "apple", "facebook"):
        flash("Unknown sign-in provider.", "error")
        return redirect(url_for("auth.login"))
    flash(
        f"{provider.title()} sign-in is prepared but not enabled. "
        "Use email login, or add OAuth credentials to activate.",
        "info",
    )
    return redirect(url_for("auth.login"))


def _post_login_redirect():
    nxt = request.args.get("next") or request.form.get("next")
    if nxt and nxt.startswith("/"):
        return redirect(nxt)
    if current_user.is_owner or current_user.role == "staff":
        return redirect(url_for("owner.today"))
    return redirect(url_for("account.dashboard"))
