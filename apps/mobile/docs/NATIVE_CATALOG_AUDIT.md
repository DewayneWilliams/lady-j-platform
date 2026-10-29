# Native catalog and booking investigation

**Overall status: BLOCKED.** Targeted technical repairs are implemented and available checks pass, but the entire requested physical-phone restoration is not verified. Some requested content is deliberately absent from the current approved source and cannot be restored without approving that visual change.

**NATIVE DEVICE VERIFICATION NOT COMPLETED.** No physical iPhone/Android device or interactive native simulator was available. No claim is made that the recurring device-only symptom is fully explained or resolved. The phone's launch method, installed build revision, runtime logs and target environment remain unconfirmed.

## Demonstrated causes and repairs

| Finding | Evidence | Correction |
| --- | --- | --- |
| Booking could remain completely blank after a failed font download | Original `components/salon/BookingScreen.tsx` imported Playfair 400 from `@expo-google-fonts/dev` (a Google network URL) and returned null until loaded, ignoring font errors | Load the already installed local Playfair 400 asset in `app/_layout.tsx` with the existing root font handling; remove the screen-level network gate |
| Linked service was never selected | `requestedServiceId` was read but never consumed in the original BookingScreen | Apply an existing bookable service once, after persisted bag hydration; do not re-add it after the client removes it |
| Delayed bag hydration erased newer choices | Provider assigned saved arrays/cart directly after asynchronous storage read | Validate stored values and merge them with current selections |
| Older native writes could overwrite newer selections or resurrect removed state | Fault-injection tests paused the first SecureStore chunk write; the second write/removal finished first, then the old manifest replaced it | Serialize reads/writes/removals per storage key, retaining existing format and chunk storage |
| Switching between signed-in identities cleared catalogs without reloading | Catalog reload callback depended only on the Boolean signed-in status, while identity changes cleared arrays | Reload per customer identity; retain always-public service records while private account state is cleared |
| One failed result prevented subsequent successful sections from applying | Anonymous promotions returns HTTP 401, `permission denied for function lj_is_owner`; old sequential result processing stopped before homepage specials | Settle and validate sections independently; retain prior service/product values on errors or malformed responses and retain the reported error |
| Incomplete fields reached rendering unchecked | Existing `asRows` only checked array shape and treated null as empty | Shared required-field validation for Client and Owner service/product retrieval; image-load errors are logged by shared Photo and booking thumbnails |

Original source reference: `1c3ef21`. The new regression script can compare behavior against that revision. No Git commit or push command was issued by this investigation; the Draftbit workspace records edits automatically.

The local and original remote Playfair 400 font files are byte-for-byte identical: SHA-256 `861f838d481d28cbbd4793e45dc02f01d04c81e06ed98ab2779ca152ace9f27b`. No font face or weight was substituted.

## Service, product and booking data flow

- Client Services and Booking consume `lj_public_services`; Products use the existing public/signed-in queries. Existing prices, durations, descriptions and image identifiers remain unchanged. Owner management retains its owner-authorized base-table queries and adds field validation.
- Booking continues to derive full service records from the provider's selected IDs. The same selection feeds duration, quote requests, bottom summary and Step 3. Bag services/products continue to resolve IDs against the loaded catalogs. Server quotes and checkout RPCs were not changed.
- The summary component was tested with 0, 1, 2 and 5 services at Steps 1, 2 and 3: thumbnail bindings, supplied totals, duration and Back/Next visibility pass. This is JavaScript component-output verification, not native layout measurement or payment execution.
- A cold web visit with a real development service ID selected that service and displayed its photograph, count, 15-minute duration and zero price in both themes. This was the existing DEVELOPMENT demo mode, not a live transaction.
- The approved summary has no selected-service name or description elements. They were not added. Step 3 already has names/photos/durations/prices, but was not exercised interactively.

## Supabase and images

The current managed connection was retrieved, and the connected MCP URL matched its development project. All SQL/API/storage inspections targeted development. No production requests, writes, migrations, Edge Function deployments or security-policy changes were performed.

