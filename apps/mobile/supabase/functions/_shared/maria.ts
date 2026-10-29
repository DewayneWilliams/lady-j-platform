// Maria's tool layer, shared by the maria-agent and maria-voice-token Edge Functions.
// Every tool runs with the signed-in owner's JWT, so RLS and lj_is_owner() checks in the
// existing RPCs still apply. Write tools never execute directly: they stage a proposal that
// only the owner's explicit confirmation (a separate, authenticated request) can run.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createManagementTools } from "./mariaManagement.ts";

export const TZ = "America/Port_of_Spain";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export class MariaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type Ctx = { sb: SupabaseClient; userId: string };

/** Verifies the JWT and the owner role against the existing database role system. */
export async function authorizeOwner(req: Request): Promise<Ctx> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new MariaError("Sign in as the owner to use Maria.", 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new MariaError("Your session has expired. Please sign in again.", 401);
  const owner = await sb.rpc("lj_is_owner");
  if (owner.error || owner.data !== true) throw new MariaError("Maria is available to the salon owner only.", 403);
  return { sb, userId: data.user.id };
}

// ---------- validation helpers ----------
type Args = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (a: Args, k: string, optional = false) => {
  const v = a[k];
  if ((v === undefined || v === null || v === "") && optional) return null;
  if (typeof v !== "string" || !UUID.test(v)) throw new MariaError(`${k} must be an id returned by a lookup tool.`);
  return v.toLowerCase();
};
const text = (a: Args, k: string, max: number, optional = false) => {
  const v = a[k];
  if ((v === undefined || v === null || v === "") && optional) return "";
  if (typeof v !== "string" || !v.trim()) throw new MariaError(`${k} is required.`);
  return v.trim().slice(0, max);
};
const num = (a: Args, k: string, min: number, max: number, optional = false) => {
  const v = a[k];
  if ((v === undefined || v === null || v === "") && optional) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new MariaError(`${k} must be between ${min} and ${max}.`);
  return n;
};
const bool = (a: Args, k: string) => a[k] === true || a[k] === "true";
const oneOf = (a: Args, k: string, values: string[]) => {
  const v = String(a[k] ?? "");
  if (!values.includes(v)) throw new MariaError(`${k} must be one of: ${values.join(", ")}.`);
  return v;
};
const iso = (a: Args, k: string) => {
  const v = String(a[k] ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v) || Number.isNaN(Date.parse(v)))
    throw new MariaError(`${k} must be an ISO date-time with an offset, e.g. 2026-11-03T10:00:00-04:00.`);
  return new Date(v).toISOString();
};
const day = (a: Args, k: string, fallback?: string) => {
  const v = a[k] === undefined || a[k] === "" ? fallback : String(a[k]);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new MariaError(`${k} must be YYYY-MM-DD.`);
  return v;
};

export const todayKey = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
// Trinidad & Tobago has no daylight saving: always UTC-4.
const dayStart = (d: string) => new Date(`${d}T00:00:00-04:00`).toISOString();
const dayEnd = (d: string) => new Date(new Date(`${d}T00:00:00-04:00`).getTime() + 86400000).toISOString();
const salonTime = (v: string | null) =>
  v ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v)) : "";
const ttd = (n: unknown) => `TT$${Number(n ?? 0).toFixed(2)}`;
const must = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new MariaError(r.error.message.slice(0, 300));
  return r.data;
};

// ---------- tool registry ----------
type Param = { type: "string" | "number" | "integer" | "boolean"; description: string; enum?: string[] };
export type Tool = {
  name: string;
  description: string;
  write: boolean;
  params: Record<string, Param>;
  required?: string[];
  /** Read tools: returns data. Write tools: validates args and returns the cleaned args to stage. */
  prepare?: (c: Ctx, a: Args) => Promise<Args> | Args;
  /** Write tools: plain-language description of exactly what will change. */
  describe?: (c: Ctx, a: Args) => Promise<string>;
  /** Read tools only. */
  run?: (c: Ctx, a: Args) => Promise<unknown>;
  /** Write tools: performs the change after confirmation and returns a read-back of the stored result. */
  execute?: (c: Ctx, a: Args) => Promise<{ ok: boolean; record: unknown }>;
};

const clientNames = async (c: Ctx, ids: (string | null)[]) => {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  if (!unique.length) return {} as Record<string, string>;
  const rows = must(await c.sb.from("lj_client_records").select("id,full_name").in("id", unique)) as { id: string; full_name: string }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.full_name]));
};
const apptView = (r: Record<string, any>, names: Record<string, string>) => ({
  id: r.id,
  client: names[r.client_id] ?? null,
  client_id: r.client_id,
  when: salonTime(r.starts_at),
  starts_at: r.starts_at,
  ends_at: r.ends_at,
  type: r.kind,
  status: r.status,
  services: Array.isArray(r.services) ? r.services.map((s: any) => s.name ?? s.title).filter(Boolean) : [],
  total: r.total,
  deposit: r.deposit,
  vip: r.is_vip ? { approval: r.approval_status, premium_percent: r.vip_percentage } : undefined,
  note: r.note || undefined,
});
const APPT_COLS =
  "id,client_id,customer_id,starts_at,ends_at,kind,status,services,total,deposit,deposit_paid,discount_total,note,is_vip,vip_percentage,approval_status,block_reason,block_description,all_day,updated_at";
const readAppt = async (c: Ctx, id: string) => {
  const r = must(await c.sb.from("lj_calendar").select(APPT_COLS).eq("id", id).maybeSingle());
  return r as Record<string, any> | null;
};
const REASONS: Record<string, string> = { vacation: "Vacation", training: "Training", maintenance: "Salon Maintenance", personal: "Personal Time" };
const backbarRemaining = (r: Record<string, any>) =>
  r.tracking_method === "applications" ? Number(r.applications_remaining || 0) : Number(r.quantity);
const rpc = async (c: Ctx, fn: string, args: Args) => must(await c.sb.rpc(fn, args));

