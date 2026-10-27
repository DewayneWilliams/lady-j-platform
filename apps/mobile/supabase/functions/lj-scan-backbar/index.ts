import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = req.headers.get("Authorization");
    if (!authorization) return reply({ error: "Sign in as the owner to scan products." }, 401);
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const user = await caller.auth.getUser();
    if (!user.data.user) return reply({ error: "Your session has expired." }, 401);
    const owner = await caller.rpc("lj_is_owner");
    if (owner.error || owner.data !== true) return reply({ error: "Owner access required." }, 403);

    const raw = await req.text();
    if (raw.length > 11_000_000) return reply({ error: "Use a photo smaller than 8 MB." }, 413);
    const body = JSON.parse(raw || "{}");
    const mime = String(body?.mimeType || "image/jpeg");
    const base64 = String(body?.base64 || "").replace(/^data:[^;]+;base64,/, "");
    if (!base64 || !["image/jpeg", "image/png", "image/webp"].includes(mime))
      return reply({ error: "Take a clear JPG, PNG or WebP photo." }, 400);
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key)
      return reply(
        { error: "AI scanning is not configured. Add OPENAI_API_KEY in Supabase Secrets." },
        503,
      );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini",
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Identify this professional salon backbar product from visible packaging only. Return strict JSON with name, brand, size_label, category (Hair, Nails, Skin, Facials, Waxing, Brows, Lashes, or Miscellaneous), tracking_method (applications or time), applications_per_container (positive number or null), replacement_interval_days (positive integer or null), and confidence (0 to 1). Do not invent unreadable details. Use empty strings or null when uncertain.",
            },
            { type: "input_image", image_url: `data:${mime};base64,${base64}`, detail: "high" },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "backbar_product",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" }, brand: { type: "string" }, size_label: { type: "string" },
                category: { type: "string", enum: ["Hair","Nails","Skin","Facials","Waxing","Brows","Lashes","Miscellaneous"] },
                tracking_method: { type: "string", enum: ["applications","time"] },
                applications_per_container: { type: ["number","null"] },
                replacement_interval_days: { type: ["integer","null"] },
                confidence: { type: "number" },
              },
              required: ["name","brand","size_label","category","tracking_method","applications_per_container","replacement_interval_days","confidence"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Backbar vision failed", response.status, detail.slice(0, 500));
      return reply({ error: "The product could not be identified. Try a clearer front-label photo." }, 502);
    }
    const result = await response.json();
    const output = result?.output?.flatMap((item: { content?: unknown[] }) => item.content || [])
      .find((item: { type?: string }) => item.type === "output_text")?.text;
    const product = JSON.parse(String(output || "{}"));
    if (!product.name) return reply({ error: "No product name was visible. Enter it manually." }, 422);
    return reply({ product });
  } catch (reason) {
    console.error("Backbar scan error", reason);
    return reply({ error: "The scan could not be completed. Try again or enter the item manually." }, 400);
  }
});
