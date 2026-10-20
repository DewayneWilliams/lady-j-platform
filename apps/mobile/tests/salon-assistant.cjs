const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};
const { ownerAttention, dailyBrief, isLowStock } = require("../lib/salon/ownerAssistant.ts");
const appointment = {
  id: "a",
  kind: "appointment",
  customer_id: "client",
  starts_at: "2026-10-20T14:00:00Z",
  ends_at: "2026-10-20T15:00:00Z",
  status: "completed",
  total: 100,
  deposit: 50,
  deposit_paid: true,
  services: [{ name: "Care", price: 100 }],
};
test("completed balances use verified receipts rather than the deposit flag or unpaid requests", () => {
  const pending = { id: "t", appointment_id: "a", amount: 100, status: "pending" };
  let tasks = ownerAttention([appointment], [pending], [], [], []);
  assert.equal(tasks.find((v) => v.key === "balances").detail, "$100 remains to be recorded.");
  tasks = ownerAttention([appointment], [{ ...pending, status: "verified" }], [], [], []);
  assert.equal(
    tasks.some((v) => v.key === "balances"),
    false,
  );
});
test("stock alerts respect disabled thresholds and archived products", () => {
  assert.equal(isLowStock({ active: true, stock: 3, reorder_level: 3 }), true);
  assert.equal(isLowStock({ active: true, stock: 0, reorder_level: 0 }), false);
  assert.equal(isLowStock({ active: false, stock: 0, reorder_level: 3 }), false);
});
test("attention excludes unpaid fulfillment, completed waitlists and settled appointments", () => {
  const tasks = ownerAttention(
    [],
    [],
    [
      { kind: "product", status: "pending" },
      { kind: "workshop", status: "paid" },
    ],
    [],
    [{ status: "booked" }],
  );
  assert.equal(tasks.length, 0);
});
test("daily briefing selects the next active visit in chronological order", () => {
  const later = {
    ...appointment,
    id: "b",
    status: "confirmed",
    starts_at: "2026-10-20T16:00:00Z",
    ends_at: "2026-10-20T17:00:00Z",
    services: [{ name: "Later visit" }],
  };
  const earlier = { ...appointment, status: "pending" };
  const summary = dailyBrief(
    [later, earlier, { ...earlier, id: "cancelled", status: "cancelled" }],
    new Date("2026-10-20T13:00:00Z"),
  );
  assert.match(summary, /Care/);
  assert.match(summary, /2 visits remaining/);
  assert.doesNotMatch(dailyBrief([appointment], new Date("2026-10-20T18:00:00Z")), /are finished/);
});
function nativeStore() {
  const values = new Map();
  let fail = false;
  const secure = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
    async getItemAsync(key) {
      return values.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      if (fail && key.split(".").length > 1) throw new Error("Keychain unavailable");
      assert.ok(Buffer.byteLength(value) < 2048);
      values.set(key, Buffer.from(value).toString("utf8"));
    },
    async deleteItemAsync(key) {
      values.delete(key);
    },
  };
  const output = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(require.resolve("../lib/salon/sessionStorage.native.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(source, {
    exports: output.exports,
    require: () => secure,
    Map,
    Date,
    Math,
    Promise,
    JSON,
    Error,
  });
  return {
    store: output.exports.sessionStorage,
    values,
    failWrites: () => {
      fail = true;
    },
  };
}
test("native sessions securely round-trip large Unicode sessions and clear all chunks on sign-out", async () => {
  const { store, values } = nativeStore();
  const session = "a".repeat(399) + "😀".repeat(1200) + "\n" + "é".repeat(2500);
  await store.setItem("session", session);
  assert.equal(await store.getItem("session"), session);
  await store.removeItem("session");
  assert.equal(await store.getItem("session"), null);
  assert.equal(values.size, 0);
});
test("interrupted native session writes preserve the last committed session", async () => {
  const { store, failWrites } = nativeStore();
  await store.setItem("session", "previous");
  failWrites();
  await assert.rejects(store.setItem("session", "updated"));
  assert.equal(await store.getItem("session"), "previous");
});

