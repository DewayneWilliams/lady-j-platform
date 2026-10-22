const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  ts = require("typescript");
const compile = (p, modules) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(require("node:path").join(__dirname, "..", p), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (n) => {
        if (n in modules) return modules[n];
        if (n === "react") return React;
        if (n === "react/jsx-runtime") return require("react/jsx-runtime");
        throw Error(n);
      },
    },
  );
  return exports;
};
const host = ({ children, testID, style, ...p }) =>
  React.createElement(
    "div",
    { "data-testid": testID, style, "aria-label": p.accessibilityLabel },
    children,
  );
const rn = { View: host, Pressable: host };
const ui = {
  useColors: () => ({
    foreground: "#111",
    mutedForeground: "#666",
    calendarConfirmed: "#22A06B",
    calendarConsultation: "#2166D8",
  }),
  Txt: host,
  Card: host,
  ButtonLabel: host,
};
const activity = compile("lib/salon/calendarActivity.ts", {});
const dot = compile("components/salon/owner/CalendarActivityDot.tsx", {
  "react-native": rn,
  "../ui": ui,
  "@/lib/salon/calendarActivity": activity,
});
const calendar = compile("components/salon/owner/CalendarTools.tsx", {
  "react-native": rn,
  "@/lib/icons/LucideIcon": () => null,
  "@/lib/salon/calendarActivity": activity,
  "@/lib/salon/ownerToday": { salonDayKey: () => "2026-10-19" },
  "../ui": ui,
  "./OwnerUI": { OwnerButton: host, OwnerText: host },
  "./CalendarActivityDot": dot,
  "./CalendarLegend": () => null,
  "./BlockTimeMenu": () => null,
  "./CurrentDateOutline": () => null,
}).default;
const base = {
  id: "a",
  kind: "appointment",
  status: "confirmed",
  starts_at: "2026-10-20T14:00:00Z",
  ends_at: "2026-10-20T15:00:00Z",
  services: [{ name: "Care" }],
};
const render = (appointments) =>
  renderToStaticMarkup(
    React.createElement(calendar, {
      date: "2026-10-20",
      selected: true,
      view: "Month",
      appointments,
      live: false,
      status: "offline",
      onDate() {},
      onMonthChange() {},
      onView() {},
      onAdd() {},
      onBlock() {},
    }),
  );
const contents = (html) =>
  html.match(/data-testid="calendar-dots-2026-10-20"[^>]*>(.*?)<\/div>/s)?.[1];
require("node:test").test(
  "month renders only present appointment colors, with no default dot outlines",
  () => {
    let html = render([]);
    assert.equal(contents(html), "");
    html = render([base, { ...base, id: "duplicate" }]);
    assert.equal((html.match(/aria-label="confirmed activity"/g) || []).length, 1);
    assert(contents(html).includes("justify-content") === false);
    assert(html.includes("justify-content:center"));
    html = render([{ ...base, status: "cancelled" }]);
    assert.equal(contents(html), "");
    html = render([{ ...base, kind: "block", block_reason: "personal" }]);
    assert.equal(contents(html), "");
    console.log(
      "PASS: rendered month shows no dot outlines for empty/cancelled/block-only dates; duplicate appointments render one centered colored dot.",
    );
  },
);
