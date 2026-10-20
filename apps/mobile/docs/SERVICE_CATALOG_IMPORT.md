# Replacement service catalog

`supabase/catalog/lady_j_services.json` is the complete supplied menu: 129 entries across 12 populated categories, with Specials intentionally empty. There are 110 primary entries (including five unpublished Makeup drafts) and 19 add-ons. Prices, category order and within-category order are preserved exactly; descriptions use inclusive, religiously neutral language. The two LED Light Therapy entries differ in price, description and booking role; they are separate services. Prices retain From, per-nail, per-toe and per-couple labels.

121 entries have exact integer-minute durations. Full Head Single Color and the five Makeup drafts display N/A where information was not supplied. Extra Length / Density and Nail Art retain the supplied `Varies` duration. Prices and durations are never fabricated in the interface.

Migration 033 imports all 129 records into `lj_service_catalog_intake`, keyed by deterministic source identity. The source is immutable to app roles: owners have read access, ordinary clients have no rows, and guests have no table permission.

Migration 036 publishes the supplied menu. It reuses identical category/name rows when possible, archives superseded or duplicate regular rows, and preserves appointment and payment history. Deterministic `catalog_source_key` values prevent duplicate imports. Existing owner-created Specials remain separate.

The client catalog shows the 124 publishable supplied entries in demand order plus the dedicated Free consultation: 105 standalone-bookable primary services, Full Head Single Color as a visible non-bookable service, and 19 visible non-bookable add-ons placed last in their categories. The five Makeup entries remain unpublished until their N/A prices and durations are provided. Add-ons cannot be selected in customer or owner booking flows and remain server-inactive until compatible parent rules are defined.

`node scripts/validate-service-catalog.mjs` validates counts, duplicate identities, category order, add-ons last, exact duration conversion, price labels/units and the matching intake SQL. `--write-intake` regenerates the standalone SQL from the source. Future source updates require a new migration rather than changing applied migration 033. `--require-ready` rejects incomplete publication prerequisites; it does not publish anything. `supabase/tests/service_catalog_intake.sql` tests replay, source constraints and owner/client/guest privacy in a rolled-back transaction.

Remaining catalog work is limited to owner-supplied Makeup prices/durations, the Full Head Single Color duration, add-on compatibility rules, and distinct licensed photos. Per-nail, per-toe and per-couple labels remain informational until add-on booking rules are implemented.

No branch URLs or keys are embedded in source. The catalog is active on the managed development branch. To make it available in production, deploy migrations 033–037 using **Supabase panel → Deploy to Production**.