const {
  appointmentDuration,
  contactIsMinor,
  appointmentPrep,
  nextClientPrep,
} = require("../lib/salon/ownerPrep.ts");
test("appointment duration formats hours and minutes without rounding to whole hours", () => {
  assert.equal(
    appointmentDuration("2026-10-20T14:00:00Z", "2026-10-20T15:30:00Z"),
    "1 hour 30 minutes",
  );
  assert.equal(appointmentDuration("2026-10-20T14:00:00Z", "2026-10-20T16:00:00Z"), "2 hours");
  assert.equal(appointmentDuration("2026-10-20T14:00:00Z", "2026-10-20T14:45:00Z"), "45 minutes");
});
test("minor status follows the birthday in salon local time and supports unknown birthdays", () => {
  assert.equal(contactIsMinor("2008-10-20", false, new Date("2026-10-20T02:00:00Z")), true);
  assert.equal(contactIsMinor("2008-10-20", false, new Date("2026-10-20T04:00:00Z")), false);
  assert.equal(contactIsMinor(null, true), true);
  assert.equal(contactIsMinor("1980-01-01", true), false);
});
test("prep follows authoritative categories and expands multi-area service packages", () => {
  const hair = { id: "hair", name: "Scalp massage", category: "Hair" };
  const nails = { id: "nails", name: "Manicure", category: "Nails" };
  const bundle = {
    id: "bundle",
    name: "Client package",
    category: "Specials",
    is_special: true,
    included_service_ids: ["hair", "nails"],
  };
  assert.equal(
    appointmentPrep({ services: [{ name: hair.name }] }, [hair])[0].area,
    "Hair station",
  );
  assert.deepEqual(
    appointmentPrep({ services: [{ name: bundle.name }] }, [hair, nails, bundle]).map(
      (item) => item.area,
    ),
    ["Hair station", "Nail station"],
  );
});
test("phone clock identifies the current visit and the next client rather than a completed visit", () => {
  const current = { ...appointment, id: "current", status: "confirmed" };
  const next = {
    ...appointment,
    id: "next",
    status: "pending",
    starts_at: "2026-10-20T16:00:00Z",
    ends_at: "2026-10-20T17:00:00Z",
    services: [{ name: "Manicure" }],
  };
  const plan = nextClientPrep(
    [next, current, { ...current, id: "done", status: "completed" }],
    [{ id: "n", name: "Manicure", category: "Nails" }],
    new Date("2026-10-20T14:30:00Z"),
  );
  assert.equal(plan.current.id, "current");
  assert.equal(plan.next.id, "next");
  assert.equal(plan.remaining, 2);
  assert.equal(plan.prep[0].area, "Nail station");
  const finished = nextClientPrep([next, current], [], new Date("2026-10-20T18:00:00Z"));
  assert.equal(finished.remaining, 0);
  assert.equal(finished.target, undefined);
});

const { formatDuration } = require("../lib/salon/duration.ts");
test("duration wording stays consistent for quarter hours, full hours and mixed durations", () => {
  for (const [minutes, label] of [
    [15, "15 minutes"],
    [30, "30 minutes"],
    [45, "45 minutes"],
    [60, "1 hour"],
    [75, "1 hour 15 minutes"],
    [90, "1 hour 30 minutes"],
    [105, "1 hour 45 minutes"],
    [120, "2 hours"],
    [135, "2 hours 15 minutes"],
    [480, "8 hours"],
    [1, "1 minute"],
    [0, "0 minutes"],
  ])
    assert.equal(formatDuration(minutes), label);
  assert.equal(formatDuration(NaN), "Duration unavailable");
  assert.equal(formatDuration(-1), "Duration unavailable");
});

const { activityColor, dotsOnDate, activitiesOnDate } = require("../lib/salon/calendarActivity.ts");
test("calendar dots show only booked client visits and deduplicate applicable colors", () => {
  const row = {
    ...appointment,
    starts_at: "2026-10-20T14:00:00Z",
    ends_at: "2026-10-20T15:00:00Z",
    status: "confirmed",
  };
  const rows = [
    row,
    { ...row, id: "duplicate-type" },
    { ...row, id: "consult-visit", services: [{ name: "Consult", price: 0 }] },
    ...[
      ["personal", "blocked"],
      ["vip", "vip"],
      ["consultation", "consultation"],
      ["event", "event"],
      ["other", "blocked"],
    ].map(([block_reason, color]) => {
      const block = { ...row, id: block_reason, kind: "block", block_reason };
      assert.equal(activityColor(block), color);
      return block;
    }),
  ];
  assert.deepEqual(dotsOnDate(rows, "2026-10-20"), ["confirmed", "consultation"]);
  assert.equal(activitiesOnDate(rows, "2026-10-20").length, 8);
  assert.deepEqual(dotsOnDate([{ ...row, status: "cancelled" }], "2026-10-20"), []);
  assert.deepEqual(dotsOnDate([{ ...row, status: "pending" }], "2026-10-20"), []);
});
test("multi-day blocks remain in the agenda without creating appointment dots", () => {
  const block = {
    ...appointment,
    id: "multi",
    kind: "block",
    status: "confirmed",
    block_reason: "closure",
    starts_at: "2026-10-20T04:00:00Z",
    ends_at: "2026-10-22T04:00:00Z",
  };
  assert.deepEqual(dotsOnDate([block], "2026-10-19"), []);
  assert.deepEqual(dotsOnDate([block], "2026-10-20"), []);
  assert.deepEqual(dotsOnDate([block], "2026-10-21"), []);
  assert.deepEqual(dotsOnDate([block], "2026-10-22"), []);
  assert.equal(activitiesOnDate([block], "2026-10-21").length, 1);
});

const { createOwnerCalendarDemo } = require("../lib/salon/ownerCalendarDemo.ts");
const { appointmentsForToday } = require("../lib/salon/ownerToday.ts");
test("fictional demo blocks preserve agenda entries and never change visit totals", () => {
  const day = "2026-10-20",
    blocks = createOwnerCalendarDemo(day);
  const visit = {
    ...appointment,
    starts_at: day + "T14:00:00Z",
    ends_at: day + "T15:00:00Z",
    status: "confirmed",
  };
  assert.equal(new Set(blocks.map((row) => row.id)).size, blocks.length);
  assert.ok(
    blocks.every(
      (row) =>
        row.id.startsWith("demo-") &&
        row.kind === "block" &&
        row.total === 0 &&
        Boolean(row.block_description),
    ),
  );
  assert.deepEqual(dotsOnDate([visit, ...blocks], day), ["confirmed"]);
  assert.equal(activitiesOnDate([visit, ...blocks], day).length, 2);
  assert.deepEqual(appointmentsForToday([visit, ...blocks], day), [visit]);
});
