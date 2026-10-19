"""Service catalog grouping for Apple-style category dropdowns."""

from __future__ import annotations

from collections import OrderedDict
from typing import Any

# Public booking groups — keep menus short.
SERVICE_GROUPS: OrderedDict[str, list[str]] = OrderedDict(
    [
        (
            "Hair",
            [
                "HAIR",
                "HAIRCUTS & STYLING",
                "SHAMPOO & BLOWOUTS",
                "BRIDAL & PACKAGES",
            ],
        ),
        (
            "Skin",
            [
                "SKIN & FACIALS",
                "BODY & SPA",
                "MASSAGE",
                "WAXING",
            ],
        ),
        (
            "Nails",
            [
                "MANICURES",
                "PEDICURES",
            ],
        ),
        (
            "Lashes",
            [
                "LASHES",
                "BROWS",
                "MAKEUP",
            ],
        ),
    ]
)


def group_services(rows: list[Any]) -> OrderedDict[str, list[Any]]:
    """Map DB category rows into Hair / Skin / Nails / Lashes."""
    buckets: OrderedDict[str, list[Any]] = OrderedDict(
        (name, []) for name in SERVICE_GROUPS
    )
    other: list[Any] = []

    reverse: dict[str, str] = {}
    for group, cats in SERVICE_GROUPS.items():
        for cat in cats:
            reverse[cat.upper()] = group

    for row in rows:
        cat = (row["category"] or "").upper()
        group = reverse.get(cat)
        if group:
            buckets[group].append(row)
        else:
            other.append(row)

    if other:
        # Prefer Skin as a soft landing for unmapped spa/beauty items
        buckets["Skin"].extend(other)

    # Drop empty groups
    return OrderedDict((k, v) for k, v in buckets.items() if v)
