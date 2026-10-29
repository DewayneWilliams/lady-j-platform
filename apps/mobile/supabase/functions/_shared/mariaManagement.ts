import type { Tool, Ctx } from "./maria.ts";

type Data = Record<string, any>;
type Definition = { table: string; fields: string[]; required: string[]; defaults?: Data; remove?: string };

// The same owner tables and removal RPCs used by the dashboard. Never accept a table
// name, role, customer identity, SQL expression or arbitrary RPC from the model.
const records: Record<string, Definition> = {
  service: { table: "lj_services", fields: ["name", "category", "description", "duration", "price", "active", "bookable", "catalog_visible", "price_kind", "price_label", "duration_label", "price_unit", "is_add_on", "requires_owner_approval"], required: ["name", "category", "duration", "price"], defaults: { description: "", image: "hair", active: true, is_demo: false }, remove: "catalog" },
  product: { table: "lj_products", fields: ["name", "brand", "category", "description", "price", "stock", "reorder_level", "active"], required: ["name", "category", "price"], defaults: { description: "", image: "body", stock: 0, active: true, is_demo: false }, remove: "catalog" },
  workshop: { table: "lj_workshops", fields: ["name", "description", "instructor", "starts_at", "duration", "price", "capacity", "format", "active"], required: ["name", "instructor", "price"], defaults: { description: "", image: "workshop", duration: 120, capacity: 12, format: "In person", active: true, is_demo: false }, remove: "catalog" },
  client: { table: "lj_client_records", fields: ["first_name", "last_name", "full_name", "email", "phone", "whatsapp_phone", "birthday", "preferences", "sensitivities", "private_notes", "is_minor", "guardian_name", "guardian_relationship", "guardian_phone", "guardian_email"], required: ["first_name", "last_name"], remove: "contact" },
  vendor: { table: "lj_vendors", fields: ["name", "company", "phone", "email", "address", "contact_person", "notes"], required: ["name"], remove: "archived_at" },
  vendor_purchase: { table: "lj_vendor_purchases", fields: ["vendor_id", "inventory_kind", "product_id", "backbar_item_id", "item_name", "brand", "quantity", "unit_cost", "purchase_date", "payment_method", "payment_status", "paid_amount", "receipt_path"], required: ["vendor_id", "inventory_kind", "item_name", "quantity", "unit_cost", "purchase_date"], defaults: { payment_method: "cash", payment_status: "paid", inventory_applied: false }, remove: "voided_at" },
  backbar: { table: "lj_backbar_items", fields: ["name", "brand", "size_label", "category_id", "tracking_method", "quantity", "applications_remaining", "applications_per_container", "low_stock_threshold", "expires_on", "replacement_interval_days", "notes"], required: ["name", "tracking_method"], remove: "deleted_at" },
  discount: { table: "lj_discounts", fields: ["name", "code", "percentage", "scope", "item_id", "active", "expires_at", "discount_type", "fixed_amount", "starts_at", "timezone"], required: ["name", "percentage", "scope"], defaults: { active: true } },
  expense: { table: "lj_expenses", fields: ["spent_on", "category", "description", "amount", "reference"], required: ["spent_on", "category", "description", "amount"] },
  promotion: { table: "lj_promotions", fields: ["name", "description", "active"], required: ["name"], defaults: { description: "", active: true } },
  settings: { table: "lj_settings", fields: ["business_name", "address", "contact_phone", "contact_email", "whatsapp_phone", "delivery_fee", "max_daily_bookings_per_client", "cleanup_buffer_minutes", "opens_at", "closes_at", "vip_before_start", "vip_after_end", "payment_hold_minutes", "bank_name", "bank_account_name", "bank_account_type", "bank_account_number", "bank_currency", "bank_account_verified", "bank_instructions", "voice_announcements_enabled", "service_completion_sound", "service_completion_volume", "payment_confirmation_sound", "payment_confirmation_volume", "loyalty_enabled", "loyalty_welcome_credit", "loyalty_birthday_credit", "loyalty_birthday_gift_enabled", "loyalty_birthday_gift_note"], required: [] },
};