export const tools: Tool[] = [
  // ===== read tools =====
  {
    name: "get_overview",
    description:
      "Start here. Returns today's date (salon time), counts of today's and tomorrow's appointments, pending VIP requests, bank payments awaiting verification, new consultations, and low retail/backbar stock.",
    write: false,
    params: {},
    run: async (c) => {
      const t = todayKey();
      const tm = todayKey(1);
      const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
        const r = await q;
        if (r.error) throw new MariaError(r.error.message);
        return r.count ?? 0;
      };
      const appts = (from: string, to: string) =>
        c.sb.from("lj_calendar").select("id", { count: "exact", head: true }).eq("kind", "appointment").neq("status", "cancelled").gte("starts_at", dayStart(from)).lt("starts_at", dayEnd(to));
      const products = must(await c.sb.from("lj_products").select("stock,reorder_level").is("deleted_at", null).eq("active", true)) as any[];
      const backbar = must(await c.sb.from("lj_backbar_items").select("tracking_method,quantity,applications_remaining,low_stock_threshold").is("deleted_at", null)) as any[];
      return {
        today: t,
        weekday: new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(new Date()),
        salon_hours: "Tuesday to Saturday, 10:00 to 18:00 (America/Port_of_Spain)",
        appointments_today: await count(appts(t, t)),
        appointments_tomorrow: await count(appts(tm, tm)),
        pending_vip_requests: await count(c.sb.from("lj_calendar").select("id", { count: "exact", head: true }).eq("approval_status", "pending").neq("status", "cancelled")),
        payments_awaiting_verification: await count(c.sb.from("lj_transactions").select("id", { count: "exact", head: true }).eq("status", "pending")),
        new_consultations: await count(c.sb.from("lj_consultation_requests").select("id", { count: "exact", head: true }).eq("status", "new")),
        low_stock_products: products.filter((p) => p.stock <= (p.reorder_level ?? 0)).length,
        low_stock_backbar_items: backbar.filter((p) => backbarRemaining(p) <= Number(p.low_stock_threshold ?? 0)).length,
      };
    },
  },
  {
    name: "list_appointments",
    description: "Lists appointments between two salon-local dates (inclusive), with client names, services, status and money.",
    write: false,
    params: {
      date_from: { type: "string", description: "YYYY-MM-DD, default today" },
      date_to: { type: "string", description: "YYYY-MM-DD, default same as date_from" },
      status: { type: "string", description: "Optional status filter", enum: ["pending", "confirmed", "completed", "cancelled"] },
    },
    run: async (c, a) => {
      const from = day(a, "date_from", todayKey());
      const to = day(a, "date_to", from);
      let q = c.sb.from("lj_calendar").select(APPT_COLS).eq("kind", "appointment").gte("starts_at", dayStart(from)).lt("starts_at", dayEnd(to)).order("starts_at").limit(60);
      if (a.status) q = q.eq("status", oneOf(a, "status", ["pending", "confirmed", "completed", "cancelled"]));
      const rows = must(await q) as any[];
      const names = await clientNames(c, rows.map((r) => r.client_id));
      return { count: rows.length, appointments: rows.map((r) => apptView(r, names)) };
    },
  },
  {
    name: "list_vip_requests",
    description: "Lists VIP (Sunday/Monday/after-hours) appointment requests that still need approval.",
    write: false,
    params: {},
    run: async (c) => {
      const rows = must(await c.sb.from("lj_calendar").select(APPT_COLS).eq("approval_status", "pending").neq("status", "cancelled").order("starts_at").limit(30)) as any[];
      const names = await clientNames(c, rows.map((r) => r.client_id));
      return { count: rows.length, requests: rows.map((r) => apptView(r, names)) };
    },
  },
  {
    name: "list_calendar_blocks",
    description: "Lists blocked time (vacation, training, maintenance, personal) between two salon-local dates.",
    write: false,
    params: {
      date_from: { type: "string", description: "YYYY-MM-DD, default today" },
      date_to: { type: "string", description: "YYYY-MM-DD, default 14 days after date_from" },
    },
    run: async (c, a) => {
      const from = day(a, "date_from", todayKey());
      const to = day(a, "date_to", new Date(Date.parse(from) + 14 * 86400000).toISOString().slice(0, 10));
      const rows = must(await c.sb.from("lj_calendar").select(APPT_COLS).eq("kind", "block").neq("status", "cancelled").gte("ends_at", dayStart(from)).lt("starts_at", dayEnd(to)).order("starts_at").limit(40)) as any[];
      return { count: rows.length, blocks: rows.map((r) => ({ id: r.id, from: salonTime(r.starts_at), to: salonTime(r.ends_at), starts_at: r.starts_at, ends_at: r.ends_at, reason: REASONS[r.block_reason] ?? r.block_reason, description: r.block_description, all_day: r.all_day })) };
    },
  },
  {
    name: "check_availability",
    description: "Lists open booking start times on a date for a given service, using the same availability rules clients see.",
    write: false,
    params: {
      date: { type: "string", description: "YYYY-MM-DD" },
      service_id: { type: "string", description: "Service id from list_services" },
    },
    required: ["date", "service_id"],
    run: async (c, a) => {
      const sid = uuid(a, "service_id");
      const s = must(await c.sb.from("lj_services").select("name,duration").eq("id", sid!).maybeSingle()) as any;
      if (!s) throw new MariaError("Service not found.");
      const rows = must(await c.sb.rpc("lj_available_v2", { p_date: day(a, "date"), p_duration: s.duration })) as any[];
      return { service: s.name, duration_minutes: s.duration, open_times: rows.map((r) => ({ starts_at: r.starts_at, label: salonTime(r.starts_at), vip: r.is_vip, vip_percentage: r.vip_percentage })) };
    },
  },
  {
    name: "find_clients",
    description: "Searches saved clients by name, email or phone. Returns ids needed for booking.",
    write: false,
    params: { query: { type: "string", description: "Name, email or phone fragment" } },
    required: ["query"],
    run: async (c, a) => {
      const q = text(a, "query", 60).replace(/[%,()]/g, " ");
      const rows = must(await c.sb.from("lj_client_records").select("id,full_name,email,phone,birthday,is_minor").is("deleted_at", null).or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`).order("full_name").limit(10)) as any[];
      return { count: rows.length, clients: rows };
    },
  },
  {
    name: "get_client",
    description: "Full client profile with owner notes, preferences, sensitivities, upcoming and recent appointments.",
    write: false,
    params: { client_id: { type: "string", description: "Client id" } },
    required: ["client_id"],
    run: async (c, a) => {
      const id = uuid(a, "client_id")!;
      const r = must(await c.sb.from("lj_client_records").select("id,full_name,email,phone,whatsapp_phone,birthday,preferences,sensitivities,private_notes,is_minor,guardian_name,photo_consent").eq("id", id).maybeSingle()) as any;
      if (!r) throw new MariaError("Client not found.");
      const rows = must(await c.sb.from("lj_calendar").select(APPT_COLS).eq("client_id", id).eq("kind", "appointment").order("starts_at", { ascending: false }).limit(10)) as any[];
      return { client: r, appointments: rows.map((x) => apptView(x, { [id]: r.full_name })) };
    },
  },
  {
    name: "list_services",
    description: "Lists active services with price and duration. Optional name/category search.",
    write: false,
    params: { query: { type: "string", description: "Optional name or category fragment" } },
    run: async (c, a) => {
      let q = c.sb.from("lj_services").select("id,name,category,duration,price,price_kind,is_special,bookable").eq("active", true).is("deleted_at", null).order("category").order("name").limit(25);
      const s = String(a.query ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
      if (s) q = q.or(`name.ilike.%${s}%,category.ilike.%${s}%`);
      const rows = must(await q) as any[];
      return { count: rows.length, services: rows.map((r) => ({ ...r, price: ttd(r.price) })) };
    },
  },
  {
    name: "list_products",
    description: "Lists retail products with stock levels. Use low_stock_only to see what needs reordering.",
    write: false,
    params: {
      query: { type: "string", description: "Optional name/brand/category fragment" },
      low_stock_only: { type: "boolean", description: "Only products at or below reorder level" },
    },
    run: async (c, a) => {
      let q = c.sb.from("lj_products").select("id,name,brand,category,price,stock,reorder_level,active").is("deleted_at", null).order("name").limit(500);
      const s = String(a.query ?? "").trim().replace(/[%,()]/g, " ").slice(0, 60);
      if (s) q = q.or(`name.ilike.%${s}%,brand.ilike.%${s}%,category.ilike.%${s}%`);
      let rows = must(await q) as any[];
      if (bool(a, "low_stock_only")) rows = rows.filter((r) => r.stock <= (r.reorder_level ?? 0));
      return { count: rows.length, products: rows.slice(0, 25).map((r) => ({ ...r, price: ttd(r.price) })) };
    },
  },
  {
    name: "list_backbar_inventory",
    description: "Lists backbar (in-salon supply) items with remaining amount and low-stock thresholds.",
    write: false,
    params: { low_only: { type: "boolean", description: "Only items at or below their low-stock threshold" } },
    run: async (c, a) => {
      let rows = must(await c.sb.from("lj_backbar_items").select("id,name,brand,size_label,tracking_method,quantity,applications_remaining,low_stock_threshold,expires_on").is("deleted_at", null).order("name").limit(200)) as any[];
      if (bool(a, "low_only")) rows = rows.filter((r) => backbarRemaining(r) <= Number(r.low_stock_threshold ?? 0));
      return { count: rows.length, items: rows.slice(0, 30).map((r) => ({ ...r, remaining: backbarRemaining(r) })) };
    },
  },
  {
    name: "list_vendors",
    description: "Lists active vendors and recent vendor purchases.",
    write: false,
    params: {},
    run: async (c) => {
      const vendors = must(await c.sb.from("lj_vendors").select("id,name,company,phone,email,contact_person").is("archived_at", null).order("name").limit(40)) as any[];
      const purchases = must(await c.sb.from("lj_vendor_purchases").select("vendor_id,item_name,brand,quantity,total_cost,paid_amount,purchase_date,payment_status").is("voided_at", null).order("purchase_date", { ascending: false }).limit(15)) as any[];
      const byId = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
      return { vendors, recent_purchases: purchases.map((p) => ({ ...p, vendor: byId[p.vendor_id] ?? null })) };
    },
  },
  {
    name: "list_consultations",
    description: "Lists consultation requests, newest first. Optional status filter.",
    write: false,
    params: { status: { type: "string", description: "Optional status", enum: ["new", "contacted", "scheduled", "completed", "converted", "cancelled"] } },
    run: async (c, a) => {
      let q = c.sb.from("lj_consultation_requests").select("id,client_name,client_email,status,summary,preferred_date,availability_days,availability_times,primary_service,appointment_id,created_at").order("created_at", { ascending: false }).limit(20);
      if (a.status) q = q.eq("status", oneOf(a, "status", ["new", "contacted", "scheduled", "completed", "converted", "cancelled"]));
      const rows = must(await q) as any[];
      return { count: rows.length, consultations: rows };
    },
  },
  {
    name: "list_payments",
    description: "Lists bank/cash payment records. Use status 'pending' for payments awaiting verification.",
    write: false,
    params: { status: { type: "string", description: "Payment status", enum: ["pending", "verified", "rejected", "refund_due", "refunded", "retained"] } },
    run: async (c, a) => {
      let q = c.sb.from("lj_transactions").select("id,appointment_id,purchase_id,client_id,amount,method,reference,status,created_at,received_at").order("created_at", { ascending: false }).limit(25);
      if (a.status) q = q.eq("status", oneOf(a, "status", ["pending", "verified", "rejected", "refund_due", "refunded", "retained"]));
      const rows = must(await q) as any[];
      const names = await clientNames(c, rows.map((r) => r.client_id));
      return { count: rows.length, payments: rows.map((r) => ({ ...r, client: names[r.client_id] ?? null, amount: ttd(r.amount) })) };
    },
  },
  {
    name: "get_report",
    description: "Business report for a salon-local date range: verified revenue (cash received), by method, appointment counts, expenses and vendor spending. Cash-basis, not accounting profit.",
    write: false,
    params: {
      date_from: { type: "string", description: "YYYY-MM-DD, default first day of this month" },
      date_to: { type: "string", description: "YYYY-MM-DD, default today" },
    },
    run: async (c, a) => {
      const to = day(a, "date_to", todayKey());
      const from = day(a, "date_from", `${to.slice(0, 8)}01`);
      const tx = must(await c.sb.from("lj_transactions").select("amount,method,status,received_at,created_at").eq("status", "verified").gte("received_at", dayStart(from)).lt("received_at", dayEnd(to)).limit(5000)) as any[];
      const byMethod: Record<string, number> = {};
      let revenue = 0;
      for (const t of tx) {
        revenue += Number(t.amount);
        byMethod[t.method ?? "unknown"] = (byMethod[t.method ?? "unknown"] ?? 0) + Number(t.amount);
      }
      const appts = must(await c.sb.from("lj_calendar").select("status").eq("kind", "appointment").gte("starts_at", dayStart(from)).lt("starts_at", dayEnd(to)).limit(5000)) as any[];
      const counts: Record<string, number> = {};
      for (const r of appts) counts[r.status] = (counts[r.status] ?? 0) + 1;
      const exp = must(await c.sb.from("lj_expenses").select("amount").gte("spent_on", from).lte("spent_on", to).limit(5000)) as any[];
      const ven = must(await c.sb.from("lj_vendor_purchases").select("total_cost").is("voided_at", null).gte("purchase_date", from).lte("purchase_date", to).limit(5000)) as any[];
      const expenses = exp.reduce((s, r) => s + Number(r.amount), 0);
      const vendorSpend = ven.reduce((s, r) => s + Number(r.total_cost), 0);
      return { from, to, revenue_received: ttd(revenue), revenue_by_method: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, ttd(v)])), appointments_by_status: counts, expenses: ttd(expenses), vendor_purchases: ttd(vendorSpend), cash_surplus: ttd(revenue - expenses - vendorSpend), note: "Cash-basis comparison, not accounting profit." };
    },
  },
  {
    name: "get_royalty_insights",
    description: "Royalty program insights: member levels and point totals.",
    write: false,
    params: {},
    run: async (c) => rpc(c, "lj_owner_royalty_insights", {}),
  },
  {
    name: "get_business_settings",
    description: "Salon name, hours, contact details and booking rules (no bank account numbers).",
    write: false,
    params: {},
    run: async (c) =>
      must(await c.sb.from("lj_settings").select("business_name,contact_email,contact_phone,address,whatsapp_phone,opens_at,closes_at,vip_before_start,vip_after_end,max_daily_bookings_per_client,cleanup_buffer_minutes,email_reminders_enabled,payment_hold_minutes").eq("id", "business").maybeSingle()),
  },

  // ===== write tools (staged; executed only after explicit confirmation) =====
  {
    name: "propose_book_appointment",
    description: "Prepares booking an appointment for a saved client. Does NOT book until Jaycee confirms. Check availability first.",
    write: true,
    params: {
      client_id: { type: "string", description: "Saved client id from find_clients" },
      service_id: { type: "string", description: "Service id from list_services" },
      start: { type: "string", description: "ISO date-time with offset, e.g. 2026-11-03T10:00:00-04:00" },
      note: { type: "string", description: "Optional note" },
    },
    required: ["client_id", "service_id", "start"],
    prepare: (_c, a) => ({ client_id: uuid(a, "client_id"), service_id: uuid(a, "service_id"), start: iso(a, "start"), note: text(a, "note", 500, true) }),
    describe: async (c, a) => {
      const cl = must(await c.sb.from("lj_client_records").select("full_name").eq("id", a.client_id as string).maybeSingle()) as any;
      const s = must(await c.sb.from("lj_services").select("name,price,duration").eq("id", a.service_id as string).maybeSingle()) as any;
      if (!cl) throw new MariaError("Client not found.");
      if (!s) throw new MariaError("Service not found.");
      return `Book ${cl.full_name} for ${s.name} (${s.duration} min, ${ttd(s.price)}) on ${salonTime(a.start as string)}.`;
    },
    execute: async (c, a) => {
      const id = (await rpc(c, "lj_owner_book_client", { p_service: a.service_id, p_start: a.start, p_client: a.client_id, p_name: "", p_email: "", p_phone: "", p_note: a.note ?? "" })) as string;
      const row = await readAppt(c, id);
      return { ok: !!row && row.client_id === a.client_id, record: row && apptView(row, {}) };
    },
  },
  {
    name: "propose_cancel_appointment",
    description: "Prepares cancelling an appointment (deposit rules apply automatically). Does NOT cancel until Jaycee confirms.",
    write: true,
    params: { appointment_id: { type: "string", description: "Appointment id" } },
    required: ["appointment_id"],
    prepare: (_c, a) => ({ appointment_id: uuid(a, "appointment_id") }),
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      if (!r) throw new MariaError("Appointment not found.");
      const n = await clientNames(c, [r.client_id]);
      return `Cancel ${n[r.client_id] ?? "the client"}'s appointment on ${salonTime(r.starts_at)} (currently ${r.status}, total ${ttd(r.total)}).`;
    },
    execute: async (c, a) => {
      const message = await rpc(c, "lj_cancel", { p_id: a.appointment_id });
      const row = await readAppt(c, a.appointment_id as string);
      return { ok: row?.status === "cancelled", record: { status: row?.status, message } };
    },
  },
  {
    name: "propose_review_vip_request",
    description: "Prepares approving or declining a pending VIP appointment request. Does NOT act until Jaycee confirms.",
    write: true,
    params: { appointment_id: { type: "string", description: "Appointment id" }, approve: { type: "boolean", description: "true to approve, false to decline" } },
    required: ["appointment_id", "approve"],
    prepare: (_c, a) => ({ appointment_id: uuid(a, "appointment_id"), approve: bool(a, "approve") }),
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      if (!r) throw new MariaError("Appointment not found.");
      const n = await clientNames(c, [r.client_id]);
      return `${a.approve ? "Approve" : "Decline"} the VIP request from ${n[r.client_id] ?? "the client"} for ${salonTime(r.starts_at)} (${ttd(r.total)}, approval currently ${r.approval_status}).`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_review_vip_request", { p_id: a.appointment_id, p_approve: a.approve });
      const row = await readAppt(c, a.appointment_id as string);
      const expected = a.approve ? "approved" : "declined";
      return { ok: row?.approval_status === expected || (!a.approve && row?.status === "cancelled"), record: { approval_status: row?.approval_status, status: row?.status } };
    },
  },
  {
    name: "propose_block_time",
    description: "Prepares blocking salon time on the calendar. Does NOT block until Jaycee confirms.",
    write: true,
    params: {
      start: { type: "string", description: "ISO date-time with offset" },
      end: { type: "string", description: "ISO date-time with offset, after start" },
      reason: { type: "string", description: "Block reason", enum: ["vacation", "training", "maintenance", "personal"] },
      description: { type: "string", description: "Optional private note" },
    },
    required: ["start", "end", "reason"],
    prepare: (_c, a) => {
      const start = iso(a, "start");
      const end = iso(a, "end");
      if (Date.parse(end) <= Date.parse(start)) throw new MariaError("end must be after start.");
      return { start, end, reason: oneOf(a, "reason", ["vacation", "training", "maintenance", "personal"]), description: text(a, "description", 300, true) };
    },
    describe: async (_c, a) => `Block ${salonTime(a.start as string)} to ${salonTime(a.end as string)} as ${REASONS[a.reason as string]}${a.description ? ` (“${a.description}”)` : ""}. Clients will see it only as unavailable.`,
    execute: async (c, a) => {
      const res = (await rpc(c, "lj_save_calendar_block", { p_id: null, p_start: a.start, p_end: a.end, p_reason: a.reason, p_description: a.description ?? "", p_all_day: false, p_repeat: "none", p_until: null, p_weekdays: [], p_scope: "one", p_expected: null, p_request_key: crypto.randomUUID() })) as any;
      const rows = must(await c.sb.from("lj_calendar").select(APPT_COLS).eq("kind", "block").eq("block_reason", a.reason as string).eq("starts_at", a.start as string).limit(1)) as any[];
      return { ok: rows.length === 1, record: { saved: res, block: rows[0] ? { id: rows[0].id, starts_at: rows[0].starts_at, ends_at: rows[0].ends_at, reason: rows[0].block_reason } : null } };
    },
  },
  {
    name: "propose_delete_calendar_block",
    description: "Prepares removing a calendar block. Does NOT remove until Jaycee confirms.",
    write: true,
    params: { block_id: { type: "string", description: "Block id from list_calendar_blocks" } },
    required: ["block_id"],
    prepare: (_c, a) => ({ block_id: uuid(a, "block_id") }),
    describe: async (c, a) => {
      const r = await readAppt(c, a.block_id as string);
      if (!r || r.kind !== "block") throw new MariaError("Block not found.");
      return `Remove the ${REASONS[r.block_reason] ?? r.block_reason} block from ${salonTime(r.starts_at)} to ${salonTime(r.ends_at)}.`;
    },
    execute: async (c, a) => {
      const r = await readAppt(c, a.block_id as string);
      if (!r) throw new MariaError("Block not found.");
      const removed = await rpc(c, "lj_delete_calendar_block", { p_id: a.block_id, p_scope: "one", p_expected: r.updated_at ?? null });
      // Removed blocks are kept as cancelled history rows.
      const after = await readAppt(c, a.block_id as string);
      return { ok: after === null || after.status === "cancelled", record: { removed } };
    },
  },
  {
    name: "propose_update_consultation_status",
    description: "Prepares changing a consultation request's status. Does NOT change until Jaycee confirms.",
    write: true,
    params: { consultation_id: { type: "string", description: "Consultation id" }, status: { type: "string", description: "New status", enum: ["new", "contacted", "scheduled", "completed", "cancelled"] } },
    required: ["consultation_id", "status"],
    prepare: (_c, a) => ({ consultation_id: uuid(a, "consultation_id"), status: oneOf(a, "status", ["new", "contacted", "scheduled", "completed", "cancelled"]) }),
    describe: async (c, a) => {
      const r = must(await c.sb.from("lj_consultation_requests").select("client_name,status").eq("id", a.consultation_id as string).maybeSingle()) as any;
      if (!r) throw new MariaError("Consultation not found.");
      return `Change ${r.client_name}'s consultation request from “${r.status}” to “${a.status}”.`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_update_consultation_status", { p_id: a.consultation_id, p_status: a.status });
      const r = must(await c.sb.from("lj_consultation_requests").select("status").eq("id", a.consultation_id as string).maybeSingle()) as any;
      return { ok: r?.status === a.status, record: r };
    },
  },
  {
    name: "propose_verify_payment",
    description: "Prepares verifying that a pending bank transfer was received, confirming the linked booking. Records nothing with a bank or card; only the owner's confirmation of money she has already seen. Does NOT act until Jaycee confirms.",
    write: true,
    params: { payment_id: { type: "string", description: "Payment id from list_payments (status pending)" } },
    required: ["payment_id"],
    prepare: (_c, a) => ({ payment_id: uuid(a, "payment_id") }),
    describe: async (c, a) => {
      const r = must(await c.sb.from("lj_transactions").select("amount,method,reference,status,client_id").eq("id", a.payment_id as string).maybeSingle()) as any;
      if (!r) throw new MariaError("Payment not found.");
      const n = await clientNames(c, [r.client_id]);
      return `Mark the ${ttd(r.amount)} ${r.method ?? "bank"} payment${n[r.client_id] ? ` from ${n[r.client_id]}` : ""}${r.reference ? ` (ref ${r.reference})` : ""} as verified (currently ${r.status}).`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_verify_payment", { p_id: a.payment_id });
      const r = must(await c.sb.from("lj_transactions").select("status,amount").eq("id", a.payment_id as string).maybeSingle()) as any;
      return { ok: r?.status === "verified", record: r };
    },
  },
  {
    name: "propose_reject_payment",
    description: "Prepares rejecting a pending bank payment with a reason. Does NOT act until Jaycee confirms.",
    write: true,
    params: { payment_id: { type: "string", description: "Payment id" }, reason: { type: "string", description: "Reason shown to the client" } },
    required: ["payment_id", "reason"],
    prepare: (_c, a) => ({ payment_id: uuid(a, "payment_id"), reason: text(a, "reason", 300) }),
    describe: async (c, a) => {
      const r = must(await c.sb.from("lj_transactions").select("amount,reference,status").eq("id", a.payment_id as string).maybeSingle()) as any;
      if (!r) throw new MariaError("Payment not found.");
      return `Reject the ${ttd(r.amount)} payment${r.reference ? ` (ref ${r.reference})` : ""} with the reason “${a.reason}”.`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_reject_payment", { p_id: a.payment_id, p_reason: a.reason });
      const r = must(await c.sb.from("lj_transactions").select("status,rejection_reason").eq("id", a.payment_id as string).maybeSingle()) as any;
      return { ok: r?.status === "rejected", record: r };
    },
  },
  {
    name: "propose_discount_appointment",
    description: "Prepares applying a percentage discount to an unsettled appointment. Does NOT apply until Jaycee confirms.",
    write: true,
    params: { appointment_id: { type: "string", description: "Appointment id" }, percentage: { type: "number", description: "Discount percent, 0 to 100" } },
    required: ["appointment_id", "percentage"],
    prepare: async (c, a) => {
      const r = await readAppt(c, uuid(a, "appointment_id")!);
      if (!r) throw new MariaError("Appointment not found.");
      return { appointment_id: r.id, percentage: num(a, "percentage", 0, 100), expected_total: Number(r.total) };
    },
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      const n = await clientNames(c, [r?.client_id ?? null]);
      return `Apply a ${a.percentage}% discount to ${n[r?.client_id] ?? "the client"}'s appointment on ${salonTime(r?.starts_at ?? null)} (current total ${ttd(a.expected_total)}).`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_discount_appointment", { p_id: a.appointment_id, p_percentage: a.percentage, p_expected_total: a.expected_total });
      const r = await readAppt(c, a.appointment_id as string);
      return { ok: !!r, record: { total: r?.total, discount_total: r?.discount_total } };
    },
  },
  {
    name: "propose_record_cash_or_bank_receipt",
    description: "Prepares recording that the owner has received the remaining balance for an appointment in cash or by bank transfer (records money already received; processes no payment). Does NOT act until Jaycee confirms.",
    write: true,
    params: {
      appointment_id: { type: "string", description: "Appointment id" },
      method: { type: "string", description: "How the money was received", enum: ["cash", "bank"] },
      reference: { type: "string", description: "Bank reference (required for bank)" },
      balance: { type: "number", description: "Balance due being settled, in TTD" },
    },
    required: ["appointment_id", "method", "balance"],
    prepare: (_c, a) => {
      const method = oneOf(a, "method", ["cash", "bank"]);
      return { appointment_id: uuid(a, "appointment_id"), method, reference: method === "bank" ? text(a, "reference", 80) : text(a, "reference", 80, true), balance: num(a, "balance", 0.01, 100000) };
    },
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      const n = await clientNames(c, [r?.client_id ?? null]);
      return `Record ${ttd(a.balance)} received by ${a.method}${a.reference ? ` (ref ${a.reference})` : ""} for ${n[r?.client_id] ?? "the client"}'s appointment on ${salonTime(r?.starts_at ?? null)}. No card or payment is processed.`;
    },
    execute: async (c, a) => {
      const receipt = await rpc(c, "lj_complete_appointment_payment", { p_id: a.appointment_id, p_method: a.method, p_reference: a.reference ?? "", p_expected_balance: a.balance });
      const r = await readAppt(c, a.appointment_id as string);
      return { ok: !!r, record: { receipt, status: r?.status } };
    },
  },
  {
    name: "propose_adjust_backbar",
    description: "Prepares adjusting backbar stock (restock, manual use or correction). Does NOT change stock until Jaycee confirms.",
    write: true,
    params: {
      item_id: { type: "string", description: "Backbar item id" },
      delta: { type: "number", description: "Change in remaining amount (negative to reduce)" },
      kind: { type: "string", description: "Adjustment type", enum: ["restock", "manual", "correction"] },
      reason: { type: "string", description: "Short reason" },
    },
    required: ["item_id", "delta", "kind", "reason"],
    prepare: (_c, a) => ({ item_id: uuid(a, "item_id"), delta: num(a, "delta", -10000, 10000), kind: oneOf(a, "kind", ["restock", "manual", "correction"]), reason: text(a, "reason", 200) }),
    describe: async (c, a) => {
      const r = must(await c.sb.from("lj_backbar_items").select("name,tracking_method,quantity,applications_remaining").eq("id", a.item_id as string).maybeSingle()) as any;
      if (!r) throw new MariaError("Backbar item not found.");
      return `Adjust backbar “${r.name}” by ${Number(a.delta) > 0 ? "+" : ""}${a.delta} (${a.kind}: ${a.reason}). Currently ${backbarRemaining(r)} remaining.`;
    },
    execute: async (c, a) => {
      const before = must(await c.sb.from("lj_backbar_items").select("tracking_method,quantity,applications_remaining").eq("id", a.item_id as string).maybeSingle()) as any;
      await rpc(c, "lj_adjust_backbar", { p_item: a.item_id, p_delta: a.delta, p_kind: a.kind, p_reason: a.reason, p_request_key: crypto.randomUUID() });
      const after = must(await c.sb.from("lj_backbar_items").select("name,tracking_method,quantity,applications_remaining").eq("id", a.item_id as string).maybeSingle()) as any;
      return { ok: !!after, record: { name: after?.name, before: before && backbarRemaining(before), after: after && backbarRemaining(after) } };
    },
  },
  {
    name: "propose_set_product_stock",
    description: "Prepares setting a retail product's stock count (e.g. after a recount or delivery). Does NOT change stock until Jaycee confirms.",
    write: true,
    params: { product_id: { type: "string", description: "Product id from list_products" }, stock: { type: "integer", description: "New stock count (0 or more)" } },
    required: ["product_id", "stock"],
    prepare: (_c, a) => ({ product_id: uuid(a, "product_id"), stock: Math.round(num(a, "stock", 0, 100000)!) }),
    describe: async (c, a) => {
      const r = must(await c.sb.from("lj_products").select("name,stock").eq("id", a.product_id as string).maybeSingle()) as any;
      if (!r) throw new MariaError("Product not found.");
      return `Set stock for “${r.name}” from ${r.stock} to ${a.stock}.`;
    },
    execute: async (c, a) => {
      await rpc(c, "lj_maria_set_product_stock", { p_id: a.product_id, p_stock: a.stock });
      const r = must(await c.sb.from("lj_products").select("name,stock").eq("id", a.product_id as string).maybeSingle()) as any;
      return { ok: r?.stock === a.stock, record: r };
    },
  },
  {
    name: "propose_update_service",
    description:
      "Prepares editing a service's name, description, duration, price or booking availability. Only the fields you pass change. Does NOT save until Jaycee confirms.",
    write: true,
    params: {
      service_id: { type: "string", description: "Service id from list_services" },
      name: { type: "string", description: "New name" },
      description: { type: "string", description: "New client-facing description" },
      duration_minutes: { type: "integer", description: "New duration in minutes (15-minute steps, 15 to 480)" },
      price: { type: "number", description: "New price in TTD (0 or more)" },
      active: { type: "boolean", description: "true = available for booking, false = hidden" },
    },
    required: ["service_id"],
    prepare: async (c, a) => {
      const id = uuid(a, "service_id")!;
      const s = must(await c.sb.from("lj_services").select("id").eq("id", id).is("deleted_at", null).maybeSingle()) as any;
      if (!s) throw new MariaError("Service not found.");
      const changes: Args = {};
      if (a.name !== undefined && a.name !== "") changes.name = text(a, "name", 120);
      if (a.description !== undefined && a.description !== "") changes.description = text(a, "description", 2000);
      if (a.duration_minutes !== undefined && a.duration_minutes !== "") {
        const d = num(a, "duration_minutes", 15, 480)!;
        if (d % 15) throw new MariaError("duration_minutes must be in 15-minute steps.");
        changes.duration = d;
      }
      if (a.price !== undefined && a.price !== "") changes.price = Math.round(num(a, "price", 0, 100000)! * 100) / 100;
      if (a.active !== undefined && a.active !== "") changes.active = bool(a, "active");
      if (!Object.keys(changes).length) throw new MariaError("Tell me what to change: name, description, duration, price or availability.");
      return { service_id: id, changes };
    },
    describe: async (c, a) => {
      const s = must(await c.sb.from("lj_services").select("name,description,duration,price,active").eq("id", a.service_id as string).maybeSingle()) as any;
      if (!s) throw new MariaError("Service not found.");
      const ch = a.changes as Args;
      const parts: string[] = [];
      if (ch.name !== undefined) parts.push(`name from “${s.name}” to “${ch.name}”`);
      if (ch.description !== undefined) parts.push(`description to “${String(ch.description).slice(0, 160)}”`);
      if (ch.duration !== undefined) parts.push(`duration from ${s.duration} to ${ch.duration} minutes`);
      if (ch.price !== undefined) parts.push(`price from ${ttd(s.price)} to ${ttd(ch.price)}`);
      if (ch.active !== undefined) parts.push(ch.active ? "make it available for booking" : "hide it from booking");
      return `Update the service “${s.name}”: ${parts.join("; ")}. Existing appointments keep their booked prices.`;
    },
    execute: async (c, a) => {
      const ch = a.changes as Args;
      const values: Args = { ...ch };
      if (ch.active === true) values.bookable = true;
      const rows = must(await c.sb.from("lj_services").update(values).eq("id", a.service_id as string).is("deleted_at", null).select("id")) as any[];
      if (!rows.length) throw new MariaError("Service not found, so nothing was saved.");
      const r = must(await c.sb.from("lj_services").select("name,description,duration,price,active").eq("id", a.service_id as string).maybeSingle()) as any;
      const ok = !!r && Object.entries(ch).every(([k, v]) => (k === "price" ? Number(r[k]) === Number(v) : r[k] === v));
      return { ok, record: r && { ...r, price: ttd(r.price) } };
    },
  },
  {
    name: "propose_update_product",
    description:
      "Prepares editing a retail product's name, description, price, low-stock alert level or boutique availability. Only the fields you pass change. Use propose_set_product_stock for stock counts. Does NOT save until Jaycee confirms.",
    write: true,
    params: {
      product_id: { type: "string", description: "Product id from list_products" },
      name: { type: "string", description: "New name" },
      description: { type: "string", description: "New description and ingredients" },
      price: { type: "number", description: "New price in TTD (0 or more)" },
      reorder_level: { type: "integer", description: "Low-stock alert level, 0 to 10000 (0 = off)" },
      active: { type: "boolean", description: "true = shown in boutique, false = hidden" },
    },
    required: ["product_id"],
    prepare: async (c, a) => {
      const id = uuid(a, "product_id")!;
      const p = must(await c.sb.from("lj_products").select("id").eq("id", id).is("deleted_at", null).maybeSingle()) as any;
      if (!p) throw new MariaError("Product not found.");
      const changes: Args = {};
      if (a.name !== undefined && a.name !== "") changes.name = text(a, "name", 120);
      if (a.description !== undefined && a.description !== "") changes.description = text(a, "description", 2000);
      if (a.price !== undefined && a.price !== "") changes.price = Math.round(num(a, "price", 0, 100000)! * 100) / 100;
      if (a.reorder_level !== undefined && a.reorder_level !== "") changes.reorder_level = Math.round(num(a, "reorder_level", 0, 10000)!);
      if (a.active !== undefined && a.active !== "") changes.active = bool(a, "active");
      if (!Object.keys(changes).length) throw new MariaError("Tell me what to change: name, description, price, alert level or availability.");
      return { product_id: id, changes };
    },
    describe: async (c, a) => {
      const p = must(await c.sb.from("lj_products").select("name,price,reorder_level").eq("id", a.product_id as string).maybeSingle()) as any;
      if (!p) throw new MariaError("Product not found.");
      const ch = a.changes as Args;
      const parts: string[] = [];
      if (ch.name !== undefined) parts.push(`name from “${p.name}” to “${ch.name}”`);
      if (ch.description !== undefined) parts.push(`description to “${String(ch.description).slice(0, 160)}”`);
      if (ch.price !== undefined) parts.push(`price from ${ttd(p.price)} to ${ttd(ch.price)}`);
      if (ch.reorder_level !== undefined) parts.push(`low-stock alert from ${p.reorder_level} to ${ch.reorder_level}`);
      if (ch.active !== undefined) parts.push(ch.active ? "show it in the boutique" : "hide it from the boutique");
      return `Update the product “${p.name}”: ${parts.join("; ")}.`;
    },
    execute: async (c, a) => {
      const ch = a.changes as Args;
      const rows = must(await c.sb.from("lj_products").update(ch).eq("id", a.product_id as string).is("deleted_at", null).select("id")) as any[];
      if (!rows.length) throw new MariaError("Product not found, so nothing was saved.");
      const r = must(await c.sb.from("lj_products").select("name,description,price,reorder_level,active,stock").eq("id", a.product_id as string).maybeSingle()) as any;
      const ok = !!r && Object.entries(ch).every(([k, v]) => (k === "price" ? Number(r[k]) === Number(v) : r[k] === v));
      return { ok, record: r && { ...r, price: ttd(r.price) } };
    },
  },
  {
    name: "propose_reschedule_appointment",
    description:
      "Prepares moving a pending or confirmed regular appointment to a new start time, keeping its length and price. Regular hours only (Tuesday to Saturday, ending by 18:00); VIP times must be rebooked. Check availability first. Does NOT move it until Jaycee confirms.",
    write: true,
    params: {
      appointment_id: { type: "string", description: "Appointment id" },
      start: { type: "string", description: "New start, ISO date-time with offset, e.g. 2026-11-03T10:00:00-04:00" },
    },
    required: ["appointment_id", "start"],
    prepare: async (c, a) => {
      const r = await readAppt(c, uuid(a, "appointment_id")!);
      if (!r || r.kind !== "appointment") throw new MariaError("Appointment not found.");
      if (!["pending", "confirmed"].includes(r.status)) throw new MariaError(`This appointment is ${r.status}, so it cannot be moved.`);
      if (r.is_vip) throw new MariaError("VIP appointments are priced by time, so please cancel and rebook instead.");
      const start = iso(a, "start");
      const length = Date.parse(r.ends_at) - Date.parse(r.starts_at);
      const end = new Date(Date.parse(start) + length).toISOString();
      if (Date.parse(start) <= Date.now()) throw new MariaError("The new time must be in the future.");
      // Salon time is UTC-4 all year.
      const local = new Date(Date.parse(start) - 4 * 3600000);
      const localEnd = new Date(Date.parse(end) - 4 * 3600000);
      const dow = local.getUTCDay();
      const startMin = local.getUTCHours() * 60 + local.getUTCMinutes();
      const endMin = localEnd.getUTCHours() * 60 + localEnd.getUTCMinutes() + (localEnd.getUTCDate() !== local.getUTCDate() ? 1440 : 0);
      if (dow < 2 || startMin < 600 || endMin > 1080)
        throw new MariaError("Rescheduling is limited to regular hours, Tuesday to Saturday, finishing by 18:00. For VIP times, cancel and rebook.");
      return { appointment_id: r.id, start, end, from: r.starts_at, expected_updated_at: r.updated_at ?? null };
    },
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      const n = await clientNames(c, [r?.client_id ?? null]);
      return `Move ${n[r?.client_id] ?? "the client"}'s appointment from ${salonTime(a.from as string)} to ${salonTime(a.start as string)}, keeping the same services and price.`;
    },
    execute: async (c, a) => {
      let q = c.sb.from("lj_calendar").update({ starts_at: a.start, ends_at: a.end }).eq("id", a.appointment_id as string).eq("kind", "appointment").in("status", ["pending", "confirmed"]);
      if (a.expected_updated_at) q = q.eq("updated_at", a.expected_updated_at as string);
      const res = await q.select("id");
      if (res.error) {
        if (/excl|overlap|conflict/i.test(res.error.message)) throw new MariaError("That time overlaps another booking or block, so nothing was moved.");
        throw new MariaError(res.error.message.slice(0, 300));
      }
      if (!res.data?.length) throw new MariaError("The appointment changed since this was prepared, so nothing was moved.");
      const r = await readAppt(c, a.appointment_id as string);
      return { ok: !!r && Date.parse(r.starts_at) === Date.parse(a.start as string), record: r && apptView(r, {}) };
    },
  },
  {
    name: "propose_mark_appointment_completed",
    description: "Prepares marking a confirmed appointment as completed (service done). Payment is separate. Does NOT change it until Jaycee confirms.",
    write: true,
    params: { appointment_id: { type: "string", description: "Appointment id" } },
    required: ["appointment_id"],
    prepare: async (c, a) => {
      const r = await readAppt(c, uuid(a, "appointment_id")!);
      if (!r || r.kind !== "appointment") throw new MariaError("Appointment not found.");
      if (r.status !== "confirmed") throw new MariaError(`This appointment is ${r.status}; only confirmed appointments can be completed.`);
      return { appointment_id: r.id };
    },
    describe: async (c, a) => {
      const r = await readAppt(c, a.appointment_id as string);
      const n = await clientNames(c, [r?.client_id ?? null]);
      return `Mark ${n[r?.client_id] ?? "the client"}'s appointment on ${salonTime(r?.starts_at ?? null)} as completed. Any balance due stays outstanding.`;
    },
    execute: async (c, a) => {
      must(await c.sb.from("lj_calendar").update({ status: "completed" }).eq("id", a.appointment_id as string).eq("status", "confirmed").select("id").single());
      const r = await readAppt(c, a.appointment_id as string);
      return { ok: r?.status === "completed", record: r && apptView(r, {}) };
    },
  },
];

