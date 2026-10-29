import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Issues a short-lived ElevenLabs conversation token to the verified salon owner only.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in as the owner to use Maria." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const user = await sb.auth.getUser();
    if (user.error || !user.data.user) return reply({ error: "Your session has expired." }, 401);
    // Authorization comes from the database role table, never from anything the app sends.
    const owner = await sb.rpc("lj_is_owner");
    if (owner.error || owner.data !== true) return reply({ error: "Maria is available to the salon owner only." }, 403);

    const key = Deno.env.get("ELEVENLABS_API_KEY");
    const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!key || !agentId) return reply({ error: "Voice is not configured on the server yet." }, 503);

    // Keep the agent's instructions and tools current (idempotent; no-op when unchanged).
    let configuration: unknown = null;
    try {
      const sync = await fetch(`${url}/functions/v1/maria-agent`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
        body: JSON.stringify({ action: "voice_sync" }),
      });
      configuration = await sync.json();
    } catch (e) {
      console.error("Maria agent sync failed", e instanceof Error ? e.message : e);
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": key } },
    );
    if (!res.ok) {
      console.error("ElevenLabs token request failed", res.status);
      return reply({ error: "Unable to obtain a voice token." }, 502);
    }
    const data = await res.json();
    if (!data.token) return reply({ error: "Voice token missing." }, 502);
    return reply({ token: data.token, configuration });
  } catch (e) {
    console.error("maria-voice-token", e);
    return reply({ error: "Unable to start Maria." }, 500);
  }
});
