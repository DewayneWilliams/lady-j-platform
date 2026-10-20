# Owner workflow completion criteria

| Item | Completion criterion |
| --- | --- |
| 1 | Add Appointment labels its date selector Date and its time selector Time. |
| 2 | Successful Service Complete chooses an uplifting message without an immediate repeat; it lasts 10 seconds or ends on the next owner action. The licensed 6.8-second brass/timpani fanfare is preloaded and plays once with the message. A newer celebration supersedes pending/playing audio without overlap. System volume, silent mode and output routing remain device-controlled; backgrounding/unmount stops playback. Confetti retains its existing behavior. |
| 3 | Today’s Appointments legend is horizontally centered. |
| 4 | Human full dates use Month Day, Year in salon time. API values, IDs and export filenames retain ISO formats; month-only calendar headings retain Month Year. |
| 5 | Reports use scrolling January–December and separate Year wheels; those values drive the existing CSV/PDF period calculations. |
| 6 | Client Service History initially shows only Date and Service; tapping a row toggles its details. |
| 7 | Maria’s bottom-nav wave animates continuously without moving the tab. Reduce Motion presents a static wave. It records no audio. |
| 8 | Calendar actions are centered in equal-width columns, stretch to equal height, and open the existing appointment/block editors. |
| 9 | Dates show only the colors present among booked client appointments, once per color, centered with no empty outlines or reserved dot positions. Empty dates and dates containing only blocks show no appointment dots; blocks remain in the agenda. Creation, rescheduling, status changes, cancellation and deletion recompute dots through the existing refresh/Realtime path. |
| 10 | Add Client omits Phone, retains WhatsApp Number, and centers its heading. Existing saved phone data is retained. |
| 11 | Record Payment is centered, accepts a confirmed cash/bank receipt without a typed reference, and generates the receipt reference on the server. Payment Received lasts 7 seconds or until the next owner action. |
| 12 | A saved appointment discount appears immediately above Balance Due in the finance rows. |
| 13 | Custom discount input starts blank; equal 5%, 10%, 15%, 20%, 25% controls remain on one row and populate it. |
| 14 | Custom percentages allow 0–100 with at most two decimals; above 25 opens the exact confirmation question with Cancel/Confirm. Cancellation never saves. Receipt floors, stale-total checks and owner authorization remain enforced. |
| 15 | Appointment/contact actions use Message Client and an equal 2×2 contact menu. Saved, country-coded numbers determine URLs. Missing numbers and unsupported phone handlers are handled explicitly. WhatsApp Call opens the chat; the owner taps Call within WhatsApp because its chat links cannot initiate a call. |
| 16 | Home ends with Client Experiences, its requested subtitle and Verified Google Reviews. Only Google Places responses populate cards. Names, ratings, dates, complete text, author/source links and attribution are preserved. Empty/error states never invent reviews. |

## Responsive behavior

At 320–430px, discount presets stay in one five-column row; contact actions stay in two equal columns and two rows; calendar buttons remain side by side and share their content-driven height. Text wraps without ellipses. Lists and wheels scroll within their existing safe-area layouts. The centered calendar action group is at most 560px wide on desktop. The review carousel shows one card below 650px of available section width, two at 650–959px and three at 960px+, with swipe/scroll and accessible previous/next controls. Review text remains complete. Existing navigation breakpoints and light/dark tokens are retained. Browser reloads of navigator-generated owner tab paths recover the selected view through the same owner guard.

## Google reviews connection

Set `GOOGLE_PLACES_API_KEY` in Supabase → Secrets for the selected environment. The public business identity is fixed in `supabase/functions/_shared/googleBusiness.ts`: Place ID `ChIJk5TIZ9QJNowRU6Qz7RKxctg`, Lady J Salon & Day Spa, On My Way Plaza, Petit Valley. Both supplied Google links resolve to this listing; the `/review` link opens review submission, while the homepage button opens its Maps profile. The profile link remains available without provider credentials or when the function is unavailable. The key must authorize Places API (New) Place Details including reviews, with billing/quota restrictions configured in Google Cloud. The function rejects responses for any other Place ID. The app invokes `lj-google-reviews`; the function validates the app’s project API key before billable calls. Provider keys never reach the app. Reviews are not cached or stored. Google supplies a selection of reviews; no scraping or generated testimonials are used. The public Privacy/Terms pages link Google policies.

Migration 032 and `lj-google-reviews` must be deployed through the Supabase panel for production. Verified owner assignment in `lj_owners` remains required for live administrative actions. Contact app launches require the corresponding apps/handlers on the actual device.