tools.push(...createManagementTools((message) => { throw new MariaError(message); }));

export const toolByName = (name: string) => tools.find((t) => t.name === name);

// ---------- dispatch ----------
export type Proposal = { id: string; tool: string; summary: string; hash: string; expires_at: string };

/** Runs a read tool, or stages a write tool as a pending proposal. */
export async function callTool(c: Ctx, name: string, args: Args): Promise<{ result: unknown; proposal?: Proposal }> {
  const tool = toolByName(name);
  if (!tool) throw new MariaError(`Unknown tool ${name}.`);
  if (!tool.write) return { result: await tool.run!(c, args ?? {}) };
  const clean = await tool.prepare!(c, args ?? {});
  const summary = await tool.describe!(c, clean);
  const row = must(await c.sb.rpc("lj_maria_stage", { p_tool: name, p_args: clean, p_summary: summary })) as any;
  const proposal: Proposal = { id: row.id, tool: name, summary: row.summary, hash: row.payload_hash, expires_at: row.expires_at };
  return {
    proposal,
    result: {
      status: "awaiting_confirmation",
      proposal_id: row.id,
      summary: row.summary,
      instruction: "Nothing has changed yet. Read this summary to Jaycee and ask for her explicit approval. She approves with the Approve button or by saying 'confirm'. Do not say it is done.",
    },
  };
}

