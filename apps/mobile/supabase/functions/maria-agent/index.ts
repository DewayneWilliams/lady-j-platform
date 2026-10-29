import {
  authorizeOwner, callTool, confirmProposal, declineProposal, cors, json, MariaError,
  MARIA_PROMPT, todayKey, tools, TZ, type Proposal,
} from "../_shared/maria.ts";
import { syncAgent } from "../_shared/mariaVoice.ts";

const fnTools = tools.map((t) => ({
  type: "function",
  name: t.name,
  description: t.description,
  parameters: {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(t.params).map(([k, p]) => [k, { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) }]),
    ),
    required: t.required ?? [],
    additionalProperties: false,
  },
}));

async function chat(c: Awaited<ReturnType<typeof authorizeOwner>>, message: string, history: unknown) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new MariaError("Maria's text assistant is not configured on the server.", 503);
  const past = (Array.isArray(history) ? history : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-16)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 3000) }));
  const input: any[] = [...past, { role: "user", content: message.slice(0, 4000) }];
  const now = new Intl.DateTimeFormat("en-US", { timeZone: TZ, dateStyle: "full", timeStyle: "short" }).format(new Date());
  const instructions = `${MARIA_PROMPT}\n\nCurrent salon time: ${now} (today is ${todayKey()}). This is the text chat; keep replies brief.`;
  const proposals: Proposal[] = [];
  for (let step = 0; step < 8; step++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MARIA_MODEL") || "gpt-4.1",
        instructions,
        input,
        tools: fnTools,
        store: false,
        max_output_tokens: 800,
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      console.error("OpenAI request failed", res.status, JSON.stringify(out).slice(0, 300));
      if (res.status === 429 && /quota|credit/i.test(String(out?.error?.code ?? out?.error?.type ?? "")))
        throw new MariaError("Typed chat is paused because the OpenAI account has no credits. Voice still works.", 503);
      throw new MariaError("Maria is temporarily unavailable.", 502);
    }
    const calls = (out.output ?? []).filter((o: any) => o.type === "function_call");
    if (!calls.length) {
      const reply = (out.output ?? [])
        .flatMap((o: any) => o.content ?? [])
        .filter((o: any) => o.type === "output_text")
        .map((o: any) => o.text)
        .join("\n");
      return { reply: reply || "I'm here, Jaycee. What would you like to do?", proposals };
    }
    input.push(...out.output);
    for (const call of calls) {
      let output: unknown;
      try {
        const r = await callTool(c, call.name, JSON.parse(call.arguments || "{}"));
        if (r.proposal) proposals.push(r.proposal);
        output = r.result;
      } catch (e) {
        output = { error: e instanceof Error ? e.message : "Tool failed" };
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output).slice(0, 14000) });
    }
  }
  return { reply: "That took more steps than I expected. Could you rephrase what you need, Jaycee?", proposals };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const c = await authorizeOwner(req);
    const body = await req.json().catch(() => ({}));
    switch (body.action ?? "chat") {
      case "chat": {
        if (typeof body.message !== "string" || !body.message.trim()) throw new MariaError("Message is required.");
        return json(await chat(c, body.message, body.history));
      }
      case "tool": {
        // Used by the voice agent's client tools. Write tools only stage proposals.
        const r = await callTool(c, String(body.name ?? ""), (body.arguments ?? {}) as Record<string, unknown>);
        return json({ result: r.result, proposal: r.proposal ?? null });
      }
      case "voice_sync": {
        const key = Deno.env.get("ELEVENLABS_API_KEY");
        const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
        if (!key || !agentId) throw new MariaError("Voice is not configured on the server yet.", 503);
        return json(await syncAgent(key, agentId, body.force === true));
      }
      case "confirm":
        return json(await confirmProposal(c, String(body.proposal_id ?? ""), String(body.hash ?? "")));
      case "decline":
        return json(await declineProposal(c, String(body.proposal_id ?? "")));
      default:
        throw new MariaError("Unknown action.");
    }
  } catch (e) {
    if (e instanceof MariaError) return json({ error: e.message }, e.status);
    console.error("maria-agent", e);
    return json({ error: "Unable to process request." }, 500);
  }
});
