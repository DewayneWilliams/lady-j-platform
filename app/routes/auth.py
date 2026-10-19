"""Authentication — email/password; OAuth hooks prepared but inactive."""

from __future__ import annotations

import secrets
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from time import monotonic

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import generate_password_hash

from app.db import audit, get_db, utcnow
from app.models_user import (
    create_user,
    get_user_by_email,
    load_user_by_id,
    verify_password,
)
from app.services.security import (
    consume_recovery_code,
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    hash_reset_token,
    mfa_uri,
    new_mfa_secret,
    new_recovery_codes,
    send_password_reset_email,
    verify_mfa_code,
)

bp = Blueprint("auth", __name__, url_prefix="/auth")
_login_failures: dict[str, deque[float]] = defaultdict(deque)


def _login_key(email: str) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",", 1)[0].strip() or request.remote_addr or "unknown"
    return f"{client_ip}:{email.lower()}"


def _too_many_login_failures(key: str) -> bool:
    now = monotonic()
    failures = _login_failures[key]
    while failures and failures[0] < now - 900:
        failures.popleft()
    return len(failures) >= 5


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
    failure_key = _login_key(email)
    if _too_many_login_failures(failure_key):
        flash("Too many sign-in attempts. Try again later.", "error")
        return render_template("auth/login.html", oauth_ready={}), 429
    user = get_user_by_email(email)
    if not user or not verify_password(user, password):
        _login_failures[failure_key].append(monotonic())
        flash("Invalid email or password.", "error")
        return render_template("auth/login.html", oauth_ready={}), 401
    _login_failures.pop(failure_key, None)
    if user.mfa_enabled:
        session["mfa_pending"] = {
            "user_id": user.id,
            "remember": bool(request.form.get("remember")),
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(minutes=5)
            ).timestamp(),
        }
        return redirect(url_for("auth.mfa_challenge"))
    login_user(user, remember=bool(request.form.get("remember")))
    audit("auth.login", actor_id=user.id)
    if user.must_change_password:
        return redirect(url_for("auth.change_password"))
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


@bp.route("/change-password", methods=["GET", "POST"])
@login_required
def change_password():
    if request.method == "POST":
        current_password = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm = request.form.get("confirm_password", "")
        if not verify_password(current_user, current_password):
            flash("Current password is incorrect.", "error")
        elif len(new_password) < 12:
            flash("New password must be at least 12 characters.", "error")
        elif new_password != confirm:
            flash("New passwords do not match.", "error")
        elif new_password == current_password:
            flash("Choose a different password.", "error")
        else:
            db = get_db()
            db.execute(
                """
                UPDATE users SET
                    password_hash = ?, must_change_password = 0,
                    password_changed_at = ?, reset_token_hash = NULL,
                    reset_token_expires_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (
                    generate_password_hash(new_password),
                    utcnow(),
                    utcnow(),
                    current_user.id,
                ),
            )
            db.commit()
            audit("auth.password_changed", actor_id=current_user.id)
            flash("Password updated securely.", "success")
            return _post_login_redirect()
    return render_template("auth/change_password.html")


@bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        user = get_user_by_email(email)
        if user:
            token = secrets.token_urlsafe(32)
            expires = (
                datetime.now(timezone.utc) + timedelta(minutes=30)
            ).isoformat(timespec="seconds")
            db = get_db()
            db.execute(
                """
                UPDATE users SET reset_token_hash = ?,
                    reset_token_expires_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (hash_reset_token(token), expires, utcnow(), user.id),
            )
            db.commit()
            reset_url = url_for("auth.reset_password", token=token, _external=True)
            try:
                send_password_reset_email(user.email, reset_url)
            except Exception:
                # Never reveal provider state or token details to the requester.
                pass
        flash(
            "If that account exists, a password-reset email has been sent.",
            "info",
        )
        return redirect(url_for("auth.login"))
    return render_template("auth/forgot_password.html")


@bp.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token: str):
    db = get_db()
    user = db.execute(
        """
        SELECT * FROM users
        WHERE reset_token_hash = ? AND reset_token_expires_at >= ?
          AND is_active = 1
        """,
        (hash_reset_token(token), utcnow()),
    ).fetchone()
    if not user:
        flash("That password-reset link is invalid or expired.", "error")
        return redirect(url_for("auth.forgot_password"))
    if request.method == "POST":
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")
        if len(password) < 12:
            flash("Password must be at least 12 characters.", "error")
        elif password != confirm:
            flash("Passwords do not match.", "error")
        else:
            db.execute(
                """
                UPDATE users SET password_hash = ?, must_change_password = 0,
                    password_changed_at = ?, reset_token_hash = NULL,
                    reset_token_expires_at = NULL, updated_at = ?
                WHERE id = ?
                """,
                (
                    generate_password_hash(password),
                    utcnow(),
                    utcnow(),
                    user["id"],
                ),
            )
            db.commit()
            audit("auth.password_reset", actor_id=user["id"])
            flash("Password reset complete. You can now sign in.", "success")
            return redirect(url_for("auth.login"))
    return render_template("auth/reset_password.html")