/** Executes a staged proposal after Jaycee's confirmation, then verifies it by reading the data back. */
export async function confirmProposal(c: Ctx, id: string, hash: string) {
  if (!UUID.test(id)) throw new MariaError("Invalid proposal.");
  const row = must(await c.sb.rpc("lj_maria_begin", { p_id: id, p_hash: String(hash) })) as any;
  const tool = toolByName(row.tool);
  if (!tool?.execute) {
    await c.sb.rpc("lj_maria_finish", { p_id: id, p_ok: false, p_result: null, p_error: "Unknown tool" });
    throw new MariaError("This change type is no longer supported.");
  }
  try {
    const out = await tool.execute(c, row.args);
    await c.sb.rpc("lj_maria_finish", { p_id: id, p_ok: out.ok, p_result: out.record ?? null, p_error: out.ok ? null : "Saved, but the read-back did not match." });
    return { status: out.ok ? "executed_and_verified" : "executed_unverified", summary: row.summary, verified_record: out.record };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Change failed";
    await c.sb.rpc("lj_maria_finish", { p_id: id, p_ok: false, p_result: null, p_error: message });
    return { status: "failed", summary: row.summary, error: message };
  }
}

export async function declineProposal(c: Ctx, id: string) {
  if (!UUID.test(id)) throw new MariaError("Invalid proposal.");
  must(await c.sb.rpc("lj_maria_decline", { p_id: id }));
  return { status: "declined" };
}

