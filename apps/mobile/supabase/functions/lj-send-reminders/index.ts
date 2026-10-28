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
  payment_proof_received: "Payment proof received",
  payment_correction_requested: "Payment proof needs a correction",
  payment_hold_expired: "Your appointment hold has expired",
  birthday_7_day: "Your Special Birthday Surprise is almost here",
  birthday_greeting: "Happy Birthday from Lady J",
  vip_approved: "Your VIP Access request was approved",
  vip_declined: "An update on your VIP Access request",
  royalty_welcome: "Welcome to the Lady J Royalty Program",
  royalty_level_up: "A new Royalty level is yours",
  royalty_anniversary: "Your Lady J Royalty anniversary",
  gift_purchase_confirmed: "Your Lady J gift card is active",
  gift_expiration_30: "Your Lady J gift card has 30 days remaining",
  gift_expiration_7: "Your Lady J gift card has 7 days remaining",
  gift_delivered: "A thoughtful Lady J gift is waiting for you",
  gift_redeemed: "Your Lady J gift-card balance was updated",
  referral_pending: "Your Lady J referral is pending",
  referral_successful: "Your TT$25 referral credit is ready",
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
              : job.event === "payment_proof_received" || job.event === "payment_correction_requested"
                ? "pending"
                : job.event === "payment_hold_expired"
                  ? "cancelled"
              : job.event === "vip_approved"
                ? "pending"
                : job.event === "vip_declined"
                  ? "cancelled"
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
          let deliveryEmail = recipient.email;
          let giftDelivery = "";
          if (job.event === "gift_delivered") {
            const giftId = String(job.payload?.gift_card_id || "");
            const gift = await admin
              .from("lj_gift_cards")
              .select("recipient_email,recipient_name,sender_name,message,amount,secure_code,expires_at,payment_status,status")
              .eq("id", giftId)
              .single();
            if (gift.error || !gift.data || !["verified", "complimentary"].includes(gift.data.payment_status)) {
              await update({ status: "cancelled", lease_until: null, last_error: "The gift is no longer deliverable." });
              cancelled++;
              continue;
            }
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gift.data.recipient_email || "")) {
              await update({ status: "failed", lease_until: null, last_error: "Recipient email is unavailable; use the manual WhatsApp share." });
              failed++;
              continue;
            }
            deliveryEmail = gift.data.recipient_email;
            giftDelivery = `\nFor ${gift.data.recipient_name}. From ${gift.data.sender_name}.\nGift value: TT$${Number(gift.data.amount).toFixed(2)}.\nSecure code: ${gift.data.secure_code}.\nExpires: ${new Date(gift.data.expires_at).toLocaleDateString("en-TT", { timeZone: "America/Port_of_Spain", year: "numeric", month: "long", day: "numeric" })}.\n${gift.data.message ? `Message: ${gift.data.message}\n` : ""}`;
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
          const paymentUpdate =
            job.event === "payment_proof_received"
              ? "\nPayment Proof Received — Awaiting Verification. Your appointment remains reserved while Lady J verifies the transfer.\n"
              : job.event === "payment_correction_requested"
                ? "\nPlease resubmit your payment proof in your Lady J account. " +
                  (job.payload?.reason ? "Correction note: " + String(job.payload.reason) + ".\n" : "\n")
                : job.event === "payment_hold_expired"
                  ? "\nYour payment verification hold expired before funds could be verified. The time is available again; please choose a new appointment time.\n"
                  : "";
          let birthdayBenefit = "";
          if (job.event === "birthday_greeting") {
            const entitlement = await admin
              .from("lj_reward_entitlements")
              .select("amount")
              .eq("customer_id", job.customer_id)
              .eq("kind", "birthday")
              .eq("status", "available")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!entitlement.error && entitlement.data)
              birthdayBenefit = ` Your eligible TT$${Number(entitlement.data.amount).toFixed(2)} Birthday Surprise is ready in your account.`;
          }
          const birthday =
            job.event === "birthday_7_day"
              ? `\n${String(job.payload?.first_name || "Beautiful")}, your birthday is one week away. Your Special Birthday Surprise will appear in your Lady J account when eligible.\n`
              : job.event === "birthday_greeting"
                ? `\nHappy Birthday, ${String(job.payload?.first_name || "Beautiful")}! Wishing you a radiant day from Lady J.${birthdayBenefit}\n`
                : "";
          const vip =
            job.event === "vip_approved"
              ? "\nLady J approved your requested VIP time. Open your account to complete the existing payment or deposit flow; approval itself is not a booking confirmation.\n"
              : job.event === "vip_declined"
                ? "\nLady J could not approve this requested VIP time. No payment was collected. Please choose another available time in the app.\n"
                : "";
          const royalty =
            job.event === "royalty_welcome"
              ? "\nWelcome to 👑 Lady J Royalty Program. Every visit brings you closer to Royalty. Your membership and rewards wallet are ready in your account.\n"
              : job.event === "royalty_level_up"
                ? `\nCongratulations—you have reached ${String(job.payload?.level_name || "a new Royalty level")}. Your new digital membership card is waiting in your account.\n`
                : job.event === "royalty_anniversary"
                  ? "\nHappy Royalty anniversary. A new year of qualifying visits has begun, while your lifetime visits, achievements and rewards remain safely preserved.\n"
                  : "";
          const gifts =
            job.event === "gift_purchase_confirmed"
              ? "\nYour full payment was confirmed and your Lady J gift card is now active. Its exact six-month expiration date and secure sharing details are in your account.\n"
              : job.event === "gift_expiration_30"
                ? "\nA Lady J gift-card balance has 30 days remaining in its stated six-month validity period. The balance remains protected for owner review where expiration cannot legally be enforced.\n"
                : job.event === "gift_expiration_7"
                  ? "\nA Lady J gift-card balance has 7 days remaining in its stated six-month validity period. The balance remains protected for owner review where expiration cannot legally be enforced.\n"
                  : job.event === "gift_delivered"
                    ? "\nA thoughtful Lady J gift is waiting in your secure account. Sign in with the recipient email or mobile number to claim it.\n"
                    : job.event === "gift_redeemed"
                      ? "\nYour Lady J gift-card balance was updated after an appointment payment. View the secure card and transaction history in your account.\n"
                      : job.event === "referral_pending"
                        ? "\nYour referral is linked. Both TT$25 credits remain pending until the referred client's first fully paid eligible appointment of TT$350 or more.\n"
                        : job.event === "referral_successful"
                          ? "\nBeauty is better shared—your TT$25 referral credit is now available for a future appointment. It remains separate from Royalty Points and gift cards.\n"
                          : "";
          payload = {
            from: from!,
            to: [deliveryEmail],
            subject: subject + " · Lady J",
            text:
              subject +
              ".\n" +
              detail +
              pending +
              thanks +
              cancellation +
              receipt +
              paymentUpdate +
              birthday +
              vip +
              royalty +
              gifts +
              giftDelivery +
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
          if (job.event === "gift_delivered" && job.payload?.gift_card_id) {
            await admin
              .from("lj_gift_cards")
              .update({ status: "active", delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq("id", String(job.payload.gift_card_id))
              .in("status", ["scheduled", "active"]);
          }
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
