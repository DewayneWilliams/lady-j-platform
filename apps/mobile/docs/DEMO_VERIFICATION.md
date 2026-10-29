# Development demo verification

The Development Client/Owner workspace is available without interactive login. It reuses the existing automatic Development Test Owner session: the backend still authenticates and checks owner permissions. Production authentication, public-key configuration and production data were not changed or deployed.

## Remaining blockers and unverified features

- **OpenAI typed conversation: blocked.** The live server returned: “Typed chat is paused because the OpenAI account has no credits.” Fund the OpenAI account used by Maria. If replacing its key, select Development in the Supabase panel and update Secrets → OPENAI_API_KEY. No scripted reply was substituted.
- **Actual ElevenLabs audio conversation: unverified.** A valid short-lived token was issued and the existing agent accepted all 38 tools. Browser microphone input, audio output and a complete spoken confirmation were not exercised.
- **Physical iOS/Android runtime: unverified.** Metro successfully compiled an iOS bundle after the circular native fallback import was removed. The requesting HTTP check timed out before compilation finished; this is not evidence of a device runtime test. Expo Go does not include the required WebRTC modules. Use a compatible Pro simulator or a development/published build from Draftbit Publishing for native live voice.
- **Continuous browser/device switching: unverified.** Actual selector handlers and navigation destinations passed 20 Client/Owner round trips without a sign-in request. Browser captures independently opened both workspaces; interactive browser tooling was unavailable.
- **All UI workflows have not been exhaustively clicked.** Uploading private media/receipts, signing and downloading agreement PDFs, certificate/resource downloads, report exports, gift/referral writes, external email/WhatsApp delivery and AI product scanning remain unverified end to end. Their existing UI, authorization, consent, payment and validation requirements remain active.
- **Card processing remains unconfigured.** Existing bank-transfer/cash recording workflows were tested. No payment processor, false payment success or mock AI integration was added.

This is not a claim of 100% live-AI or physical-device verification.

## Implemented access and data

- The original selector styling is retained on client pages. Full-screen media galleries, sheets and viewers also provide it; switching dismisses those overlays.
- The existing automatic Test Owner session is retained when returning between Client and Owner, so Account and owner return actions do not redirect to login during Development testing.
- Original shared Action, Tag, ErrorBox, CatalogGallery and workshop-card implementations are restored only when the Development selector is enabled. Their previously hidden published appearance is preserved.
- The original 50 fictional active clients and 122 original demo calendar records are imported additively into Development, alongside demo payments, 12 vendors, 12 Backbar items, eight waitlist requests, two orders, two workshops, consultations and offers. Existing service/product data is retained. Original fixture source files were not reset or replaced.
- The additive seed never updates existing fixture rows. Verification records use clear DEMO labels; removals retain history where required. Verification also leaves a paid workshop attendance example and cancelled/completed appointment history.
- Maria's existing agent and confirmation dispatcher are extended, rather than replaced. Her 38 tools provide paginated reads, allowlisted creation/edit/removal, order fulfillment, workshop access/resources, inventory usage links, consultation workflows and existing gift/referral operations. Owner RPCs/RLS and business validation remain in force. She continues to address the owner as Jaycee.
- Complete proposal summaries are retained. Staged changes do not write business records until explicit approval; declined, stale and duplicate approvals are rejected.
- Relevant database defects found during testing were corrected: current VIP percentage compatibility, email outbox handling for manual contacts without accounts, and removed-service visibility under Owner RLS in Client Mode.

## Results

| Check | Result |
| --- | --- |
| TypeScript application check | Passed |
| Lint on changed source files | 0 errors, 400 warnings; predominantly inline-style advisories, plus existing unused imports/platform advisories and ignored server files |
| Focused automated tests | 10 passed |
| Live Development API/flow checks | 66 passed; OpenAI typed chat blocked by credits |
| Database seed repeatability | Repeated additive execution retained the original 50 active fictional clients and 122 original calendar records |
| Development/production guards | Development, Staging and Production configurations tested with and without Test Owner variables |
| Anonymous administrative API request | Rejected |
| Client/Owner selector handlers | 20 round trips passed without requesting authentication; registered routes reused |
| Real Maria CRUD | Service, product, workshop, client, vendor, Backbar, expense, discount and promotion creation/update/removal passed |
| Vendor purchase workflow | Creation, payment-state update and audited void passed |
| Appointment/payment workflow | Booking, rescheduling, deposit verification, balance receipt, completion and cancellation passed |
| Calendar conflicts | Block creation/removal passed; overlapping block rejected |
| VIP management | Approval and cancellation of a fictional request without an Auth customer passed |
| Consultation management | Scheduling, rescheduling and cancellation passed |
| Workshop access | Attendance update for a paid demo workshop passed |
| Business information | Reports, Royalty, gifts/referrals, settings, payments, consultations and paginated records accessible |
| Removed-service regression | Removed verification services absent from the Client catalog under Owner RLS |
| Web preview | Running; inspected Workshops, Account, Booking, Owner Business, Maria and private media, using light and dark captures; final captures had no console errors |
| iOS compilation | Metro compiled 4,121 modules; actual device runtime remains unverified |

## Development deployment and production

The updated maria-agent function and migrations 106–110 were applied only to the managed Development project. To roll out these shared backend fixes and agent tools later, use **Deploy to Production** in the Supabase panel. The demo seed is not a production migration and must remain Development-only. Provider secrets are configured separately per environment. No privileged database or provider key was added to application code.

## Exact files modified

- `/AGENTS.md`
- `/CLAUDE.md`
- `/README.md`
- `/components/salon/AccountScreens.tsx`
- `/components/salon/CatalogGallery.tsx`
- `/components/salon/CatalogScreens.tsx`
- `/components/salon/DevelopmentModeSelector.tsx`
- `/components/salon/OwnerScreen.tsx`
- `/components/salon/Shell.tsx`
- `/components/salon/media/ClientMediaGallery.tsx`
- `/components/salon/media/ClientMediaScreen.tsx`
- `/components/salon/media/MediaPrimitives.tsx`
- `/components/salon/media/MediaViewer.tsx`
- `/components/salon/owner/VendorSpendingPanel.tsx`
- `/components/salon/ui.tsx`
- `/docs/DEMO_VERIFICATION.md`
- `/docs/HISTORY.md`
- `/docs/INTEGRATIONS.md`
- `/lib/salon/SalonProvider.tsx`
- `/lib/salon/mariaTools.ts`
- `/lib/salon/mariaVoice.native.tsx`
- `/lib/salon/mariaVoice.tsx`
- `/lib/salon/mariaVoiceFallback.tsx`
- `/scripts/development-demo-seed.cjs`
- `/scripts/verify-development-demo.cjs`
- `/supabase/functions/_shared/maria.ts`
- `/supabase/functions/_shared/mariaManagement.ts`
- `/supabase/migrations/106_lady_j_vip_percentage_compatibility.sql`
- `/supabase/migrations/107_lady_j_manual_appointment_reminders.sql`
- `/supabase/migrations/108_lady_j_maria_complete_confirmation.sql`
- `/supabase/migrations/109_lady_j_manual_contact_notifications.sql`
- `/supabase/migrations/110_lady_j_removed_service_visibility.sql`
- `/tests/salon-demo-access.cjs`

