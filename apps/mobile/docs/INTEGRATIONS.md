# Integration requirements

## Database and owner setup

Migrations are applied only to the connected Draftbit-managed development branch. The user must click **Deploy to Production** in the Supabase panel to merge schema changes. Fetch the current connection through Draftbit tools; never reuse branch refs. Set production/staging public Supabase environment values to their corresponding deployed environment. Configure email confirmation and redirect URLs in Supabase → Authentication before public release. The app uses password sign-in after email verification and PKCE browser sessions for configured social providers. Sessions persist in browser local storage on web and chunked Expo SecureStore on native, with foreground token refresh.

There is no self-service owner role. Verify the owner-provided email against a confirmed `auth.users` record and insert that user's ID into `lj_owners` through a trusted connection. Never derive ownership from editable auth metadata. Ordinary users cannot write this table. Every direct owner operation uses RLS; payment/refund/manual booking RPCs also call `lj_is_owner`.

`lj_available` requires an authenticated account and returns only available start times. `lj_book` validates authenticated identity, active services, server prices/durations, policy acceptance, a ready unused signed agreement matching the services, Tuesday–Saturday 10:00–18:00 in America/Port_of_Spain, and overlap using an exclusion constraint. A concurrent conflicting request fails atomically. Pending requests reserve time until the owner cancels or completes them; automatic unpaid-request expiry is not configured.

`lj_checkout` locks inventory/workshop records, derives totals on the server, reserves stock/capacity and records pending bank transactions. Owner verification is required for confirmed status. `lj_cancel_unpaid_purchase` locks the order and its transactions, rejects received payments, voids pending transactions and restores reserved product stock exactly once; cancelled workshops release capacity. It never claims to refund transferred money. Paid orders require owner reconciliation. `lj_update_transfer_reference` lets a customer edit only their pending bank reference without confirming payment. Financial changes require confirmation in the UI.

`lj_cancel` records full refund eligibility at 24+ hours, or retains the verified deposit under 24 hours. Management may offer 50% of the deposit as future credit; it is not automatically issued. It never claims to transfer funds. `lj_record_refund` records a bank refund after the owner confirms completion. Credits are an issued ledger; redemption is handled with owner assistance. After Service complete, the owner can record the exact received cash/bank balance through `lj_complete_appointment_payment`; this inserts a timestamped receipt without charging a card. No-show deposits remain retained by salon policy.

## Customer sign-in setup

Use the Supabase panel environment selector to configure the intended development or production environment. Email sign-in and sign-up are currently enabled; Google, Facebook and Apple are currently disabled.

1. **Authentication → Sign-in methods / Providers:** enable Google, Facebook and Apple using the merchant's provider application credentials. Follow the callback URL displayed by the selected provider in this panel; use that exact Supabase callback in the corresponding provider configuration. Apple also requires its provider signing credentials. Do not put provider secrets in public app environment variables.
2. **Authentication → Redirect URLs / URL Configuration:** set Site URL to the published app origin and allow each relevant app callback:
   - Development preview: `https://1cd79b1a7c.sandbox.draftbit.dev:5101/auth/callback`.
   - Published staging: `https://fd7e56a016.draftbit.dev/auth/callback`.
   - Published production: `https://dc521c9ec4.draftbit.dev/auth/callback`.
   - Native Preview and published build: `lady-j://auth/callback`. The in-app authentication session captures this stable callback and returns it to the same presenting app; do not replace it with an `exp://` launcher URL.
3. Keep the actual browser origin consistent: web computes its callback from the current origin, while native derives the stable callback from the configured app scheme. If a preview or published web hostname changes, allow its `/auth/callback` URL in the selected environment. Do not hardcode temporary Supabase branch URLs in the app.

The sign-in screen checks Supabase's public Auth settings and automatically enables configured provider buttons. Web uses a separate browser popup, which must be allowed; the callback completes on the same origin and the parent exchanges the one-time code with its PKCE verifier. Native uses Expo WebBrowser and the configured app-scheme callback, with a cold-start callback recovery route. Sessions survive reload/closing; signing out removes the stored session even when remote revocation is unavailable. Browser environments that deny storage use an in-memory fallback. A cancelled or failed provider flow never claims success. The social flow never grants owner access.

