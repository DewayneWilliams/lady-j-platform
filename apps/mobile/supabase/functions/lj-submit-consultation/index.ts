import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
type Photo = { base64?: string; mimeType?: string; extension?: string };
const text = (value: unknown, fallback = "Not provided") => {
  const result = String(value ?? "").trim();
  return result || fallback;
};
const list = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => text(item, "")).filter(Boolean).join(", ") : "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const authorization = req.headers.get("Authorization") || `Bearer ${anonKey}`;
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const uploaded: string[] = [];
  try {
    const raw = await req.text();
    if (raw.length > 42_000_000) return reply({ error: "The selected photos are too large." }, 413);
    const body = JSON.parse(raw || "{}");
    const requestKey = text(body?.requestKey, "");
    if (!/^[0-9a-f-]{36}$/i.test(requestKey) || !body?.answers || typeof body.answers !== "object")
      return reply({ error: "Reload the consultation form and try again." }, 400);
    const identity = await caller.auth.getUser();
    const prefix = identity.data?.user?.id || "guest";
    const suppliedPaths = Array.isArray(body?.inspirationPaths)
      ? body.inspirationPaths.filter((path: unknown) => typeof path === "string").slice(0, 3)
      : [];
    const photos: Photo[] = Array.isArray(body?.photos) ? body.photos.slice(0, 3) : [];
    if (photos.length && suppliedPaths.length)
      return reply({ error: "Photo upload details are invalid." }, 400);
    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      const mime = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(
        text(photo.mimeType, "image/jpeg"),
      )
        ? text(photo.mimeType, "image/jpeg")
        : "image/jpeg";
      const encoded = text(photo.base64, "").replace(/^data:[^;]+;base64,/, "");
      if (!encoded || encoded.length > 14_000_000) throw new Error("Each inspiration photo must be 10 MB or smaller.");
      const binary = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("hei") ? "heic" : "jpg";
      const path = `${prefix}/${requestKey}/${index + 1}.${extension}`;
      const saved = await admin.storage.from("lj-consultation-media").upload(path, binary, {
        contentType: mime,
        upsert: true,
      });
      if (saved.error) throw new Error("An inspiration photo could not be saved.");
      uploaded.push(path);
    }
    const paths = uploaded.length ? uploaded : suppliedPaths;
    const saved = await caller.rpc("lj_submit_consultation", {
      p_request_key: requestKey,
      p_answers: body.answers,
      p_inspiration_paths: paths,
    });
    if (saved.error) throw new Error(saved.error.message);
    const id = String(saved.data);
    const request = await admin.from("lj_consultation_requests").select("*").eq("id", id).single();
    if (request.error || !request.data) throw new Error("The consultation was saved, but its alert could not be prepared.");

    const accessToken = Deno.env.get("LJ_WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("LJ_WHATSAPP_PHONE_NUMBER_ID");
    const templateName = Deno.env.get("LJ_WHATSAPP_TEMPLATE_NAME");
    const appUrl = Deno.env.get("LJ_APP_URL")?.replace(/\/$/, "");
    if (!accessToken || !phoneNumberId || !templateName || !appUrl) {
      await admin.from("lj_consultation_requests").update({
        owner_alert_status: "configuration_required",
        owner_alert_error: "WhatsApp Business secrets are incomplete.",
      }).eq("id", id);
      return reply({ id, inspirationPaths: paths, whatsappSent: false, whatsappStatus: "configuration_required" });
    }
    const answers = body.answers as Record<string, unknown>;
    const selectedServices = Array.isArray(request.data.selected_services)
      ? request.data.selected_services.map((service: { name?: string }) => text(service?.name, "")).filter(Boolean).join(", ")
      : text(request.data.primary_service?.name);
    const responses = [
      `Outcomes: ${list(answers.desired_outcomes)}`,
      `Visit: ${text(answers.visit_special)}; Occasion: ${text(answers.occasion)}`,
      `Experience: ${text(answers.previous_experience)}`,
      `Availability: ${list(answers.availability_days)} / ${list(answers.availability_times)}`,
      `Allergy/health: ${text(answers.allergy_status)} ${text(answers.allergy_details, "")}`,
      `Accessibility: ${list(answers.accessibility_needs)} ${text(answers.accessibility_details, "")}`,
      `Safety: ${Object.entries((answers.screening as Record<string, unknown>) || {}).map(([key, value]) => `${key}: ${text(value)}`).join(", ")}`,
      `Notes: ${text(answers.additional_notes)}`,
    ].join("\n").slice(0, 950);
    const version = Deno.env.get("LJ_WHATSAPP_API_VERSION") || "v22.0";
    const ownerNumber = (Deno.env.get("LJ_OWNER_WHATSAPP_NUMBER") || "18683745517").replace(/\D/g, "");
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: ownerNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            { type: "body", parameters: [
              { type: "text", text: text(request.data.client_name) },
              { type: "text", text: `${text(request.data.whatsapp_phone)} · ${text(request.data.client_email)}` },
              { type: "text", text: selectedServices.slice(0, 500) },
              { type: "text", text: responses },
              { type: "text", text: id },
            ] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: id }] },
          ],
        },
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800);
      await admin.from("lj_consultation_requests").update({ owner_alert_status: "failed", owner_alert_error: detail }).eq("id", id);
      return reply({ id, inspirationPaths: paths, whatsappSent: false, whatsappStatus: "failed" });
    }
    await admin.from("lj_consultation_requests").update({ owner_alert_status: "sent", owner_alert_sent_at: new Date().toISOString(), owner_alert_error: null }).eq("id", id);
    return reply({ id, inspirationPaths: paths, whatsappSent: true, whatsappStatus: "sent", approvalUrl: `${appUrl}/owner?tab=Business&consultation=${id}` });
  } catch (reason) {
    if (uploaded.length) await admin.storage.from("lj-consultation-media").remove(uploaded);
    return reply({ error: reason instanceof Error ? reason.message : "The consultation could not be saved." }, 400);
  }
});
