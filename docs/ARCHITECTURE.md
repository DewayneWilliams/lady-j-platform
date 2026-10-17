# Lady J Platform — Architecture

## Preserve

- GitHub remote `origin` (DewayneWilliams/lady-j-platform)
- AWS Lightsail hosting and Route 53 DNS (unchanged in this branch)
- Flask application stack
- Existing service catalog pricing/durations from the prior `static/app.js` menu
- First Citizens bank transfer details
- WhatsApp contact number
- Storefront photography

## Application layout

```
app/
  __init__.py          # create_app factory
  db.py                # SQLite schema + audit log
  seed.py              # Non-destructive catalog + owner bootstrap
  models_user.py       # Flask-Login user
  routes/              # public, auth, booking, account, owner, api
  services/            # hours, booking, payments, boutique, workshops
  ai/                  # Maria + photo recommendations
templates/             # Jinja layouts
static/css/            # design tokens + layouts
wsgi.py                # entrypoint
```

## Auth

- Email/password via Flask-Login + Werkzeug hashes
- Roles: `client`, `staff`, `owner`
- OAuth routes for Google / Apple / Facebook are stubs until credentials exist

## Booking

1. Select services (+ optional AI photo guidance)
2. Date & time (Tue–Sat, 10–18, America/Port_of_Spain)
3. Deposit / payment + policy acceptance

Server-side overlap checks against appointments and blocked times.

## Payments

- `SimulatedCardAdapter` until a Trinidad & Tobago–verified processor is configured
- Bank transfers → `awaiting_verification` → owner approve/reject
- Default deposit 50% (owner-configurable)
- Cancellation: 24h+ refund eligibility; &lt;24h 50% credit / 50% retained; no-show forfeited

## Maria

- Local command parser for availability, today, revenue, client search, cancel/verify (with confirmation)
- AWS Transcribe / Bedrock / Polly hooks prepared via environment variables

## Data safety

- Seed never overwrites existing service slugs or customer rows
- CSV import skips duplicates
- Secrets only via `.env` (see `.env.example`)
