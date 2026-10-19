# Lady J Platform — Upgrade Progress

**Branch:** `development/native-app-modernization`
**Started:** 2026-10-17  
**Directive:** Enhance existing Flask application; preserve repo, Lightsail, Route 53, and production data. Work locally — no push/deploy without authorization.

---

## Audit Summary (Baseline)

| Area | Status before upgrade |
|------|------------------------|
| Stack | Flask + vanilla HTML/CSS/JS (7 tracked files) |
| Public UI | Single-page hero + 4-step booking (client-side) |
| Backend | SQLite `bookings` table; `/booking` template missing; UI never POSTed |
| Auth / Admin | None |
| Workshops / Boutique / Maria | None |
| Deploy configs | None in repo (Lightsail/DNS external) |
| Design | Magenta/gold/cream custom CSS; no dark mode |

**Preserved:** Service catalog, Tue–Sat 10 AM–6 PM rules, brand photography, WhatsApp contact, First Citizens bank details, Flask stack, GitHub remote.

---

## Official Design Tokens

| Token | Value |
|-------|-------|
| Elegant Pink | `#E75480` |
| Luxury Gold | `#C9A227` |
| Warm White | `#FFFCFA` |
| Soft Blush | `#FFF2F6` |
| Charcoal | `#222222` |

Owner dashboard: body 18px, details 20–24px, headings 26–32px, buttons 17–19px, touch targets ≥48×48px. Adjustable text-size + light/dark/system themes.

---

## Checklist

### Phase 0 — Foundation
- [x] Audit existing repository
- [x] Create feature branch
- [x] Create `docs/UPGRADE_PROGRESS.md` + `docs/ARCHITECTURE.md`
- [x] `requirements.txt` + `.env.example`
- [x] App factory, configuration, database schema
- [x] Seed demo services (non-destructive)

### Phase 1 — Design system
- [x] Unified pink/gold tokens + light/dark modes
- [x] Shared public / account / owner layouts
- [x] Responsive nav (mobile menu + desktop)

### Phase 2 — Public site
- [x] Home | Services | Products | Workshops | About | Contact | Book
- [x] Draftbit-matched fixed mobile navigation with safe-area spacing
- [x] Premium homepage composition (brand-first hero)

### Phase 3 — Booking (exactly 3 steps)
- [x] 1. Select Your Service (+ AI photo guidance)
- [x] 2. Choose Your Date & Time (America/Port_of_Spain)
- [x] 3. Secure Your Appointment (deposit / card / bank)
- [x] Server-side overlap validation

### Phase 4 — Auth & private accounts
- [x] Email/password (OAuth stubs for Google/Apple/Facebook)
- [x] Client account: appointments, workshops, orders, profile

### Phase 5 — Owner dashboard
- [x] Mobile: Today | Calendar | Clients | Business | Maria
- [x] Large readable controls; text-size preference
- [x] Appointments, services CSV import, workshops, boutique, payments, settings

### Phase 6 — Workshops & Products
- [x] Live/recorded/hybrid workshops, registration, protected content
- [x] Product catalog, cart, checkout, inventory lock

### Phase 7 — Payments & CRM
- [x] Card adapter (simulated) + bank transfer verification
- [x] 50% default deposit; cancellation policy + credits ledger
- [x] Client notes, allergies, credits, audit log, analytics from DB

### Phase 8 — Maria AI
- [x] Local command handler + AWS Transcribe/Bedrock/Polly stubs
- [x] Confirmation for destructive / financial actions

### Phase 9 — Verification
- [x] Unit/integration tests (`pytest` — 10 passed)
- [x] Local preview docs in README
- [x] No secrets committed; no production deploy

---

## Local preview

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python wsgi.py
```

- Site: http://127.0.0.1:5000  
- Owner: `owner@ladyjglobal.com` / `ChangeMeImmediately!` (change in `.env`)

---

## Limitations / next hardening

- Card payments use **simulated** adapter until a T&T-verified processor is chosen
- OAuth and AWS Maria voice are prepared but inactive without credentials
- Legacy `templates/index.html` + `static/app.js` / `style.css` retained for reference; new UI is Jinja + `static/css/*`
- Production Lightsail cutover, HTTPS cookies (`SESSION_COOKIE_SECURE`), and DB backup not performed (requires authorization)
- Browser visual QA at every breakpoint should be done manually before deploy

---

## Deployment Notes (Do Not Apply Without Authorization)

- Existing GitHub remote: `origin` → DewayneWilliams/lady-j-platform
- AWS Lightsail + Route 53: **unchanged** in this branch
- Database: local SQLite (`instance/ladyj.db`) for development
- Env vars: see `.env.example` — never commit `.env`

---

## Change Log

| Date | Change |
|------|--------|
| 2026-10-17 | Audit complete; feature branch created; full platform upgrade scaffolded and tested locally |
