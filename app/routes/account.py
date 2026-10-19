"""Private client account — not a social network."""

from __future__ import annotations

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import current_user, login_required

from app.db import get_db, utcnow
from app.models_user import update_user_prefs
from app.services.boutique import BoutiqueError, create_order
from app.services.hours import minutes_to_label
from app.services.payments import PaymentError, submit_bank_transfer
from app.services.workshops import (
    WorkshopError,
    register as register_workshop,
    user_has_access,
)

bp = Blueprint("account", __name__, url_prefix="/account")


@bp.before_request
def require_login():
    if not current_user.is_authenticated:
        return redirect(url_for("auth.login", next=request.path))


@bp.get("/")
@login_required
def dashboard():
    db = get_db()
    appts = db.execute(
        """
        SELECT * FROM appointments
        WHERE client_id = ?
        ORDER BY appointment_date DESC, start_minutes DESC
        LIMIT 10
        """,
        (current_user.id,),
    ).fetchall()
    orders = db.execute(
        """
        SELECT * FROM orders WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 5
        """,
        (current_user.id,),
    ).fetchall()
    regs = db.execute(
        """
        SELECT wr.*, w.title, w.mode
        FROM workshop_registrations wr
        JOIN workshops w ON w.id = wr.workshop_id
        WHERE wr.user_id = ?
        ORDER BY wr.created_at DESC
        """,
        (current_user.id,),
    ).fetchall()
    return render_template(
        "account/dashboard.html",
        appointments=appts,
        orders=orders,
        registrations=regs,
        minutes_to_label=minutes_to_label,
    )


