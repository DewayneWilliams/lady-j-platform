# Lady J Platform

Premium private salon, workshop, and product platform for **Lady J Salon & Day Spa** (ladyjglobal.com).

## Stack

- Python & Flask
- SQLite (local / Lightsail-compatible)
- HTML, CSS, vanilla JS
- Flask-Login authentication

## Local preview

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python wsgi.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

Default owner (override in `.env`):

- Email: `owner@ladyjglobal.com`
- Password: `ChangeMeImmediately!`

## Tests

```bash
pytest -q
```

## Features (upgrade branch)

- Draftbit-matched mobile tabs: Home, Services, Products, Workshops, Contact, Account
- Public site: Home, Services, Products, Workshops, About, Contact, Book
- Exactly **3 booking steps** with deposit, bank/card adapters, cancellation policy
- Private client accounts (no social feeds)
- Owner dashboard: Today | Calendar | Clients | Business | Maria
- Workshops and product checkout with inventory lock
- Maria bilingual assistant (local commands + AWS stubs)
- Design tokens: pink `#E75480`, gold `#C9A227`, warm white, blush, charcoal

See `docs/UPGRADE_PROGRESS.md` for status.

## Production notes

Do **not** push, deploy, or change Lightsail / Route 53 without explicit authorization.  
Never commit `.env` or secrets. Back up the production database before applying migrations.
