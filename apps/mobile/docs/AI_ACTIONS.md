# Authorized UI and action contract

Lady J exposes predictable, accessible workflows for assistive and agentic navigation without granting extra authority.

- Client routes: `/home`, `/services`, `/boutique`, `/workshops`, `/contact`, `/account`, and `/booking`.
- Owner route: `/owner?tab=Today|Calendar|Clients|Business|Maria`. Owner tabs remain protected by `lj_is_owner()` and server-side RPC checks.
- Shared buttons expose their visible action as `accessibilityLabel` and a deterministic `action-*` or `owner-action-*` test ID. Shared fields expose Title Case labels and deterministic `field-*` IDs.
- Booking follows service selection, server-provided availability, then agreement/payment. Never infer a slot or bypass the availability RPC.
- Protected writes use the existing Supabase RPCs. Client, appointment, service, purchase and media identifiers passed to PostgreSQL must be UUIDs from live responses; development demo identifiers never leave in-memory Test Mode.
- Client media uses `lj_media_begin`, private Storage, `lj_media_finish`, and `lj_media_change`. `allow_owner` is off for client uploads and is checked again for metadata reads, signed object reads and owner writes.
- Login-free Test Mode is DEVELOPMENT-only, labeled, and in-memory. It does not grant a Supabase session, owner role or write permission.

Agents must confirm destructive actions, preserve the displayed user/record context, surface server errors, and never claim completion until the server response succeeds.

Maria (live Owner mode) follows these rules through `maria-agent`: allowlisted typed tools only, no model-produced SQL, hash-bound single-use confirmation for every change, owner re-check on every request, and read-back verification before she reports completion. See `docs/INTEGRATIONS.md`.
