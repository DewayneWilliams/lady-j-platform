/** Contracts for trusted server integrations. Do not send provider secrets to the app. */
export type Provider = "card" | "whatsapp" | "email" | "bedrock" | "transcribe" | "polly";
export const providerStatus: Record<Provider, "not_configured"> = {
  card: "not_configured",
  whatsapp: "not_configured",
  email: "not_configured",
  bedrock: "not_configured",
  transcribe: "not_configured",
  polly: "not_configured",
};
export type MariaLanguage = "en-TT" | "es-US";
export type MariaAction = {
  id: string;
  type:
    | "lookup"
    | "appointment"
    | "block_time"
    | "cancel"
    | "financial_change"
    | "delete"
    | "bulk_action";
  summary: string;
  payload: Record<string, unknown>;
};
export type ConfirmedExecution = {
  confirmed: true;
  actionId: string;
  recordId: string;
  serverReceipt: string;
};
export interface TrustedMariaGateway {
  // Gateway must authenticate the session and check lj_is_owner on every request.
  plan(text: string, language: MariaLanguage): Promise<{ reply: string; action?: MariaAction }>;
  transcribe(audio: Blob, language: MariaLanguage): Promise<{ transcript: string }>;
  speak(text: string, language: MariaLanguage): Promise<{ signedAudioUrl: string }>;
  execute(action: MariaAction, confirmationId?: string): Promise<ConfirmedExecution>;
}
export function createMariaAdapter(gateway?: TrustedMariaGateway) {
  const required = () => {
    if (!gateway)
      throw new Error("Maria’s AWS integration is not configured. No action was executed.");
    return gateway;
  };
  return {
    plan: (text: string, language: MariaLanguage) => required().plan(text, language),
    transcribe: (audio: Blob, language: MariaLanguage) => required().transcribe(audio, language),
    speak: (text: string, language: MariaLanguage) => required().speak(text, language),
    async execute(action: MariaAction, confirmationId?: string) {
      const destructive = ["cancel", "financial_change", "delete", "bulk_action"].includes(
        action.type,
      );
      if (destructive && !confirmationId)
        throw new Error("Owner confirmation is required before this action.");
      const receipt = await required().execute(action, confirmationId);
      if (
        !receipt?.confirmed ||
        receipt.actionId !== action.id ||
        !receipt.recordId ||
        !receipt.serverReceipt
      )
        throw new Error("The server has not confirmed execution.");
      return receipt;
    },
  };
}
export interface CardCheckoutGateway {
  createCheckout(input: {
    purchaseId?: string;
    appointmentId?: string;
    returnUrl: string;
  }): Promise<{ checkoutUrl: string; checkoutId: string }>;
  // Only an authenticated server webhook can change a payment to verified.
  getVerifiedStatus(
    checkoutId: string,
  ): Promise<{ status: "pending" | "verified" | "failed"; receiptId?: string }>;
}
export type NotificationEvent =
  | "appointment_confirmed"
  | "deposit_reminder"
  | "reminder_24h"
  | "reminder_2h"
  | "workshop_update"
  | "order_update"
  | "birthday_offer";
export interface NotificationGateway {
  enqueue(event: NotificationEvent, recordId: string): Promise<{ confirmed: true; jobId: string }>;
}