// Complex, validated workflows always use the dashboard's existing transactional RPCs.
// Types are checked here and business rules are checked again by each database function.
const operations: Record<string, Record<string, string>> = {
  update_order_fulfillment: { p_id: "uuid", p_status: "text" },
  set_workshop_attendance: { p_purchase_id: "uuid", p_attended: "boolean", p_certificate_url: "text" },
  set_workshop_resources: { p_workshop_id: "uuid", p_live_url: "text", p_recording_url: "text", p_materials_url: "text", p_certificate_url: "text" },
  set_backbar_service_usage: { p_item_id: "uuid", p_service_id: "uuid", p_applications_used: "number" },
  schedule_consultation: { p_id: "uuid", p_start: "timestamp" },
  reschedule_consultation: { p_id: "uuid", p_start: "timestamp" },
  convert_consultation: { p_id: "uuid", p_service: "uuid", p_start: "timestamp", p_note: "text" },
  cancel_consultation: { p_id: "uuid" },
  review_custom_service: { p_id: "uuid", p_approve: "boolean", p_custom_price: "number?" },
  record_refund: { p_id: "uuid" },
  leave_waitlist: { p_id: "uuid" },
  save_special: { p_id: "uuid?", p_services: "uuid[]", p_name: "text", p_description: "text", p_price: "number", p_featured: "boolean", p_photos: "https[]", p_active: "boolean", p_homepage_expires_at: "timestamp?" },
  owner_issue_gift_card: { p_amount: "number", p_recipient_name: "text", p_recipient_email: "text", p_recipient_phone: "text", p_message: "text" },
  owner_verify_gift_card: { p_id: "uuid", p_approve: "boolean", p_reason: "text" },
  owner_adjust_gift_card: { p_id: "uuid", p_amount: "number", p_reason: "text", p_disable: "boolean" },
  owner_correct_referral: { p_id: "uuid", p_status: "text", p_reason: "text" },
};

const extraReads: Record<string, { table: string; columns: string }> = {
  purchase: { table: "lj_purchases", columns: "*" },
  vendor_purchase: { table: "lj_vendor_purchases", columns: "*" },
  waitlist: { table: "lj_waitlist", columns: "*" },
  attendance: { table: "lj_attendance", columns: "*" },
  workshop_resource: { table: "lj_workshop_resources", columns: "*" },
  backbar_category: { table: "lj_backbar_categories", columns: "*" },
};

