const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");

function compile(file, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal(code.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(code.outputText, { exports, Date, ...globals });
  return exports;
}
const management = compile("supabase/functions/_shared/mariaManagement.ts");
const tools = management.createManagementTools(message => { throw new Error(message); });
const save = tools.find(t => t.name === "propose_save_record");
const operation = tools.find(t => t.name === "propose_owner_operation");

test("selector and automatic test owner are confined to Development", () => {
  for (const env of ["DEVELOPMENT", "STAGING", "PRODUCTION"]) {
    for (const credentials of [false, true]) {
      const result = compile("lib/salon/testMode.ts", { process: { env: {
        EXPO_PUBLIC_CURRENT_ENV: env, EXPO_PUBLIC_DEVELOPMENT_TEST_MODE: "true",
        ...(credentials ? { EXPO_PUBLIC_DEV_OWNER_EMAIL: "test@demo.invalid", EXPO_PUBLIC_DEV_OWNER_PASSWORD: "test" } : {}),
      } } });
      assert.equal(result.developmentDemoSelector, env === "DEVELOPMENT");
      assert.equal(result.devOwnerAutoSignIn, env === "DEVELOPMENT" && credentials);
      assert.equal(result.developmentTestMode, env === "DEVELOPMENT" && !credentials);
      if (env !== "DEVELOPMENT") assert.equal(result.devOwnerCredentials(), null);
    }
  }
});

test("new management writes have proposal and confirmation execution stages", () => {
  for (const tool of tools.filter(t => t.write)) {
    assert.equal(typeof tool.prepare, "function");
    assert.equal(typeof tool.describe, "function");
    assert.equal(typeof tool.execute, "function");
  }
});

test("service creation validates prices and quarter-hour duration without writing", async () => {
  const context = { sb: { from() { throw Error("Preparation must not write"); } } };
  const clean = await save.prepare(context, { entity: "service", data_json: JSON.stringify({ name: "Demo care", category: "Hair", price: 250, duration: 60 }) });
  assert.equal(clean.changes.duration, 60);
  assert.equal(clean.record_id, null);
  for (const changes of [{ price: -1 }, { duration: 17 }, { duration: 0 }]) {
    await assert.rejects(save.prepare(context, { entity: "service", data_json: JSON.stringify({ name: "Demo care", category: "Hair", price: 250, duration: 60, ...changes }) }));
  }
});

test("model cannot modify identities, authorization, tables or client care fields", async () => {
  for (const field of ["id", "customer_id", "deleted_at", "role", "is_owner", "health_safety_notes"]) {
    await assert.rejects(save.prepare({}, { entity: "client", data_json: JSON.stringify({ first_name: "Demo", last_name: "Client", [field]: "unauthorized" }) }), /not an editable/);
  }
  for (const entity of ["auth.users", "lj_owners", "__proto__", "constructor"]) {
    await assert.rejects(save.prepare({}, { entity, data_json: "{}" }), /entity/);
  }
});

test("minors require guardians and names are derived from reviewed fields", async () => {
  await assert.rejects(save.prepare({}, { entity: "client", data_json: JSON.stringify({ first_name: "Demo", last_name: "Child", is_minor: true }) }), /guardian/);
  const value = await save.prepare({}, { entity: "client", data_json: JSON.stringify({ first_name: "Demo", last_name: "Client" }) });
  assert.equal(value.changes.full_name, "Demo Client");
});

test("owner operations reject arbitrary RPCs, identities, invalid links and payload types", async () => {
  await assert.rejects(operation.prepare({}, { operation: "execute_sql", arguments_json: "{}" }), /Unsupported/);
  await assert.rejects(operation.prepare({}, { operation: "record_refund", arguments_json: JSON.stringify({ p_id: "00000000-0000-4000-a000-000000000001", p_owner: true }) }), /Unexpected/);
  await assert.rejects(operation.prepare({}, { operation: "set_workshop_resources", arguments_json: JSON.stringify({ p_workshop_id: "00000000-0000-4000-a000-000000000001", p_live_url: "javascript:alert(1)", p_recording_url: "", p_materials_url: "", p_certificate_url: "" }) }), /HTTPS/);
});

test("native fallback imports a distinct module and renders safely without native SDKs", () => {
  const source = fs.readFileSync(path.join(__dirname, "../lib/salon/mariaVoice.native.tsx"), "utf8");
  assert.match(source, /from "\.\/mariaVoiceFallback"/);
  assert.doesNotMatch(source, /from "\.\/mariaVoice"/);
  const fallback = compile("lib/salon/mariaVoiceFallback.tsx");
  assert.equal(fallback.MariaVoiceProvider({ children: "screen" }), "screen");
  assert.equal(fallback.useMariaVoice({}).supported, false);
});

test("repeated development mode routing reuses registered destinations without stacking owner routes", () => {
  const calls = [];
  const router = { navigate: route => calls.push(["navigate", route]), push: route => calls.push(["push", route]) };
  const shell = compile("components/salon/Shell.tsx", { require: name => {
    if (name === "expo-router") return { useRouter: () => router };
    if (name === "@/lib/salon/testMode") return { developmentDemoSelector: true };
    return {};
  } });
  const go = shell.useNav();
  for (let i = 0; i < 20; i++) { go("owner"); go("home"); }
  assert.equal(calls.length, 40);
  assert.ok(calls.every(([method]) => method === "navigate"));
  assert.equal(calls.filter(([, route]) => route === "/owner").length, 20);
});

test("original shared client actions are interactive only in Development testing", () => {
  const runtime = require("react/jsx-runtime");
  for (const enabled of [false, true]) {
    const ui = compile("components/salon/ui.tsx", { require: name => {
      if (name === "react/jsx-runtime") return runtime;
      if (name === "@/lib/salon/testMode") return { developmentDemoSelector: enabled };
      if (name === "@/theming/ThemeProvider") return { useTheme: () => ({ theme: { colors: {} } }) };
      if (name === "react-native") return { Pressable: "button", View: "div" };
      return {};
    } });
    let pressed = false;
    const action = ui.Action({ label: "Continue", onPress: () => { pressed = true; } });
    if (!enabled) assert.equal(action, null);
    else { assert.equal(action.props.disabled, false); action.props.onPress(); assert.ok(pressed); }
  }
});

test("the selector switches Client/Owner twenty times without requesting authentication", () => {
  let currentPath = "/home", signIns = 0;
  const destinations = [];
  const selector = compile("components/salon/DevelopmentModeSelector.tsx", { require: name => {
    if (name === "react") return { createContext: () => null, useContext: () => null };
    if (name === "react/jsx-runtime") return require("react/jsx-runtime");
    if (name === "react-native") return { Pressable: "button", View: "div", useWindowDimensions: () => ({ width: 390 }) };
    if (name === "expo-router") return { usePathname: () => currentPath, useRouter: () => ({ navigate: value => { currentPath = value; destinations.push(value); } }) };
    if (name === "@/lib/salon/testMode") return { developmentDemoSelector: true, devOwnerAutoSignIn: true };
    if (name === "@/lib/salon/SalonProvider") return { useSalon: () => ({ authReady: true, devOwner: true, setDemoOwner() {}, signInDevOwner() { signIns++; } }) };
    if (name === "./ui") return { Txt: "span", useColors: () => ({}) };
    return {};
  } }).default;
  for (let i = 0; i < 20; i++) {
    selector({}).props.children[1].props.onPress();
    assert.equal(currentPath, "/owner");
    selector({}).props.children[1].props.onPress();
    assert.equal(currentPath, "/home");
  }
  assert.equal(destinations.length, 40);
  assert.equal(signIns, 0);
});
