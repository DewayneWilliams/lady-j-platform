"""Public marketing pages."""

from __future__ import annotations

from flask import Blueprint, redirect, render_template, url_for

from app.db import get_db
from app.services.boutique import list_products
from app.services.workshops import list_workshops, seats_taken

bp = Blueprint("public", __name__)


@bp.get("/")
def home():
    db = get_db()
    featured = db.execute(
        """
        SELECT * FROM services
        WHERE is_active = 1 AND is_addon = 0
        ORDER BY is_demo ASC, sort_order ASC
        LIMIT 6
        """
    ).fetchall()
    workshops = list_workshops()[:3]
    products = list_products()[:4]
    return render_template(
        "public/home.html",
        featured=featured,
        workshops=workshops,
        products=products,
    )


@bp.get("/services")
def services():
    from app.services.catalog import group_services

    db = get_db()
    rows = db.execute(
        """
        SELECT * FROM services
        WHERE is_active = 1
        ORDER BY category, is_addon, sort_order, name
        """
    ).fetchall()
    return render_template("public/services.html", groups=group_services(rows))


@bp.get("/workshops")
def workshops():
    items = []
    for w in list_workshops():
        d = dict(w)
        d["seats_taken"] = seats_taken(w["id"])
        items.append(d)
    return render_template("public/workshops.html", workshops=items)


@bp.get("/workshops/<slug>")
def workshop_detail(slug: str):
    from app.services.workshops import get_workshop

    w = get_workshop(slug=slug)
    if not w:
        return render_template("public/not_found.html"), 404
    d = dict(w)
    d["seats_taken"] = seats_taken(w["id"])
    return render_template("public/workshop_detail.html", workshop=d)


@bp.get("/products")
def products():
    q = None
    from flask import request

    q = request.args.get("q")
    category = request.args.get("category")
    products = list_products(q=q, category=category)
    cats = sorted({p["category"] for p in products}) if not category else []
    db = get_db()
    all_cats = [
        r["category"]
        for r in db.execute(
            "SELECT DISTINCT category FROM products WHERE is_published = 1 ORDER BY category"
        ).fetchall()
    ]
    return render_template(
        "public/boutique.html",
        products=products,
        categories=all_cats,
        q=q or "",
        active_category=category or "",
    )


@bp.get("/boutique")
def boutique():
    """Keep old links working without exposing a separate Boutique section."""
    return redirect(url_for("public.products"), code=301)


@bp.get("/about")
def about():
    return render_template("public/about.html")


@bp.get("/contact")
def contact():
    return render_template("public/contact.html")
