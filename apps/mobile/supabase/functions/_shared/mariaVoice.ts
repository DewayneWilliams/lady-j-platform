// Programmatic ElevenLabs agent configuration for Maria (server-side only).
import { createClient } from "npm:@supabase/supabase-js@2";
import { MARIA_PROMPT, tools } from "./maria.ts";

const API = "https://api.elevenlabs.io";
const FIRST_MESSAGE = "Hi Jaycee, it's Maria. What can I help you with?";

const toolConfig = (t: (typeof tools)[number]) => ({
  type: "client",
  name: t.name,
  description: t.description,
  expects_response: true,
  response_timeout_secs: 30,
  ...(Object.keys(t.params).length
    ? {
        parameters: {
          type: "object",
          required: t.required ?? [],
          properties: Object.fromEntries(
            Object.entries(t.params).map(([k, p]) => [k, { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) }]),
          ),
        },
      }
    : {}),
});

async function sha(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function call(key: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": key, "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ElevenLabs ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}): ${JSON.stringify(body).slice(0, 400)}`);
  return body as any;
}

/** Creates/updates Maria's client tools and the agent prompt. Idempotent; skipped when nothing changed. */
export async function syncAgent(key: string, agentId: string, force = false) {
  const desired = await sha(JSON.stringify({ p: MARIA_PROMPT, f: FIRST_MESSAGE, t: tools.map(toolConfig), v: 1 }));
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const saved = await admin.from("lj_maria_config").select("config_hash").eq("id", agentId).maybeSingle();
  if (!force && saved.data?.config_hash === desired) return { synced: false, tools: tools.length };

  const listed = await call(key, "/v1/convai/tools?page_size=100");
  const existing = new Map<string, string>((listed.tools ?? []).map((t: any) => [t.tool_config?.name, t.id]));
  const ids: string[] = [];
  for (const t of tools) {
    const body = JSON.stringify({ tool_config: toolConfig(t) });
    const id = existing.get(t.name);
    const out = id
      ? await call(key, `/v1/convai/tools/${id}`, { method: "PATCH", body })
      : await call(key, "/v1/convai/tools", { method: "POST", body });
    ids.push(out.id ?? id!);
  }
  const agent = await call(key, `/v1/convai/agents/${encodeURIComponent(agentId)}`);
  const prompt = agent.conversation_config?.agent?.prompt ?? {};
  const patchPrompt: Record<string, unknown> = { prompt: MARIA_PROMPT, tool_ids: ids };
  if (prompt.tools?.length) patchPrompt.tools = [];
  await call(key, `/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ conversation_config: { agent: { first_message: FIRST_MESSAGE, prompt: patchPrompt } } }),
  });
  await admin.from("lj_maria_config").upsert({ id: agentId, config_hash: desired, tool_ids: ids, synced_at: new Date().toISOString() });
  return { synced: true, tools: ids.length };
}