@bp.route("/profile", methods=["GET", "POST"])
def profile():
    db = get_db()
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        phone = request.form.get("phone", "").strip()
        birthday = request.form.get("birthday") or None
        allergies = request.form.get("allergies", "").strip()
        preferences = request.form.get("preferences", "").strip()
        text_size = request.form.get("text_size", "default")
        theme = request.form.get("theme", "light")
        db.execute(
            """
            UPDATE users SET
                full_name = ?, phone = ?, birthday = ?,
                allergies = ?, preferences = ?,
                text_size = ?, theme = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                full_name,
                phone,
                birthday,
                allergies,
                preferences,
                text_size,
                theme,
                utcnow(),
                current_user.id,
            ),
        )
        db.commit()
        flash("Profile updated.", "success")
        return redirect(url_for("account.profile"))
    user = db.execute(
        "SELECT * FROM users WHERE id = ?", (current_user.id,)
    ).fetchone()
    return render_template("account/profile.html", user=user)


@bp.post("/prefs")
def prefs():
    update_user_prefs(
        current_user.id,
        text_size=request.form.get("text_size"),
        theme=request.form.get("theme"),
    )
    flash("Display preferences saved.", "success")
    return redirect(request.referrer or url_for("account.dashboard"))


@bp.post("/workshops/<int:workshop_id>/enroll")
def enroll_workshop(workshop_id: int):
    try:
        reg = register_workshop(current_user.id, workshop_id)
        flash("Registration started. Complete payment to confirm your seat.", "success")
        return redirect(url_for("account.workshop_pay", reg_id=reg["id"]))
    except WorkshopError as exc:
        flash(exc.message, "error")
        return redirect(url_for("public.workshops"))


@bp.route("/workshops/pay/<int:reg_id>", methods=["GET", "POST"])
def workshop_pay(reg_id: int):
    db = get_db()
    reg = db.execute(
        """
        SELECT wr.*, w.title, w.price_ttd, w.id AS workshop_id
        FROM workshop_registrations wr
        JOIN workshops w ON w.id = wr.workshop_id
        WHERE wr.id = ? AND wr.user_id = ?
        """,
        (reg_id, current_user.id),
    ).fetchone()
    if not reg:
        flash("Registration not found.", "error")
        return redirect(url_for("account.dashboard"))
    if request.method == "POST":
        method = request.form.get("payment_method", "bank_transfer")
        try:
            if method == "bank_transfer":
                submit_bank_transfer(
                    workshop_registration_id=reg_id,
                    user_id=current_user.id,
                    amount_ttd=float(reg["price_ttd"]),
                    bank_reference=request.form.get("bank_reference", ""),
                    bank_payment_date=request.form.get("bank_payment_date", ""),
                )
                flash("Bank transfer submitted for verification.", "success")
            else:
                # Simulated card
                from app.services.payments import create_payment, get_card_adapter, new_reference

                adapter = get_card_adapter()
                ref = new_reference("WS")
                result = adapter.charge(
                    amount_ttd=float(reg["price_ttd"]),
                    reference=ref,
                    meta={"workshop_registration_id": reg_id},
                )
                create_payment(
                    amount_ttd=float(reg["price_ttd"]),
                    method="card",
                    user_id=current_user.id,
                    workshop_registration_id=reg_id,
                    provider=result["provider"],
                    provider_ref=result["provider_ref"],
                    status="completed",
                )
                db.execute(
                    """
                    UPDATE workshop_registrations
                    SET payment_status = 'paid', status = 'confirmed'
                    WHERE id = ?
                    """,
                    (reg_id,),
                )
                db.commit()
                flash("Workshop payment confirmed (simulated card).", "success")
            return redirect(url_for("account.dashboard"))
        except PaymentError as exc:
            flash(exc.message, "error")
    return render_template("account/workshop_pay.html", reg=reg)


@bp.get("/workshops/<int:workshop_id>/content")
def workshop_content(workshop_id: int):
    if not user_has_access(current_user.id, workshop_id):
        flash("Purchase and confirmation required to access workshop content.", "error")
        return redirect(url_for("public.workshops"))
    db = get_db()
    w = db.execute(
        "SELECT * FROM workshops WHERE id = ?", (workshop_id,)
    ).fetchone()
    return render_template("account/workshop_content.html", workshop=w)


@bp.post("/cart/add/<int:product_id>")
def cart_add(product_id: int):
    cart = session.get("shop_cart", {})
    key = str(product_id)
    cart[key] = int(cart.get(key, 0)) + 1
    session["shop_cart"] = cart
    session.modified = True
    flash("Added to cart.", "success")
    return redirect(request.referrer or url_for("public.products"))


@bp.get("/cart")
def cart():
    cart = session.get("shop_cart", {})
    db = get_db()
    lines = []
    total = 0.0
    for pid, qty in cart.items():
        p = db.execute(
            "SELECT * FROM products WHERE id = ?", (int(pid),)
        ).fetchone()
        if p:
            lines.append({"product": p, "qty": qty, "line": p["price_ttd"] * qty})
            total += p["price_ttd"] * qty
    return render_template("account/cart.html", lines=lines, total=total)


@bp.post("/cart/checkout")
def cart_checkout():
    cart = session.get("shop_cart", {})
    items = [(int(pid), int(qty)) for pid, qty in cart.items()]
    method = request.form.get("payment_method", "bank_transfer")
    fulfillment = request.form.get("fulfillment", "pickup")
    try:
        order = create_order(
            user_id=current_user.id,
            items=items,
            fulfillment=fulfillment,
            payment_method=method,
        )
        if method == "bank_transfer":
            submit_bank_transfer(
                order_id=order["id"],
                user_id=current_user.id,
                amount_ttd=float(order["total_ttd"]),
                bank_reference=request.form.get("bank_reference", "PENDING"),
                bank_payment_date=request.form.get("bank_payment_date") or utcnow()[:10],
            )
        session.pop("shop_cart", None)
        flash("Order placed successfully.", "success")
        return redirect(url_for("account.dashboard"))
    except (BoutiqueError, PaymentError) as exc:
        flash(exc.message, "error")
        return redirect(url_for("account.cart"))