The `lj_public_*` views expose active catalog descriptions, imagery and prices plus public contact settings. They retain explicit column allowlists and active filters; base catalog table SELECT and availability execution remain denied to anonymous roles. Marketing is separate from authentication; profiles default false and the database timestamps changes. No marketing messages are sent until communication providers are configured.

## Card processor

Select a merchant-approved provider that supports the salon in Trinidad & Tobago, settlement currency and required TTD checkout. Use a hosted checkout; never collect PAN/CVV. Implement `CardCheckoutGateway` behind an authenticated server endpoint. It must calculate amounts from database records and bind every checkout to its owner/customer and pending transaction. Use idempotency keys and authenticated, signature-verified webhooks; only verified processor events may mark card transactions paid. Do not let a return URL or client-supplied boolean verify payment. Refunds need signed provider calls and a reconciled audit trail. Provider secrets belong in Supabase Edge Function Secrets or unprefixed server environment variables.

Until configured, card selection is disabled and bank transfer is the default customer payment method. The old simulation branch cannot be selected from normal customer checkout and creates no records. Bank transfers are real unpaid requests, manually verified through an owner-only RPC.

## Maria voice (future integration)

Maria currently provides labeled bilingual keyword guidance and shortcuts to reviewed workspace forms. The circular Talk to Maria control is restored but unconnected and records no audio. OpenAI Realtime is planned for later work; no OpenAI integration is active. `createMariaAdapter` and its unused `TrustedMariaGateway` remain contracts for a future authenticated owner integration; provider credentials must remain server-side.

A future conversational provider may propose only allowlisted typed actions against salon data. Fetch authoritative database records for context, minimize personal information, and never execute model-produced SQL. Bind destructive/financial/bulk plans to expiring, single-use confirmation IDs with hashes of the reviewed payload; re-check permissions on execution. The client adapter refuses destructive execution without a confirmation ID and requires an authoritative execution receipt. Confirmation enforcement and execution must also happen on the server. The current Maria UI provides labeled bilingual keyword guidance and shortcuts to actual workspace tools. It does not record audio, call an AI provider or perform AI actions. All changes happen through the relevant reviewed forms and server operations.

## WhatsApp and email

Transactional email uses `lj_message_jobs` and the `lj-send-reminders` Edge Function. Calendar, purchase and receipt triggers queue requests, confirmations, deposit reminders, 24h/2h reminders, cancellations, waitlist openings, order updates, payment receipts and after-visit thanks. Historical confirmations are not replayed. Service recipients come from verified Auth account email, never an editable client-supplied destination. Appointment notes, health data and card details are excluded. Marketing and birthday campaigns remain off.

Configure the intended environment in **Supabase → Secrets**:

- `RESEND_API_KEY`: the salon's Resend sending API key.
- `LJ_EMAIL_FROM`: a sender address on the salon's verified Resend domain, optionally `Lady J <bookings@your-verified-domain>`.
- `LJ_APP_URL`: that environment's published HTTPS app origin, without a path, so account links reach the correct app.

Then use **Business → Communication → Turn on email reminders**. Activation requires owner authorization and generates a scoped worker key in Vault with the current environment's Edge Function URL; no development URL is baked into a migration. Activate separately after production deployment or a fresh development branch. Five-minute `pg_cron` scheduling invokes the function only when enabled and work is due. Pause delivery from the same screen. Never put provider credentials in public app variables.

Jobs use database leases, per-message provider idempotency keys, frozen request payloads, up to five attempts and a retry window shorter than 24 hours. Old, cancelled or rescheduled appointments are checked before sending; stale jobs are cancelled. Failed or exhausted deliveries require owner review. Provider acceptance is shown separately from inbox delivery; bounce/delivery webhooks are not connected. No live provider send can be verified until the salon supplies a valid sender/key.

WhatsApp buttons open a reviewed composer and do not send automatically. WhatsApp Cloud API sender/template approval and a dedicated provider worker are still required for automated WhatsApp. Promotions/birthdays require explicit, revocable marketing consent and are not sent by the service-email worker.

## Workshops and media

