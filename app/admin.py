"""Protected administrative CLI commands."""

from __future__ import annotations

from pathlib import Path

import click
from flask import Flask
from werkzeug.security import generate_password_hash

from app.db import get_db, utcnow


def register_admin_commands(app: Flask) -> None:
    @app.cli.command("provision-owners")
    @click.option(
        "--password-file",
        required=True,
        type=click.Path(exists=True, dir_okay=False, path_type=Path),
    )
    def provision_owners(password_file: Path) -> None:
        """Provision exactly the configured owners from a protected password file."""
        emails = tuple(app.config["OWNER_EMAILS"])
        if len(emails) != 2 or len(set(emails)) != 2:
            raise click.ClickException("OWNER_EMAILS must contain exactly two addresses")

        try:
            password = password_file.read_text(encoding="utf-8").splitlines()[0]
        finally:
            password_file.unlink(missing_ok=True)
        if len(password) < 8:
            raise click.ClickException("Temporary password must be at least 8 characters")

        db = get_db()
        now = utcnow()
        placeholders = ",".join("?" for _ in emails)
        db.execute(
            f"""
            UPDATE users
            SET role = 'client', updated_at = ?
            WHERE role IN ('owner', 'staff')
              AND lower(email) NOT IN ({placeholders})
            """,
            (now, *emails),
        )

        default_names = ("Primary Owner", "Administrator")
        for email, default_name in zip(emails, default_names, strict=True):
            existing = db.execute(
                "SELECT id, full_name FROM users WHERE email = ? COLLATE NOCASE",
                (email,),
            ).fetchone()
            password_hash = generate_password_hash(password)
            if existing:
                db.execute(
                    """
                    UPDATE users SET
                        email = ?, password_hash = ?, role = 'owner',
                        email_verified = 1, must_change_password = 1,
                        password_changed_at = NULL,
                        reset_token_hash = NULL, reset_token_expires_at = NULL,
                        mfa_secret_encrypted = NULL, mfa_enabled = 0,
                        mfa_recovery_codes = NULL, is_active = 1, updated_at = ?
                    WHERE id = ?
                    """,
                    (email, password_hash, now, existing["id"]),
                )
            else:
                db.execute(
                    """
                    INSERT INTO users (
                        email, password_hash, full_name, role,
                        email_verified, must_change_password, is_active,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, 'owner', 1, 1, 1, ?, ?)
                    """,
                    (email, password_hash, default_name, now, now),
                )
        db.commit()
        click.echo("Provisioned exactly 2 authorized owner accounts.")

