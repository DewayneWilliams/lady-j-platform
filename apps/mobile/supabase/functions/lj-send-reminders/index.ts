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
type Email = { from: string; to: string[]; subject: string; text: string };
type Job = {
  id: string;
  customer_id: string;
  appointment_id: string | null;
  purchase_id: string | null;
  waitlist_id: string | null;
  event: string;
  attempts: number;
  lease_token: string;
  expires_at: string;
  payload: Record<string, unknown> | null;
};
const subjects: Record<string, string> = {
  request_received: "We received your appointment request",
  deposit_reminder: "Your appointment deposit is awaiting verification",
  appointment_confirmed: "Your Lady J appointment is confirmed",
  reminder_24h: "Your Lady J appointment is tomorrow",
  reminder_2h: "Your Lady J appointment is coming up",
  appointment_cancelled: "Your appointment has been cancelled",
  service_thanks: "Thank you for visiting Lady J",
  waitlist_opening: "An opening was detected on your requested day",
  order_pending: "We received your unpaid request",
  order_paid: "Your payment has been verified",
  order_processing: "Your order is being prepared",
  order_ready: "Your order is ready",
  order_fulfilled: "Your order is complete",
  order_cancelled: "Your request has been cancelled",
  payment_receipt: "Your Lady J payment receipt",
};
const when = (value: string) =>
  new Date(value).toLocaleString("en-TT", {
    timeZone: "America/Port_of_Spain",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " (Trinidad & Tobago time)";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  try {
    const raw = await req.text();
    if (raw.length > 2000) return reply({ error: "Request is too large." }, 413);
    let body: { action?: string };
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return reply({ error: "Invalid request." }, 400);
    }
    const action = body?.action || "process";
    const workerKey = req.headers.get("x-lj-worker-key") || "";
    let worker = false;
    if (workerKey.length >= 32 && workerKey.length <= 200 && action === "process") {
      const valid = await admin.rpc("lj_reminder_key_valid", { p_key: workerKey });
      worker = !valid.error && valid.data === true;
    }
    if (!worker) {
      const authorization = req.headers.get("Authorization") || "";
      const token = authorization.replace(/^Bearer /i, "");
      if (!token || token === authorization)
        return reply({ error: "Owner sign-in required." }, 401);
      const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
      const identity = await user.auth.getUser(token);
      if (identity.error || !identity.data?.user)
        return reply({ error: "Please sign in again." }, 401);
      const owner = await user.rpc("lj_is_owner");
      if (owner.error || owner.data !== true)
        return reply({ error: "Owner authorization required." }, 403);
    }
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("LJ_EMAIL_FROM");
    const appUrl = Deno.env.get("LJ_APP_URL");
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !from && "LJ_EMAIL_FROM",
      (!appUrl || !/^https:\/\/[^\s/?#]+\/?$/.test(appUrl)) && "LJ_APP_URL",
    ].filter(Boolean);
    const settings = await admin
      .from("lj_settings")
      .select("email_reminders_enabled,business_name,contact_phone")
      .eq("id", "business")
      .single();
    if (settings.error) throw new Error("Unable to read communication settings.");
    if (action === "status")
      return reply({
        configured: missing.length === 0,
        enabled: settings.data?.email_reminders_enabled === true,
        missing,
      });
    if (action === "pause") {
      const paused = await admin
        .from("lj_settings")
        .update({ email_reminders_enabled: false })
        .eq("id", "business");
      if (paused.error) throw new Error("Unable to pause email delivery.");
      return reply({ confirmed: true, enabled: false });
    }
    if (missing.length)
      return reply(
        {
          error: "Email setup is incomplete. Add " + missing.join(", ") + " in Supabase → Secrets.",
          missing,
        },
        503,
      );
    if (action === "configure") {
      const key = crypto.randomUUID() + crypto.randomUUID();
      const saved = await admin.rpc("lj_configure_reminder_worker", {
        p_url: url + "/functions/v1/lj-send-reminders",
        p_key: key,
      });
      if (saved.error) throw new Error("Unable to activate the reminder schedule.");
      return reply({ confirmed: true, enabled: true });
    }
    if (action !== "process") return reply({ error: "Unknown action." }, 400);
    if (!settings.data?.email_reminders_enabled) return reply({ processed: 0, paused: true });
    const claimed = await admin.rpc("lj_claim_message_jobs");
    if (claimed.error) throw new Error("Unable to claim reminders.");
    let sent = 0,
      failed = 0,
      cancelled = 0;
    for (const job of (claimed.data || []) as Job[]) {
      const update = async (values: Record<string, unknown>) => {
        const result = await admin
          .from("lj_message_jobs")
          .update(values)
          .eq("id", job.id)
          .eq("status", "sending")
          .eq("lease_token", job.lease_token)
          .select("id");
        if (result.error || !result.data?.length)
          throw new Error("Unable to save the delivery result.");
      };
      try {
        if (new Date(job.expires_at).getTime() <= Date.now()) {
          await update({
            status: "cancelled",
            lease_until: null,
            last_error: "This update is no longer timely.",
          });
          cancelled++;
          continue;
        }
        let detail = "";
        if (job.appointment_id) {
          const result = await admin
            .from("lj_calendar")
            .select("status,starts_at,deposit_paid,deposit")
            .eq("id", job.appointment_id)
            .single();
          if (result.error) throw new Error("Unable to check the appointment.");
          const appointment = result.data;
          const expected =
            job.event === "request_received" || job.event === "deposit_reminder"
              ? "pending"
              : job.event === "appointment_cancelled"
                ? "cancelled"
                : job.event === "service_thanks"
                  ? "completed"
                  : "confirmed";
          if (
            job.event !== "payment_receipt" &&
            (appointment.status !== expected ||
              (job.payload?.appointment_start &&
                new Date(String(job.payload.appointment_start)).getTime() !==
                  new Date(appointment.starts_at).getTime()) ||
              (job.event === "deposit_reminder" && appointment.deposit_paid))
          ) {
            await update({
              status: "cancelled",
              last_error: "The appointment has changed.",
              lease_until: null,
            });
            cancelled++;
            continue;
          }
          detail = "\nAppointment: " + when(appointment.starts_at) + ".\n";
          if (job.event === "deposit_reminder")
            detail +=
              "Your deposit is TT$" +
              Number(appointment.deposit).toFixed(2) +
              ". If you already transferred it, contact the salon for verification. Please do not pay twice.\n";
        }
        if (job.purchase_id) {
          const result = await admin
            .from("lj_purchases")
            .select("status,kind,fulfillment")
            .eq("id", job.purchase_id)
            .single();
          if (result.error) throw new Error("Unable to check the request.");
          if (job.event.startsWith("order_") && result.data.status !== job.event.slice(6)) {
            await update({
              status: "cancelled",
              lease_until: null,
              last_error: "The order has changed.",
            });
            cancelled++;
            continue;
          }
          detail +=
            "\nThis update is for your " +
            (result.data.kind === "workshop"
              ? "workshop registration"
              : result.data.fulfillment === "delivery"
                ? "delivery order"
                : "pickup order") +
            ".\n";
        }
        if (job.waitlist_id) {
          const result = await admin
            .from("lj_waitlist")
            .select("status,requested_date")
            .eq("id", job.waitlist_id)
            .single();
          if (result.error) throw new Error("Unable to check the waitlist.");
          if (result.data.status !== "waiting") {
            await update({ status: "cancelled", lease_until: null });
            cancelled++;
            continue;
          }
          detail +=
            "\nRequested day: " +
            result.data.requested_date +
            ". Check current availability in the app. The waitlist does not reserve a time; booking and signed consent are still required.\n";
        }
        const state = await admin
          .from("lj_settings")
          .select("email_reminders_enabled")
          .eq("id", "business")
          .single();
        if (state.error) throw new Error("Unable to check delivery settings.");
        if (!state.data?.email_reminders_enabled) {
          await update({ status: "queued", lease_until: null });
          continue;
        }
        let payload: Email;
        const saved = job.payload?.email as Email | undefined;
        if (
          saved &&
          typeof saved.from === "string" &&
          Array.isArray(saved.to) &&
          typeof saved.subject === "string" &&
          typeof saved.text === "string"
        ) {
          payload = saved;
        } else {
          const identity = await admin.auth.admin.getUserById(job.customer_id);
          if (identity.error) throw new Error("Unable to check the recipient.");
          const recipient = identity.data?.user;
          if (!recipient?.email || !recipient.email_confirmed_at) {
            await update({
              status: "failed",
              lease_until: null,
              last_error: "The customer needs a verified account email.",
            });
            failed++;
            continue;
          }
          const subject = subjects[job.event];
          if (!subject) {
            await update({
              status: "failed",
              lease_until: null,
              last_error: "Unknown message type.",
            });
            failed++;
            continue;
          }
          const pending = ["request_received", "order_pending"].includes(job.event)
            ? "\nThis is an unpaid request. A transfer reference does not confirm receipt. The salon will verify your payment separately.\n"
            : "";
          const thanks =
            job.event === "service_thanks"
              ? "\nThank you for spending part of your day with us. For care advice specific to your service, please contact the salon.\n"
              : "";
          const cancellation =
            job.event === "appointment_cancelled" || job.event === "order_cancelled"
              ? "\nAny refund or credit requires separate salon processing under the cancellation policy. This message does not confirm a transfer of funds.\n"
              : "";
          const receipt =
            job.event === "payment_receipt"
              ? "\nRecorded payment: TT$" +
                Number(job.payload?.amount || 0).toFixed(2) +
                ".\nReference: " +
                String(job.payload?.reference || "Salon receipt") +
                ".\nReceived: " +
                (job.payload?.received_at
                  ? when(String(job.payload.received_at))
                  : "Recorded by the salon") +
                ".\n"
              : "";
          payload = {
            from: from!,
            to: [recipient.email],
            subject: subject + " · Lady J",
            text:
              subject +
              ".\n" +
              detail +
              pending +
              thanks +
              cancellation +
              receipt +
              "\nOpen your account: " +
              appUrl!.replace(/\/$/, "") +
              "/account\n" +
              (settings.data?.contact_phone
                ? "\nSalon: " + settings.data.contact_phone + "\n"
                : "") +
              "\nThis is a service update about your request, not a marketing message.",
          };
          await update({ payload: { ...job.payload, email: payload } });
        }
        // Reuse the exact saved payload and key if a response is lost after provider acceptance.
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
            "Idempotency-Key": "lady-j-" + job.id,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        });
        const result = await response.json();
        if (!response.ok || typeof result?.id !== "string") {
          const transient = response.status === 429 || response.status >= 500;
          await update({
            status: transient && job.attempts < 5 ? "queued" : "failed",
            lease_until: null,
            scheduled_at: new Date(Date.now() + 10 * 60000).toISOString(),
            last_error:
              "Email provider returned HTTP " +
              response.status +
              ". Review the provider connection.",
          });
          failed++;
        } else {
          await update({
            status: "sent",
            provider_id: result.id,
            sent_at: new Date().toISOString(),
            lease_until: null,
            last_error: null,
          });
          sent++;
        }
        await new Promise((resolve) => setTimeout(resolve, 550));
      } catch {
        await update({
          status: job.attempts < 5 ? "queued" : "failed",
          lease_until: null,
          scheduled_at: new Date(Date.now() + 10 * 60000).toISOString(),
          last_error:
            "Delivery could not be confirmed. The same message will be retried safely within its retry window.",
        }).catch(() => {});
        failed++;
      }
    }
    return reply({ sent, failed, cancelled });
  } catch {
    return reply(
      { error: "Unable to process communication. Please try again or check the function logs." },
      500,
    );
  }
});