@bp.route("/mfa", methods=["GET", "POST"])
def mfa_challenge():
    pending = session.get("mfa_pending")
    if not pending or pending.get("expires_at", 0) < datetime.now(
        timezone.utc
    ).timestamp():
        session.pop("mfa_pending", None)
        flash("Your verification session expired. Sign in again.", "error")
        return redirect(url_for("auth.login"))
    user = load_user_by_id(str(pending["user_id"]))
    if not user or not user.mfa_enabled:
        session.pop("mfa_pending", None)
        return redirect(url_for("auth.login"))
    if request.method == "POST":
        code = request.form.get("code", "").strip()
        row = get_db().execute(
            """
            SELECT mfa_secret_encrypted, mfa_recovery_codes
            FROM users WHERE id = ?
            """,
            (user.id,),
        ).fetchone()
        valid = False
        updated_recovery = None
        if row["mfa_secret_encrypted"]:
            valid = verify_mfa_code(
                decrypt_mfa_secret(row["mfa_secret_encrypted"]), code
            )
        if not valid:
            updated_recovery = consume_recovery_code(
                row["mfa_recovery_codes"], code
            )
            valid = updated_recovery is not None
        if valid:
            if updated_recovery is not None:
                db = get_db()
                db.execute(
                    "UPDATE users SET mfa_recovery_codes = ? WHERE id = ?",
                    (updated_recovery, user.id),
                )
                db.commit()
            remember = bool(pending.get("remember"))
            session.pop("mfa_pending", None)
            login_user(user, remember=remember)
            audit("auth.mfa_login", actor_id=user.id)
            if user.must_change_password:
                return redirect(url_for("auth.change_password"))
            return _post_login_redirect()
        pending["attempts"] = int(pending.get("attempts", 0)) + 1
        if pending["attempts"] >= 10:
            session.pop("mfa_pending", None)
            flash("Too many verification attempts. Sign in again.", "error")
            return redirect(url_for("auth.login"))
        session["mfa_pending"] = pending
        flash("Invalid verification or recovery code.", "error")
    return render_template("auth/mfa_challenge.html")


@bp.route("/mfa/setup", methods=["GET", "POST"])
@login_required
def mfa_setup():
    if current_user.mfa_enabled and request.method == "GET":
        return render_template(
            "auth/mfa_setup.html",
            enabled=True,
            recovery_codes=None,
        )
    secret = session.get("mfa_setup_secret")
    if not secret:
        secret = new_mfa_secret()
        session["mfa_setup_secret"] = secret
    if request.method == "POST":
        if verify_mfa_code(secret, request.form.get("code", "")):
            recovery_codes, recovery_hashes = new_recovery_codes()
            db = get_db()
            db.execute(
                """
                UPDATE users SET mfa_secret_encrypted = ?, mfa_enabled = 1,
                    mfa_recovery_codes = ?, updated_at = ? WHERE id = ?
                """,
                (
                    encrypt_mfa_secret(secret),
                    recovery_hashes,
                    utcnow(),
                    current_user.id,
                ),
            )
            db.commit()
            session.pop("mfa_setup_secret", None)
            audit("auth.mfa_enabled", actor_id=current_user.id)
            return render_template(
                "auth/mfa_setup.html",
                enabled=True,
                recovery_codes=recovery_codes,
            )
        flash("That verification code is not valid.", "error")
    return render_template(
        "auth/mfa_setup.html",
        enabled=False,
        secret=secret,
        provisioning_uri=mfa_uri(secret, current_user.email),
    )


@bp.post("/mfa/disable")
@login_required
def mfa_disable():
    password = request.form.get("password", "")
    code = request.form.get("code", "")
    row = get_db().execute(
        "SELECT mfa_secret_encrypted FROM users WHERE id = ?",
        (current_user.id,),
    ).fetchone()
    valid_code = bool(
        row["mfa_secret_encrypted"]
        and verify_mfa_code(
            decrypt_mfa_secret(row["mfa_secret_encrypted"]), code
        )
    )
    if not verify_password(current_user, password) or not valid_code:
        flash("Password or verification code is incorrect.", "error")
        return redirect(url_for("auth.mfa_setup"))
    db = get_db()
    db.execute(
        """
        UPDATE users SET mfa_secret_encrypted = NULL, mfa_enabled = 0,
            mfa_recovery_codes = NULL, updated_at = ? WHERE id = ?
        """,
        (utcnow(), current_user.id),
    )
    db.commit()
    audit("auth.mfa_disabled", actor_id=current_user.id)
    flash("Two-factor authentication disabled.", "info")
    return redirect(url_for("account.profile"))


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
    if nxt and nxt.startswith("/") and not nxt.startswith("//"):
        return redirect(nxt)
    if current_user.is_owner:
        return redirect(url_for("owner.today"))
    return redirect(url_for("account.dashboard"))