Workshop formats are In person and Online only. Owner-managed resources are stored in `lj_workshop_resources`, with access restricted to paid purchasers. Use private storage and expiring signed URLs for sensitive materials rather than unrestricted public assets. Attendance/completion and individual certificate links use purchaser-protected `lj_attendance`. A workshop-level certificate link is not used as proof of individual completion. Live/video hosting, background downloads and certificate generation are external integration requirements; links work when the owner supplies them.

## Launch content

Replace the explicitly labeled catalog/prices/stock and inspiration gallery with approved salon content. The approved salon address is configured. Add the support WhatsApp number, other contact details, bank instructions, delivery fee and real workshop schedules/resources. Review legal notices, refund/returns terms, product ingredients and delivery areas. Loyalty calculations, private photo storage, automated analytics exports and WhatsApp/marketing delivery are not operational. Transactional email delivery stays paused until its provider is configured.

The development-only `ladyj-verification-recovery` diagnostic is retired: JWT verification is enabled, it returns 410 and has no database access. The app never calls it.

## Signed consent

`lj-sign-agreement` authenticates the bearer token with Supabase Auth, calls `lj_sign_service_agreement` for authoritative policy text/signature/date, generates a PDF with pdf-lib, uploads through the service role and marks the record ready. Platform JWT verification is disabled only because the function performs its own real token validation. Supabase-managed server environment values supply credentials; no private key enters the app. `lj-service-agreements` is private, with authenticated RLS read access for the signing client or owner. Client download URLs expire after 60 seconds. The function and migration 010 must be deployed with the development branch before production bookings use the new gate.

Screen capture blocking and privacy covers are removed on all platforms. The legal Privacy notice remains available.

Catalog media uses the public `lj-catalog-media` bucket with owner-only writes and a 5 MB JPEG/PNG/WebP limit per image. Do not upload private client photos here. Stored object paths resolve against the current Supabase environment. WhatsApp links open a composer from an international number; there is no WhatsApp contact-list import or automatic contact/message synchronization. Registered app profiles create private directory records automatically.

## Waitlist and expenses

Authenticated customers can save up to ten upcoming date/service waitlists. Cancellation of a reservation or time block checks whether a sufficient slot exists and queues a time-limited email invitation; it does not reserve a slot. Normal availability, booking, payment and signed-consent rules still apply. Matching signed bookings mark the waitlist booked; clients can leave their own waitlists and owners can remove requests.

`lj_expenses` is owner-only. Monthly expenses and net recorded receipts produce a cash overview, not profit, tax, payroll or inventory valuation. Expense CSV escapes spreadsheet formulas. The owner attention list derives tasks from authoritative loaded records without executing financial changes.

## Owner contacts and custom appointment discounts

Migrations 016–017 add private guardian fields, contact removal tombstones and a receipt-aware appointment discount RPC. Account DOB fills missing CRM DOB and identifies minors without requiring owner-only guardian fields during customer registration. Owner edits of minor contacts require guardian name, relationship and phone. Recording guardian details does not replace service consent. Confirmed removal hides the salon contact without deleting the account, appointments or financial history; subsequent profile sync does not recreate it.

`lj_discount_appointment` locks the appointment, validates owner authorization and the reviewed total, preserves verified receipts and prevents discounts below funds received or changes to fully settled visits. Purchase discounts retain their pending-only rules. Maria’s circular talk control records no audio; OpenAI Realtime is a future integration, not connected functionality.

Catalog removal uses migration 018 and the owner-only `lj_delete_catalog_item` RPC. Deploy it through the Supabase panel before using the published owner catalog. Removed rows are inactive and retained with `deleted_at`; historical purchases, booking snapshots and workshop resource access remain intact.

Calendar activity and recurring blocks require migrations 019–020. Deploy through the Supabase panel. The Realtime publication includes `lj_calendar` and the authenticated-read-only availability revision; subscribers use the revision instead of broadcasting owner notes or client identities. `lj_save_calendar_block` is idempotent for creates and checks owner role, overlap, recurrence bounds and Other descriptions. Block edits/deletes use an expected update timestamp, preserve history, and can apply to one occurrence or its future series.