- Public service and product queries returned HTTP 200: 129 service rows and 59 product rows. All had names, descriptions, prices and image identifiers; no invalid service durations were found. These are current query results, including existing catalog/demo inventory, not newly created content.
- Public workshops, settings and homepage-specials queries also returned 200; homepage specials was legitimately empty.
- All 315 referenced catalogset variants (1200/1800/2400 pixels) existed and returned HTTP 200 with image content types. Remaining service/product image identifiers resolved to existing bundled assets. No signed URLs are used for these public catalog photos.
- Existing anonymous `lj_promotions` permission failure remains. It is now isolated from successful sections; its RLS/function permissions were deliberately not altered.
- Environment registry exposes `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only for DEVELOPMENT. Missing staging/production entries are a publishing configuration blocker, not proof of the cause on an unidentified physical build. Production catalog contents, deployment parity and credentials were not tested.

Before publishing to another environment, configure its intended Supabase URL and publishable key in the app's environment variables. Obtain the appropriate environment's values in Project resources → Supabase → Database/connection details and API Keys. Do not copy development credentials into production. No new Supabase deployment is needed for this repair because no schema/functions changed. Deliver updated native apps through Draftbit Publishing.

## Verification and limits

| Check | Result |
| --- | --- |
| Focused regression suite | 10/10 pass; seven checks fail against original source (three unchanged/helper checks pass) |
| Type check | Pass |
| Changed-file lint | 0 errors; existing inline-style/unused-component warnings plus two diagnostic console warnings; final focused helper/storage/test lint passes |
| Expo Doctor | 20/20 pass; no dependency changes required |
| Native exports | Both iOS and Android Hermes bundles exported successfully, including the local font; not binaries or device tests |
| Web route captures | Services light, Products dark, Product detail dark, Booking Step 1 light/dark, empty Bag light, Owner Today demo light |
| Native device/simulator execution | Unavailable; no devices/builds actually tested |
| Live authenticated Owner catalog, appointment management and checkout | Source inspected; not interactively exercised |
| Booking Steps 2–3 and checkout | Source and summary-output tests only; no completed booking/payment |
| App restart / persistence | Storage fault-injection and delayed hydration tests; no actual native restart |
| Font scaling and small-device layout | Existing attributes preserved; no native accessibility/font-scaling test |
| Bottom navigation | Client/Owner source and visible web tabs inspected; no automated taps or native interaction; existing Workshop label truncation visible at 390px retained under design restriction |
| Preview | Running; existing promotions 401 persists; no new catalog-image failures observed in captures |

No interactive browser tool was available for clicking through authenticated screens. Capture tools open isolated browsers, so the empty Bag capture does not prove populated cart/checkout interaction.

A standalone test using the installed React Native Yoga source did not reproduce the suspected compact-summary flex collapse (36px information row with and without an auto basis). No flex, clipping, size, overflow or safe-area patch was applied on that hypothesis. It does not establish correctness of every native layout.

## Design preservation and blockers

All existing JSX styling attributes in changed screen/UI files were compared with the original revision: style, className, contentContainerStyle, size, color, numberOfLines, maxFontSizeMultiplier and resizeMode are unchanged. Shared service/product cards, Shell, floating bag, commerce screens and both navigation implementations are unchanged. No dimensions, typography values, colors, icons, spacing, animations, business rules, database records or security policies were changed. No fake information or new demo content was introduced.

There is no before/after native screenshot comparison, so exact device visual identity is not claimed.

The current source deliberately hides UI on **all** platforms:

- `components/salon/CatalogGallery.tsx:24` returns null. History `c15d761` explicitly hid catalog photos. Product-detail gallery photos therefore remain absent.
- `components/salon/ui.tsx:231` returns null for Action. History `886245f` explicitly hid shared buttons; this includes purchase/booking actions that still call Action.
- Tag and ErrorBox also return null. Existing error state is now additionally logged, but restoring error banners or tags would change visible UI.
- `BookingSummaryBar` contains stacked photos, count, duration, estimated total and navigation controls; it never renders names/descriptions. Adding those fields changes the approved contents.

These specific repairs are stopped pending approval of their visual restoration. This source differs from the premise that every requested field already appears in the current web design. Layout patches cannot restore components that return null, nor verify which revision is installed on a phone.

## Complete modified-file list

- `app/_layout.tsx`
- `components/salon/BookingScreen.tsx`
- `components/salon/OwnerScreen.tsx`
- `components/salon/ui.tsx`
- `lib/salon/SalonProvider.tsx`
- `lib/salon/catalogData.ts`
- `lib/salon/images.ts`
- `lib/salon/sessionStorage.native.ts`
- `lib/salon/shoppingBag.ts`
- `scripts/verify-native-catalog.cjs`
- `AGENTS.md`
- `README.md`
- `docs/HISTORY.md`
- `docs/NATIVE_CATALOG_AUDIT.md`
