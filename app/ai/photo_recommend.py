"""Vision-capable AI adapter for inspiration photo → service recommendations.

Uses a local demonstration fallback when AWS Bedrock / vision credentials
are unavailable. Recommendations are estimates requiring professional confirmation.
"""

from __future__ import annotations

import os
from typing import Any

from app.db import get_db


DISCLAIMER = (
    "These AI suggestions are estimates only and require confirmation "
    "from a Lady J professional. Results may vary."
)


def _catalog() -> list[dict]:
    db = get_db()
    rows = db.execute(
        """
        SELECT id, name, category, description, price_ttd, duration_minutes, is_demo
        FROM services WHERE is_active = 1 AND is_addon = 0
        ORDER BY category, name
        """
    ).fetchall()
    return [dict(r) for r in rows]


def _keyword_score(filename_hint: str, service: dict) -> float:
    text = f"{service['name']} {service['category']} {service.get('description') or ''}".lower()
    hints = {
        "hair": ["hair", "braid", "silk", "press", "color", "blow", "cut", "loc", "wig"],
        "nail": ["mani", "pedi", "acrylic", "gel", "nail"],
        "lash": ["lash", "brow", "eye"],
        "skin": ["facial", "skin", "peel", "glow", "acne"],
        "spa": ["massage", "body", "spa", "scrub", "wax"],
        "makeup": ["makeup", "glam", "bridal", "lash"],
        "bridal": ["bridal", "makeup", "package", "hair"],
    }
    score = 0.0
    lower = filename_hint.lower()
    for group, keys in hints.items():
        if group in lower or any(k in lower for k in keys):
            if any(k in text for k in keys) or group in text:
                score += 2.0
    # Light Category boosts from common beauty photo cues
    for token in ("pink", "gold", "curl", "straight", "ombre", "french", "volume"):
        if token in lower and token in text:
            score += 1.0
    return score


def recommend_from_image(
    *,
    filename: str | None = None,
    image_bytes: bytes | None = None,
) -> dict[str, Any]:
    """Return ranked service recommendations.

    When AWS credentials + Bedrock vision model are configured, a real
    vision call can be wired here. Until then, uses local demo heuristics
    and never claims real image analysis.
    """
    catalog = _catalog()
    use_aws = bool(
        os.environ.get("AWS_ACCESS_KEY_ID")
        and os.environ.get("BEDROCK_MODEL_ID")
    )

    if use_aws and image_bytes:
        # Placeholder hook — real Bedrock InvokeModel would go here.
        # Fall through to demo until integration credentials are validated.
        mode = "aws_pending_fallback"
    else:
        mode = "local_demo"

    hint = filename or "general beauty inspiration"
    scored = []
    for svc in catalog:
        s = _keyword_score(hint, svc)
        if s <= 0:
            # Soft baseline for demo diversity
            if svc["category"] in ("HAIR", "SKIN & FACIALS", "MAKEUP", "MANICURES"):
                s = 0.3
        if s > 0:
            scored.append((s, svc))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    top = [
        {
            **svc,
            "confidence": round(min(0.92, 0.45 + score * 0.12), 2),
            "reason": f"Matches cues related to {svc['category'].title()}",
        }
        for score, svc in scored[:6]
    ]

    return {
        "mode": mode,
        "disclaimer": DISCLAIMER,
        "analyzed": mode != "local_demo",
        "message": (
            "Local demonstration recommendations based on your filename and our service menu. "
            "No real image analysis was performed."
            if mode == "local_demo"
            else "Vision adapter prepared; using safe fallback until provider response is verified."
        ),
        "recommendations": top,
    }
