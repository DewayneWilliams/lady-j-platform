"""Password recovery, MFA, and secret-handling helpers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import smtplib
from email.message import EmailMessage

import pyotp
from cryptography.fernet import Fernet, InvalidToken
from flask import current_app


def _fernet() -> Fernet:
    digest = hashlib.sha256(current_app.config["SECRET_KEY"].encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_mfa_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_mfa_secret(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("MFA secret cannot be decrypted") from exc


def new_mfa_secret() -> str:
    return pyotp.random_base32()


def mfa_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="Lady J Salon & Day Spa",
    )


def verify_mfa_code(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code.replace(" ", ""), valid_window=1)


def _recovery_hash(code: str) -> str:
    key = current_app.config["SECRET_KEY"].encode()
    return hmac.new(key, code.strip().lower().encode(), hashlib.sha256).hexdigest()


def new_recovery_codes() -> tuple[list[str], str]:
    codes = [
        f"{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(8)
    ]
    return codes, json.dumps([_recovery_hash(code) for code in codes])


def consume_recovery_code(stored: str | None, code: str) -> str | None:
    if not stored or not code:
        return None
    hashes = json.loads(stored)
    candidate = _recovery_hash(code)
    for index, stored_hash in enumerate(hashes):
        if hmac.compare_digest(stored_hash, candidate):
            hashes.pop(index)
            return json.dumps(hashes)
    return None


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def send_password_reset_email(email: str, reset_url: str) -> bool:
    host = current_app.config["SMTP_HOST"]
    if not host:
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your Lady J password"
    message["From"] = current_app.config["SMTP_FROM"]
    message["To"] = email
    message.set_content(
        "Use the secure link below to reset your Lady J password. "
        "The link expires in 30 minutes.\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    with smtplib.SMTP(
        host,
        current_app.config["SMTP_PORT"],
        timeout=10,
    ) as server:
        if current_app.config["SMTP_USE_TLS"]:
            server.starttls()
        username = current_app.config["SMTP_USERNAME"]
        if username:
            server.login(username, current_app.config["SMTP_PASSWORD"])
        server.send_message(message)
    return True