// ---------- persona ----------
export const MARIA_PROMPT = `You are Maria, the executive assistant to Jaycee, the owner of Lady J International Beauty Academy & Salon in Petit Valley, Trinidad and Tobago. Always address her as Jaycee. You are warm, calm, sharp and professional, like a trusted chief of staff, and you speak in short natural sentences suited to voice. Times are America/Port_of_Spain. The salon is open Tuesday to Saturday, 10:00 to 18:00; Sunday and Monday are VIP-only.

You have live access to the same business information Jaycee sees in her Owner Dashboard, through tools: overview, appointments, VIP requests, calendar blocks, availability, clients, services, products, backbar inventory, vendors, consultations, payments, reports, royalty insights and settings. You can also prepare edits to services (name, description, duration, price, availability) and products, reschedule regular appointments and mark visits completed. Look things up with tools instead of guessing, and never invent records, names, prices or numbers. If a tool returns nothing, say so plainly.

Development Test Owner has the same supported management tools as any verified Owner. There is no read-only demo restriction. Use get_management_schema to discover creation, editing and removal for services, products, workshops, clients, vendors, inventory, offers, expenses and settings, plus transactional owner workflows. Use list_management_records with pagination to read every available record, including inactive catalog entries. Use get_gifts_referrals for stored-value and referral information. Never invent an unavailable operation. Prepare one change at a time, then wait for Jaycee to approve before preparing another. Cancel appointments and archive catalog/client records through their existing workflows; never destructively erase financial or appointment history.

CHANGES REQUIRE JAYCEE'S EXPLICIT CONFIRMATION, with no exceptions. To change anything, call the matching propose_* tool. That only prepares the change; nothing is saved. Then explain in one or two sentences exactly what will change and ask Jaycee to confirm. She confirms with the Approve button or by clearly saying "confirm" or "yes, go ahead". You cannot confirm on her behalf and have no tool to execute a change. After she approves, the app runs the change and sends you a message beginning with [APP RESULT] containing the verified result. Those messages come from the app, not from Jaycee. Only after one arrives do you tell her it is done, using the verified details; if she says "confirm" and no [APP RESULT] has arrived yet, say you are saving it and wait. If she declines or hesitates, do not retry; ask what she would like instead. If a change fails, say so honestly and explain why.

Rules: never claim an action happened before the verified result arrives. Never process card payments or contact clients; recording that Jaycee received cash or a bank transfer is allowed only through its propose tool. For client searches, confirm which client she means if there are several matches. Before booking, check availability. Keep answers concise; offer a short next step. Occasionally and briefly check on Jaycee's wellbeing, and gently remind her to eat and take breaks.`;
