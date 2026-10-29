// Run by the agent with DEVELOPMENT env and the URL returned by get_supabase_connection.
// Uses only the existing Test Owner session; never prints passwords, JWTs or voice tokens.
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const expectedUrl = process.argv[2];
if (process.env.EXPO_PUBLIC_CURRENT_ENV !== "DEVELOPMENT" || !expectedUrl || process.env.EXPO_PUBLIC_SUPABASE_URL !== expectedUrl) throw Error("Current Development connection must be verified before testing.");
const sb = createClient(expectedUrl, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const outcomes = [];
const pass = name => { outcomes.push({ name, status: "passed" }); console.log("PASS:", name); };
async function invoke(body, fn = "maria-agent") {
  const response = await sb.functions.invoke(fn, { body });
  if (response.error) {
    let message = response.error.message;
    try { message = (await response.error.context.json()).error ?? message; } catch { /* no JSON error body */ }
    throw Error(message);
  }
  if (response.data?.error) throw Error(response.data.error);
  return response.data;
}
async function tool(name, args = {}) { return invoke({ action: "tool", name, arguments: args }); }
async function confirm(staged) {
  assert.ok(staged.proposal);
  return invoke({ action: "confirm", proposal_id: staged.proposal.id, hash: staged.proposal.hash });
}
async function save(entity, fields, record_id) {
  const staged = await tool("propose_save_record", { entity, data_json: JSON.stringify(fields), ...(record_id ? { record_id } : {}) });
  assert.equal(staged.result.status, "awaiting_confirmation");
  const result = await confirm(staged);
  assert.equal(result.status, "executed_and_verified", JSON.stringify(result));
  return result.verified_record;
}
async function remove(entity, record_id) {
  const staged = await tool("propose_delete_record", { entity, record_id });
  const result = await confirm(staged);
  assert.equal(result.status, "executed_and_verified", JSON.stringify(result));
  if (entity === "service") {
    const catalog = await sb.from("lj_public_services").select("id").eq("id", record_id);
    assert.equal(catalog.error, null);
    assert.equal(catalog.data.length, 0, "Removed services must disappear from Client Mode even under Owner RLS");
  }
}
async function main() {
  const login = await sb.auth.signInWithPassword({ email: process.env.EXPO_PUBLIC_DEV_OWNER_EMAIL, password: process.env.EXPO_PUBLIC_DEV_OWNER_PASSWORD });
  if (login.error) throw login.error;
  assert.equal((await sb.rpc("lj_is_owner")).data, true);
  pass("Automatic Development Test Owner session and owner RLS access");
  const schema = await tool("get_management_schema");
  assert.ok(schema.result.records.service && schema.result.operations.schedule_consultation);
  pass("Maria management schema discovery");
  for (const entity of [...Object.keys(schema.result.records), ...Object.keys(schema.result.read_only_records)]) {
    // read_only_records is an array, handled below rather than its numeric indices.
    if (/^\d+$/.test(entity)) continue;
    const response = await tool("list_management_records", { entity, limit: 5 });
    assert.ok(Array.isArray(response.result.records));
    pass(`Maria paginated ${entity} records`);
  }
  for (const entity of schema.result.read_only_records) {
    await tool("list_management_records", { entity, limit: 5 });
    pass(`Maria ${entity} access`);
  }
  for (const name of ["get_overview", "list_appointments", "list_vip_requests", "list_calendar_blocks", "list_services", "list_products", "list_backbar_inventory", "list_vendors", "list_consultations", "list_payments", "get_report", "get_royalty_insights", "get_business_settings", "get_gifts_referrals"]) {
    await tool(name); pass(name);
  }
  const prefix = `DEMO VERIFY ${Date.now()}`;
  const cases = [
    ["service", { name: prefix + " service", category: "Hair", description: "Fictional verification service", duration: 30, price: 100 }],
    ["product", { name: prefix + " product", category: "Hair care", brand: "Demo", price: 25, stock: 5, reorder_level: 1 }],
    ["workshop", { name: prefix + " workshop", instructor: "Demo instructor", price: 50 }],
    ["client", { first_name: "Demo", last_name: prefix, email: `verify-${Date.now()}@demo.invalid` }],
    ["vendor", { name: prefix + " vendor", company: "Fictional verification vendor" }],
    ["backbar", { name: prefix + " backbar", tracking_method: "applications", applications_remaining: 20, applications_per_container: 20 }],
    ["expense", { spent_on: new Date().toISOString().slice(0, 10), category: "Supplies", description: prefix + " expense", amount: 1 }],
    ["discount", { name: prefix + " discount", percentage: 5, scope: "service" }],
    ["promotion", { name: prefix + " promotion", description: "Fictional verification promotion" }],
  ];
  for (const [entity, fields] of cases) {
    const staged = await tool("propose_save_record", { entity, data_json: JSON.stringify(fields) });
    const table = { service: "lj_services", product: "lj_products", workshop: "lj_workshops", client: "lj_client_records", vendor: "lj_vendors", backbar: "lj_backbar_items", expense: "lj_expenses", discount: "lj_discounts", promotion: "lj_promotions" }[entity];
    const key = entity === "client" ? "last_name" : entity === "expense" ? "description" : "name";
    const before = await sb.from(table).select("*").eq(key, fields[key]);
    assert.equal(before.error, null);
    assert.equal(before.data.length, 0, "Proposal must not create a record before confirmation");
    const created = await confirm(staged);
    assert.equal(created.status, "executed_and_verified", JSON.stringify(created));
    const recordId = created.verified_record.id;
    try {
      const patch = entity === "client" ? { private_notes: "Confirmed verification edit" } : entity === "vendor" || entity === "backbar" ? { notes: "Confirmed verification edit" } : { description: "Confirmed verification edit" };
      if (entity === "discount") { delete patch.description; patch.percentage = 6; }
      await save(entity, patch, recordId);
      if (entity === "service") {
        const declined = await tool("propose_save_record", { entity, record_id: recordId, data_json: '{"price":777}' });
        await invoke({ action: "decline", proposal_id: declined.proposal.id });
        await assert.rejects(confirm(declined));
        assert.equal((await sb.from(table).select("price").eq("id", recordId).single()).data.price, 100);
        const stale = await tool("propose_save_record", { entity, record_id: recordId, data_json: '{"price":999}' });
        await save(entity, { description: "Later explicitly approved change" }, recordId);
        await assert.rejects(confirm(stale), /changed after the proposal/);
        await assert.rejects(confirm(staged));
        pass("Confirmation required; decline, stale proposal and duplicate approval protected");
      }
      pass(`Maria real confirmed ${entity} create and update`);
    } finally { await remove(entity, recordId); }
    pass(`Maria confirmed ${entity} removal with existing history rules`);
  }
  const vendor = (await tool("list_management_records", { entity: "vendor", limit: 50 })).result.records.find(v => !v.archived_at);
  const purchase = await save("vendor_purchase", { vendor_id: vendor.id, inventory_kind: "backbar", item_name: prefix + " supply", quantity: 1, unit_cost: 2, purchase_date: new Date().toISOString().slice(0, 10) });
  await save("vendor_purchase", { payment_status: "outstanding" }, purchase.id);
  await remove("vendor_purchase", purchase.id);
  pass("Maria confirmed vendor purchase create, update and audited void");
  const royalty = await sb.rpc("lj_my_rewards");
  assert.equal(royalty.error, null);
  pass("Client Royalty account and reward access");
  const clientAppointments = await sb.from("lj_calendar").select("id").eq("customer_id", login.data.user.id);
  assert.equal(clientAppointments.error, null); assert.ok(clientAppointments.data.length > 0);
  pass("Client test account has editable Development appointment records");
  const anonymous = createClient(expectedUrl, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const unauthorized = await anonymous.functions.invoke("maria-agent", { body: { action: "tool", name: "get_overview" } });
  assert.ok(unauthorized.error);
  pass("Unauthenticated backend owner access remains rejected");
  for (const [name, fn, body] of [
    ["OpenAI typed conversation", "maria-agent", { action: "chat", message: "Hello Maria. Greet me by name without changing any records.", history: [] }],
    ["ElevenLabs token and agent configuration", "maria-voice-token", {}],
  ]) {
    try {
      const response = await invoke(body, fn);
      if (fn === "maria-agent") assert.match(response.reply, /Jaycee/i);
      else { assert.ok(response.token); assert.equal(response.configuration?.error, undefined, JSON.stringify(response.configuration)); }
      pass(name);
    } catch (error) { outcomes.push({ name, status: "blocked", reason: error.message }); console.log("BLOCKED:", name, error.message); }
  }
  console.log("RESULTS_JSON=" + JSON.stringify(outcomes));
}
async function workflows() {
  const login = await sb.auth.signInWithPassword({ email: process.env.EXPO_PUBLIC_DEV_OWNER_EMAIL, password: process.env.EXPO_PUBLIC_DEV_OWNER_PASSWORD });
  if (login.error) throw login.error;
  const leftovers = await sb.from("lj_calendar").select("id").like("note", "DEMO WORKFLOW%").in("status", ["pending", "confirmed"]);
  for (const row of leftovers.data ?? []) await confirm(await tool("propose_cancel_appointment", { appointment_id: row.id }));
  const label = `DEMO WORKFLOW ${Date.now()}`;
  const service = await save("service", { name: label, category: "Hair", duration: 30, price: 100 });
  const client = await save("client", { first_name: "Demo", last_name: label });
  const perform = async (name, args) => {
    const result = await confirm(await tool(name, args));
    assert.equal(result.status, "executed_and_verified", JSON.stringify(result));
    return result.verified_record;
  };
  try {
    const day = new Date(Date.now() + 20 * 86400000);
    while (![2, 3, 4, 5, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    await tool("check_availability", { service_id: service.id, date });
    const appointment = await perform("propose_book_appointment", { client_id: client.id, service_id: service.id, start: `${date}T10:00:00-04:00`, note: label });
    pass("Maria creates a real manual Development appointment");
    await perform("propose_reschedule_appointment", { appointment_id: appointment.id, start: `${date}T10:30:00-04:00` });
    pass("Maria reschedules the appointment with price and duration preserved");
    const payment = await sb.from("lj_transactions").select("id,amount").eq("appointment_id", appointment.id).eq("status", "pending").single();
    assert.equal(payment.error, null);
    await perform("propose_verify_payment", { payment_id: payment.data.id });
    const current = await sb.from("lj_calendar").select("total").eq("id", appointment.id).single();
    await perform("propose_record_cash_or_bank_receipt", { appointment_id: appointment.id, method: "cash", balance: Number(current.data.total) - Number(payment.data.amount) });
    await perform("propose_mark_appointment_completed", { appointment_id: appointment.id });
    pass("Maria verifies a demo bank deposit, records the balance and completes the appointment");
    const next = new Date(day); next.setUTCDate(next.getUTCDate() + 7);
    const second = await perform("propose_book_appointment", { client_id: client.id, service_id: service.id, start: `${next.toISOString().slice(0, 10)}T10:00:00-04:00`, note: label + " cancellation test" });
    await perform("propose_cancel_appointment", { appointment_id: second.id });
    pass("Maria cancels a real demo appointment through the existing ledger rules");
    const block = await perform("propose_block_time", { start: `${date}T12:00:00-04:00`, end: `${date}T12:30:00-04:00`, reason: "personal", description: label });
    const overlap = await tool("propose_block_time", { start: `${date}T12:00:00-04:00`, end: `${date}T12:30:00-04:00`, reason: "training", description: label });
    await assert.rejects(confirm(overlap), /overlap|conflict|reservation/i);
    await perform("propose_delete_calendar_block", { block_id: block.block.id });
    pass("Maria creates/removes blocked time; conflicting time is rejected");
    const workshopPurchase = await sb.from("lj_purchases").select("id").eq("kind", "workshop").in("status", ["paid", "processing", "ready", "fulfilled"]).limit(1).single();
    assert.equal(workshopPurchase.error, null);
    const access = await perform("propose_owner_operation", { operation: "set_workshop_attendance", arguments_json: JSON.stringify({ p_purchase_id: workshopPurchase.data.id, p_attended: true, p_certificate_url: "" }) });
    assert.equal(access.attended, true);
    pass("Maria manages attendance for the paid demo workshop");
  } finally {
    const unfinished = await sb.from("lj_calendar").select("id").eq("client_id", client.id).in("status", ["pending", "confirmed"]);
    for (const row of unfinished.data ?? []) await confirm(await tool("propose_cancel_appointment", { appointment_id: row.id }));
    await remove("client", client.id);
    await remove("service", service.id);
  }
  console.log("RESULTS_JSON=" + JSON.stringify(outcomes));
}
async function approvals() {
  const login = await sb.auth.signInWithPassword({ email: process.env.EXPO_PUBLIC_DEV_OWNER_EMAIL, password: process.env.EXPO_PUBLIC_DEV_OWNER_PASSWORD });
  if (login.error) throw login.error;
  const perform = async (name, args) => {
    const result = await confirm(await tool(name, args));
    assert.equal(result.status, "executed_and_verified", JSON.stringify(result));
    return result.verified_record;
  };
  const vip = await sb.from("lj_calendar").select("id").eq("note", "DEMO VERIFY VIP approval").eq("approval_status", "pending").single();
  assert.equal(vip.error, null);
  await perform("propose_review_vip_request", { appointment_id: vip.data.id, approve: true });
  await perform("propose_cancel_appointment", { appointment_id: vip.data.id });
  pass("Maria approves and cancels a fictional VIP request without an Auth customer");
  const request = await sb.from("lj_consultation_requests").select("id").eq("summary", "DEMO VERIFY consultation scheduling").eq("status", "new").single();
  assert.equal(request.error, null);
  const date = new Date(Date.now() + 30 * 86400000);
  while (![2, 3, 4, 5, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  const day = date.toISOString().slice(0, 10);
  const operation = async (name, args) => perform("propose_owner_operation", { operation: name, arguments_json: JSON.stringify(args) });
  await operation("schedule_consultation", { p_id: request.data.id, p_start: `${day}T10:00:00-04:00` });
  await operation("reschedule_consultation", { p_id: request.data.id, p_start: `${day}T11:00:00-04:00` });
  await operation("cancel_consultation", { p_id: request.data.id });
  pass("Maria schedules, reschedules and cancels a real Development consultation");
  console.log("RESULTS_JSON=" + JSON.stringify(outcomes));
}
const run = process.argv[3] === "flows" ? workflows : process.argv[3] === "approvals" ? approvals : main;
run().catch(error => { console.error("FAILED:", error.message); process.exitCode = 1; });
