const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};

const {
  CONSULTATION_WHATSAPP_PHONE,
  clientConsultationWhatsAppSummary,
} = require("../lib/salon/consultations.ts");
const { whatsappContactUrl } = require("../lib/salon/whatsapp.ts");

const request = {
  id: "consult-123",
  customer_id: null,
  client_id: null,
  client_name: "Jamie Test",
  client_email: "jamie@example.com",
  whatsapp_phone: "+1 868 555 0199",
  selected_services: [{ id: "service-1", name: "Silk Press", category: "Hair" }],
  primary_service: { id: "service-1", name: "Silk Press", category: "Hair" },
  desired_outcomes: ["Healthy shine"],
  visit_special: "Confidence",
  occasion: "Birthday",
  event_date: "2026-11-20",
  previous_experience: "First visit",
  comfort_note: "A quiet appointment",
  comfort_private: true,
  availability_days: ["Friday"],
  availability_times: ["Afternoon"],
  preferred_date: "2026-11-13",
  additional_notes: "Please confirm parking.",
  allergy_status: "Allergy or sensitivity",
  allergy_details: "Fragrance sensitivity",
  accessibility_needs: ["Extra time or assistance"],
  accessibility_details: "Allow extra time",
  screening: { scalp: "No", hair_allergies: "Yes", recent_chemicals: "Not sure" },
  inspiration_paths: ["client/request/1.jpg"],
  summary: "Primary goal",
  status: "new",
  owner_alert_status: "queued",
  created_at: "2026-10-25T00:00:00Z",
  updated_at: "2026-10-25T00:00:00Z",
};

test("consultation WhatsApp handoff contains every submitted answer and the required salon number", () => {
  const summary = clientConsultationWhatsAppSummary(request);
  for (const expected of [
    request.id,
    request.client_name,
    request.client_email,
    request.whatsapp_phone,
    "Silk Press",
    "Healthy shine",
    request.visit_special,
    request.occasion,
    request.event_date,
    request.previous_experience,
    request.comfort_note,
    "Friday",
    "Afternoon",
    request.preferred_date,
    request.additional_notes,
    request.allergy_status,
    request.allergy_details,
    request.accessibility_needs[0],
    request.accessibility_details,
    "Any current scalp irritation or tenderness?: No",
    "Any known product or colour allergies?: Yes",
    "Any recent colour, relaxer, bleach, or other chemical service?: Not sure",
    "Inspiration photos submitted: 1",
  ]) {
    assert.match(summary, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const url = whatsappContactUrl(CONSULTATION_WHATSAPP_PHONE, summary);
  assert.ok(url.startsWith("https://wa.me/18683745517?text="));
  assert.equal(decodeURIComponent(url.split("?text=")[1]), summary);
});

test("the homepage exposes one native-safe consultation CTA that opens the full workflow", () => {
  const source = fs.readFileSync(
    require.resolve("../components/salon/HomeScreen.tsx"),
    "utf8",
  );
  assert.equal((source.match(/testID="home-consultation-cta"/g) || []).length, 1);
  assert.match(source, /onPress=\{\(\) => go\("consultation"\)\}/);
  assert.match(source, /backgroundColor: "#2563EB"/);
  assert.match(source, /Request Your Free Consultation/);
  assert.match(source, /15 Minutes • Complimentary/);
});