export function createManagementTools(fail: (message: string) => never): Tool[] {
  const must = (r: { data: any; error: { message: string } | null }) => {
    if (r.error) fail(r.error.message);
    return r.data;
  };
  const id = (value: unknown) => {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) fail("Use a record id returned by a lookup tool.");
    return value as string;
  };
  const parse = (value: unknown): Data => {
    if (typeof value !== "string" || value.length > 12000) fail("Provide a JSON object of up to 12,000 characters.");
    let out: any;
    try { out = JSON.parse(value as string); } catch { fail("The record fields must be valid JSON."); }
    if (!out || typeof out !== "object" || Array.isArray(out)) fail("Provide a JSON object.");
    return out;
  };
  const definition = (value: unknown) => {
    if (typeof value !== "string" || !Object.hasOwn(records, value)) fail("Choose an entity from get_management_schema.");
    return records[value as string];
  };
  const validate = (entity: string, data: Data, previous: Data | null) => {
    const def = definition(entity);
    for (const [key, value] of Object.entries(data)) {
      if (!def.fields.includes(key)) fail(`${key} is not an editable ${entity} field.`);
      if (value !== null && !["string", "number", "boolean"].includes(typeof value)) fail(`${key} must be text, a number, a boolean or null.`);
      if (typeof value === "string" && value.length > 4000) fail(`${key} is too long.`);
      if (["price", "stock", "reorder_level", "quantity", "unit_cost", "paid_amount", "applications_remaining", "applications_per_container", "low_stock_threshold", "replacement_interval_days", "duration", "capacity", "percentage", "fixed_amount", "amount", "delivery_fee", "max_daily_bookings_per_client", "cleanup_buffer_minutes"].includes(key) && value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) fail(`${key} must be a nonnegative number.`);
      if (["stock", "reorder_level", "duration", "capacity", "max_daily_bookings_per_client", "cleanup_buffer_minutes", "replacement_interval_days"].includes(key) && value !== null && !Number.isInteger(value)) fail(`${key} must be a whole number.`);
      if (["active", "bookable", "catalog_visible", "is_add_on", "requires_owner_approval", "is_minor", "bank_account_verified", "voice_announcements_enabled", "loyalty_enabled", "loyalty_birthday_gift_enabled"].includes(key) && typeof value !== "boolean") fail(`${key} must be true or false.`);
      if (["opens_at", "closes_at", "vip_before_start", "vip_after_end"].includes(key) && (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value))) fail(`${key} must be a 24-hour time.`);
      if (["email", "guardian_email", "contact_email"].includes(key) && value && (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) fail("Enter a valid email address.");
      if (["birthday", "spent_on", "expires_on", "purchase_date"].includes(key) && value && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) fail(`${key} must be YYYY-MM-DD.`);
      if (["starts_at", "expires_at"].includes(key) && value && (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value)))) fail(`${key} needs a date and time with a timezone.`);
      if (["item_id", "category_id", "vendor_id", "product_id", "backbar_item_id"].includes(key) && value !== null) id(value);
    }
    const combined = { ...def.defaults, ...previous, ...data };
    for (const key of def.required) if (combined[key] === undefined || combined[key] === null || combined[key] === "") fail(`${key} is required.`);
    if (combined.name !== undefined && (typeof combined.name !== "string" || !combined.name.trim())) fail("Enter a name.");
    if (["service", "workshop"].includes(entity) && (combined.duration < 15 || combined.duration > 480 || combined.duration % 15 !== 0)) fail("Duration must use 15-minute steps from 15 to 480 minutes.");
    if (entity === "workshop" && !["In person", "Online"].includes(combined.format)) fail("Choose In person or Online.");
    if (entity === "product" && combined.reorder_level > 10000) fail("The stock alert must be from 0 to 10,000.");
    if (entity === "client") {
      if (!String(combined.first_name ?? "").trim() || !String(combined.last_name ?? "").trim()) fail("Enter a first and last name.");
      data.full_name = `${String(combined.first_name).trim()} ${String(combined.last_name).trim()}`;
      const today = new Date().toISOString().slice(0, 10);
      const adultDate = new Date(); adultDate.setUTCFullYear(adultDate.getUTCFullYear() - 18);
      if (combined.birthday && (combined.birthday > today || combined.birthday < "1900-01-01")) fail("Enter a valid date of birth.");
      data.is_minor = Boolean(combined.is_minor || (combined.birthday && combined.birthday > adultDate.toISOString().slice(0, 10)));
      if (data.is_minor && !String(combined.guardian_name ?? "").trim()) fail("A minor requires a guardian name.");
    }
    if (entity === "backbar" && !["applications", "time"].includes(combined.tracking_method)) fail("Choose applications or time tracking.");
    if (entity === "discount" && (combined.percentage > 100 || !["all", "service", "product", "workshop"].includes(combined.scope))) fail("Choose a valid discount scope and a percentage from 0 to 100.");
    if (entity === "expense" && (combined.amount <= 0 || combined.spent_on > new Date().toISOString().slice(0, 10))) fail("Expenses require a positive amount and a date up to today.");
    if (entity === "settings" && (combined.max_daily_bookings_per_client > 10 || combined.cleanup_buffer_minutes > 120)) fail("The daily limit is 0–10 and cleanup is 0–120 minutes.");
    if (entity === "vendor_purchase") {
      if (!["retail", "backbar"].includes(combined.inventory_kind) || combined.quantity <= 0 || !["paid", "partial", "outstanding"].includes(combined.payment_status) || !["cash", "bank", "card", "credit", "other"].includes(combined.payment_method)) fail("Choose valid purchase quantities and payment details.");
      const total = Math.round(combined.quantity * combined.unit_cost * 100) / 100;
      if (combined.payment_status === "paid") data.paid_amount = total;
      if (combined.payment_status === "outstanding") data.paid_amount = 0;
      if ((data.paid_amount ?? combined.paid_amount ?? 0) > total) fail("Paid amount cannot exceed the purchase total.");
    }
    return data;
  };
  const read = async (c: Ctx, entity: string, key: string) => must(await c.sb.from(definition(entity).table).select("*").eq("id", key).single()) as Data;

  return [
    {
      name: "get_management_schema", write: false,
      description: "Lists supported record types, editable fields, required fields, and transactional owner operations. Read this before creating or changing a record. All writes require Jaycee confirmation.",
      params: {},
      run: async () => ({ records: Object.fromEntries(Object.entries(records).map(([name, def]) => [name, { fields: def.fields, required_for_creation: def.required, defaults: def.defaults, can_delete: name !== "settings" }])), read_only_records: Object.keys(extraReads), operations }),
    },
    {
      name: "list_management_records", write: false,
      description: "Paginated owner records including all clients, workshops, services (including inactive), products, vendors, backbar, discounts, expenses, promotions, purchases, vendor purchases, waitlists and workshop access. Use offset to read further pages; nothing is restricted to the first page.",
      params: { entity: { type: "string", description: "Entity from get_management_schema" }, offset: { type: "integer", description: "Zero-based offset; default 0" }, limit: { type: "integer", description: "Page size 1–50; default 25" } }, required: ["entity"],
      run: async (c, a) => {
        const entity = String(a.entity);
        if (!Object.hasOwn(records, entity) && !Object.hasOwn(extraReads, entity)) fail("Unknown record type.");
        const def = records[entity] ?? extraReads[entity];
        const offset = Number(a.offset ?? 0), limit = Number(a.limit ?? 25);
        if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) fail("Use a nonnegative offset and a page size from 1 to 50.");
        const result = await c.sb.from(def.table).select(entity === "settings" ? ["id", ...records.settings.fields].join(",") : "*", { count: "exact" }).order(entity === "attendance" ? "purchase_id" : entity === "workshop_resource" ? "workshop_id" : "id").range(offset, offset + limit - 1);
        return { records: must(result), total: result.count, next_offset: offset + limit < (result.count ?? 0) ? offset + limit : null };
      },
    },
    {
      name: "propose_save_record", write: true,
      description: "Creates or edits a service, product, workshop, client, vendor, backbar item, discount, expense, promotion or business settings. Read get_management_schema. Omit record_id for creation; settings always uses business. Pass only intended fields as data_json. Does not save until Jaycee confirms. Specials use save_special instead.",
      params: { entity: { type: "string", description: "Supported entity" }, record_id: { type: "string", description: "Existing record id for editing; omit to create" }, data_json: { type: "string", description: "JSON object containing editable fields only" } }, required: ["entity", "data_json"],
      prepare: async (c, a) => {
        const entity = String(a.entity), def = definition(entity);
        const key = entity === "settings" ? "business" : a.record_id ? id(a.record_id) : null;
        const previous = key ? await read(c, entity, key) : null;
        if (previous?.deleted_at || previous?.archived_at) fail("This record has already been removed.");
        if (entity === "service" && previous?.is_special) fail("Edit Specials using the save_special owner operation.");
        const changes = validate(entity, parse(a.data_json), previous);
        if (!Object.keys(changes).length) fail("Provide at least one change.");
        return { entity, record_id: key, changes: key ? changes : { ...def.defaults, ...changes }, before: previous ? Object.fromEntries(def.fields.map(k => [k, previous[k] ?? null])) : null };
      },
      describe: async (_c, a) => `${a.record_id ? "Update" : "Create"} ${a.entity}${a.record_id ? ` ${a.record_id}` : ""}: ${JSON.stringify(a.changes)}.`,
      execute: async (c, a) => {
        const entity = String(a.entity), def = definition(entity), key = a.record_id as string | null;
        if (key) {
          const current = await read(c, entity, key);
          for (const [field, value] of Object.entries(a.before as Data)) if (JSON.stringify(current[field] ?? null) !== JSON.stringify(value)) fail("This record changed after the proposal. Review a fresh proposal.");
          if (current.deleted_at || current.archived_at) fail("The record has been removed.");
          validate(entity, a.changes as Data, current);
        }
        const saved = must(await (key ? c.sb.from(def.table).update(a.changes).eq("id", key) : c.sb.from(def.table).insert(a.changes)).select("*").single()) as Data;
        const verified = await read(c, entity, saved.id);
        return { ok: Object.entries(a.changes as Data).every(([k, v]) => JSON.stringify(verified[k]) === JSON.stringify(v)), record: { id: verified.id, ...Object.fromEntries(def.fields.map(k => [k, verified[k]])) } };
      },
    },
    {
      name: "propose_delete_record", write: true,
      description: "Removes a service, product, workshop, client, vendor, backbar item, discount, expense or promotion after confirmation. Uses the existing catalog/contact removal rules, archives vendors and backbar, and preserves history. Settings cannot be deleted. Appointments use cancellation, not destructive deletion.",
      params: { entity: { type: "string", description: "Supported record type" }, record_id: { type: "string", description: "Record id from lookup" } }, required: ["entity", "record_id"],
      prepare: async (c, a) => {
        const entity = String(a.entity); definition(entity);
        if (entity === "settings") fail("Business settings cannot be deleted.");
        const key = id(a.record_id), row = await read(c, entity, key);
        return { entity, record_id: key, label: row.name ?? row.full_name ?? row.description ?? key };
      },
      describe: async (_c, a) => `Remove ${a.entity} “${a.label}”. Historical appointments and financial records remain protected.`,
      execute: async (c, a) => {
        const entity = String(a.entity), def = definition(entity), key = id(a.record_id);
        if (def.remove === "catalog") must(await c.sb.rpc("lj_delete_catalog_item", { p_kind: entity, p_id: key }));
        else if (def.remove === "contact") must(await c.sb.rpc("lj_delete_contact", { p_id: key }));
        else if (def.remove) must(await c.sb.from(def.table).update({ [def.remove]: new Date().toISOString(), ...(entity === "vendor_purchase" ? { payment_status: "voided", void_reason: "Voided by Jaycee through Maria" } : {}) }).eq("id", key).select("id").single());
        else must(await c.sb.from(def.table).delete().eq("id", key).select("id").single());
        const after = must(await c.sb.from(def.table).select("*").eq("id", key).maybeSingle()) as Data | null;
        return { ok: !after || Boolean(after.deleted_at || after.archived_at || after.voided_at), record: { id: key, removed: !after || Boolean(after.deleted_at || after.archived_at || after.voided_at) } };
      },
    },
    {
      name: "propose_owner_operation", write: true,
      description: "Prepares a transactional owner workflow from get_management_schema: consultation scheduling/rescheduling/conversion/cancellation, Specials, refunds already transferred by Jaycee, custom-price approval, waitlist removal, gift cards and referral corrections. Use exact parameter names from the schema. Never sends money. Saves only after Jaycee confirmation.",
      params: { operation: { type: "string", description: "Operation from get_management_schema", enum: Object.keys(operations) }, arguments_json: { type: "string", description: "JSON object with exact p_ parameter names from the operation schema" } }, required: ["operation", "arguments_json"],
      prepare: async (_c, a) => {
        const operation = String(a.operation);
        if (!Object.hasOwn(operations, operation)) fail("Unsupported owner operation.");
        const args = parse(a.arguments_json), schema = operations[operation];
        for (const k of Object.keys(args)) if (!Object.hasOwn(schema, k)) fail(`Unexpected parameter ${k}.`);
        for (const [k, type] of Object.entries(schema)) {
          const v = args[k];
          if (type.endsWith("?") && (v === null || v === undefined)) { args[k] = null; continue; }
          if (type.startsWith("uuid") && !type.includes("[]")) id(v);
          else if (type === "uuid[]") { if (!Array.isArray(v) || v.length < 2 || v.length > 20) fail("Choose 2–20 services."); for (const value of v) id(value); }
          else if (type.startsWith("timestamp") && (typeof v !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(v) || Number.isNaN(Date.parse(v)))) fail(`${k} must be an ISO date/time with a timezone.`);
          else if (type.startsWith("number") && (typeof v !== "number" || !Number.isFinite(v))) fail(`${k} must be a number.`);
          else if (type === "boolean" && typeof v !== "boolean") fail(`${k} must be true or false.`);
          else if (type === "text" && (typeof v !== "string" || v.length > 4000)) fail(`${k} must be text of up to 4,000 characters.`);
          else if (type === "https[]" && (!Array.isArray(v) || v.length > 10 || v.some(x => typeof x !== "string" || !x.startsWith("https://")))) fail("Provide up to ten HTTPS photo URLs.");
          if (k.endsWith("_url") && v && (typeof v !== "string" || !v.startsWith("https://"))) fail("Resource and certificate links must use HTTPS.");
        }
        if (operation === "set_backbar_service_usage" && args.p_applications_used < 0) fail("Applications used must be nonnegative; use zero to remove the link.");
        if (operation === "update_order_fulfillment" && !["processing", "ready", "fulfilled"].includes(args.p_status)) fail("Choose processing, ready or fulfilled.");
        return { operation, arguments: args };
      },
      describe: async (_c, a) => `Run ${String(a.operation).replaceAll("_", " ")}: ${JSON.stringify(a.arguments)}.`,
      execute: async (c, a) => {
        if (!Object.hasOwn(operations, String(a.operation))) fail("Unsupported owner operation.");
        const args = a.arguments as Data;
        if (a.operation === "update_order_fulfillment") {
          const current = must(await c.sb.from("lj_purchases").select("id,kind,status,payment_status,fulfillment_status").eq("id", args.p_id).single()) as Data;
          if (current.kind !== "product" || current.payment_status !== "verified") fail("Only verified product orders can advance through fulfillment.");
          const next: Data = { pending: "processing", processing: "ready", ready: "fulfilled" };
          if (next[current.fulfillment_status] !== args.p_status) fail("Advance the order one fulfillment stage at a time.");
          must(await c.sb.from("lj_purchases").update({ status: args.p_status, fulfillment_status: args.p_status }).eq("id", args.p_id).eq("fulfillment_status", current.fulfillment_status).eq("payment_status", "verified").select("id").single());
          const row = must(await c.sb.from("lj_purchases").select("id,status,fulfillment_status").eq("id", args.p_id).single());
          return { ok: row.fulfillment_status === args.p_status, record: row };
        }
        if (a.operation === "set_workshop_attendance") {
          const purchase = must(await c.sb.from("lj_purchases").select("kind,status,customer_id").eq("id", args.p_purchase_id).single()) as Data;
          if (purchase.kind !== "workshop" || !["paid", "processing", "ready", "fulfilled"].includes(purchase.status)) fail("Workshop access requires a paid workshop purchase.");
          must(await c.sb.from("lj_attendance").upsert({ purchase_id: args.p_purchase_id, customer_id: purchase.customer_id, attended: args.p_attended, certificate_url: args.p_certificate_url }));
          const row = must(await c.sb.from("lj_attendance").select("*").eq("purchase_id", args.p_purchase_id).single());
          return { ok: row.attended === args.p_attended && row.certificate_url === args.p_certificate_url, record: row };
        }
        if (a.operation === "set_workshop_resources") {
          must(await c.sb.from("lj_workshops").select("id").eq("id", args.p_workshop_id).is("deleted_at", null).single());
          const fields = { live_url: args.p_live_url, recording_url: args.p_recording_url, materials_url: args.p_materials_url, certificate_url: args.p_certificate_url };
          must(await c.sb.from("lj_workshop_resources").upsert({ workshop_id: args.p_workshop_id, ...fields }));
          const row = must(await c.sb.from("lj_workshop_resources").select("*").eq("workshop_id", args.p_workshop_id).single());
          return { ok: Object.entries(fields).every(([k, v]) => row[k] === v), record: row };
        }
        if (a.operation === "set_backbar_service_usage") {
          if (args.p_applications_used === 0) must(await c.sb.from("lj_backbar_service_usage").delete().eq("item_id", args.p_item_id).eq("service_id", args.p_service_id));
          else must(await c.sb.from("lj_backbar_service_usage").upsert({ item_id: args.p_item_id, service_id: args.p_service_id, applications_used: args.p_applications_used }, { onConflict: "item_id,service_id" }));
          const row = must(await c.sb.from("lj_backbar_service_usage").select("*").eq("item_id", args.p_item_id).eq("service_id", args.p_service_id).maybeSingle());
          return { ok: args.p_applications_used === 0 ? !row : Number(row?.applications_used) === args.p_applications_used, record: row };
        }
        const result = must(await c.sb.rpc(`lj_${a.operation}`, a.arguments));
        const apptOps: Data = { review_custom_service: "lj_calendar", record_refund: "lj_transactions", leave_waitlist: "lj_waitlist", schedule_consultation: "lj_consultation_requests", reschedule_consultation: "lj_consultation_requests", convert_consultation: "lj_consultation_requests", cancel_consultation: "lj_consultation_requests" };
        if (apptOps[String(a.operation)]) {
          const row = must(await c.sb.from(apptOps[String(a.operation)]).select("*").eq("id", args.p_id).maybeSingle());
          let ok = false;
          if (a.operation === "cancel_consultation") ok = row?.status === "cancelled";
          if (a.operation === "convert_consultation") ok = row?.status === "converted";
          if (["schedule_consultation", "reschedule_consultation"].includes(String(a.operation)) && row?.appointment_id) {
            const appointment = must(await c.sb.from("lj_calendar").select("starts_at").eq("id", row.appointment_id).single());
            ok = row.status === "scheduled" && Date.parse(appointment.starts_at) === Date.parse(args.p_start);
          }
          if (a.operation === "record_refund") ok = row?.status === "refunded";
          if (a.operation === "leave_waitlist") ok = row?.status === "cancelled";
          if (a.operation === "review_custom_service") ok = row?.approval_status === (args.p_approve ? "approved" : "declined");
          return { ok, record: row };
        }
        if (a.operation === "save_special") {
          const row = must(await c.sb.from("lj_services").select("id,name,price,is_special,active").eq("id", result).single());
          return { ok: row.is_special && row.name === args.p_name && Number(row.price) === args.p_price && row.active === args.p_active, record: row };
        }
        // The transactional RPC verifies its own result, but a separate read-back has not
        // been performed here. Report that distinction honestly to Jaycee.
        return { ok: false, record: { saved: true, operation: a.operation, result, verification: "RPC succeeded; review the corresponding owner screen." } };
      },
    },
    {
      name: "get_gifts_referrals", write: false,
      description: "Reads all available owner gift-card balances, gift purchases and referral information.", params: {},
      run: async c => must(await c.sb.rpc("lj_owner_gifts_referrals")),
    },
  ];
}
