import { db } from "./client";

export type MariaProposal = {
  id: string;
  tool: string;
  summary: string;
  hash: string;
  expires_at: string;
};
export type MariaChange = {
  status: "executed_and_verified" | "executed_unverified" | "failed" | "declined";
  summary?: string;
  verified_record?: unknown;
  error?: string;
};
export type MariaTurn = { role: "user" | "assistant"; content: string };

// All Maria requests go to owner-only Edge Functions; the server re-checks the owner role
// on every call, and every change needs a separate confirmation request.
async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const response = await db().functions.invoke(fn, { body });
  if (response.error) {
    const context = (response.error as { context?: Response }).context;
    let message = "";
    try {
      message = (await context?.json())?.error ?? "";
    } catch {
      message = "";
    }
    throw new Error(message || "Maria could not complete that request.");
  }
  if (response.data?.error) throw new Error(response.data.error);
  return response.data as T;
}

export const mariaChat = (message: string, history: MariaTurn[]) =>
  invoke<{ reply: string; proposals: MariaProposal[] }>("maria-agent", {
    action: "chat",
    message,
    history,
  });

export const mariaTool = (name: string, args: Record<string, unknown>) =>
  invoke<{ result: unknown; proposal: MariaProposal | null }>("maria-agent", {
    action: "tool",
    name,
    arguments: args,
  });

export const mariaConfirm = (proposal: MariaProposal) =>
  invoke<MariaChange>("maria-agent", {
    action: "confirm",
    proposal_id: proposal.id,
    hash: proposal.hash,
  });

export const mariaDecline = (proposal: MariaProposal) =>
  invoke<{ status: "declined" }>("maria-agent", { action: "decline", proposal_id: proposal.id });

export const mariaVoiceToken = () => invoke<{ token: string }>("maria-voice-token", {});

const YES = /^\W*(yes|yeah|yep|yup|confirm|confirmed|approve|approved|go ahead|do it|please do|that'?s right|correct|sure)\b/i;
const NO = /\b(no|not|don'?t|do not|wait|hold on|stop|cancel|decline|never mind|nevermind|actually)\b/i;

/** Classifies a spoken reply to a pending proposal. Anything ambiguous is treated as not confirmed. */
export function spokenDecision(text: string): "confirm" | "decline" | "none" {
  const value = text.trim();
  if (!value || value.split(/\s+/).length > 9) return "none";
  if (YES.test(value) && !NO.test(value)) return "confirm";
  if (NO.test(value)) return "decline";
  return "none";
}

export function describeChange(result: MariaChange) {
  if (result.status === "executed_and_verified") return `Done and verified: ${result.summary ?? ""}`.trim();
  if (result.status === "executed_unverified")
    return `Saved, but I could not verify it afterwards. Please check the dashboard: ${result.summary ?? ""}`.trim();
  if (result.status === "declined") return "Okay, I did not make that change.";
  return `That change did not go through: ${result.error ?? "unknown error"}.`;
}
