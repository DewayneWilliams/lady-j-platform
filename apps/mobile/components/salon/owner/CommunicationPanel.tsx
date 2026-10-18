import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { dateLabel } from "@/lib/salon/types";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { Card, ErrorBox } from "../ui";
import { OwnerButton, OwnerText, OwnerTitle } from "./OwnerUI";
type Connection = { configured: boolean; enabled: boolean; missing: string[] };
type Message = {
  id: string;
  event: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  last_error: string | null;
  attempts: number;
};
const labels: Record<string, string> = {
  queued: "Waiting to send",
  sending: "Sending",
  sent: "Accepted by email provider",
  failed: "Needs review",
  cancelled: "No longer needed",
};
const eventLabels: Record<string, string> = {
  request_received: "Appointment request",
  deposit_reminder: "Deposit reminder",
  appointment_confirmed: "Appointment confirmation",
  reminder_24h: "24-hour reminder",
  reminder_2h: "2-hour reminder",
  appointment_cancelled: "Appointment cancellation",
  service_thanks: "After-visit thank you",
  payment_receipt: "Payment receipt",
  waitlist_opening: "Waitlist opening",
  order_pending: "Order request",
  order_paid: "Order payment",
  order_processing: "Order preparation",
  order_ready: "Order ready",
  order_fulfilled: "Order complete",
  order_cancelled: "Order cancellation",
};
export default function CommunicationPanel({ demo }: { demo: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  const invoke = async (action: string) => {
    const response = await db().functions.invoke("lj-send-reminders", { body: { action } });
    if (response.error) {
      let message = "Unable to reach email delivery. Check the provider setup and try again.";
      try {
        const body = await response.error.context?.json();
        if (typeof body?.error === "string") message = body.error;
      } catch {
        /* Keep the fallback message if the response is not JSON. */
      }
      throw new Error(message);
    }
    if (response.data?.error) throw new Error(String(response.data.error));
    return response.data;
  };
  const load = useCallback(async () => {
    if (demo) return;
    setError("");
    try {
      const [status, jobs] = await Promise.all([
        invoke("status"),
        db()
          .from("lj_message_jobs")
          .select("id,event,status,scheduled_at,sent_at,last_error,attempts", { count: "exact" })
          .order("created_at", { ascending: false })
          .order("id")
          .range(page * 20, page * 20 + 19),
      ]);
      setConnection(status as Connection);
      setMessages(check(jobs) as Message[]);
      setTotal(jobs.count || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load communication.");
    }
  }, [demo, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useForegroundRefresh(load, !demo);
  const act = async (action: string) => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await invoke(action);
      setResult(
        action === "configure"
          ? "Email reminders are on. Due messages are checked every five minutes."
          : action === "pause"
            ? "Email delivery is paused."
            : String(response.sent || 0) +
              " email(s) accepted by the provider. " +
              String(response.failed || 0) +
              " need retry or review.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update communication.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <OwnerTitle
        title="Communication"
        description="Helpful service updates, with a clear record of what happened."
      />
      <Card style={{ gap: 16 }}>
        <OwnerText size={24} bold>
          {demo
            ? "Demo · Email delivery is paused"
            : !connection && !error
              ? "Checking email connection…"
              : connection?.enabled && connection?.configured
                ? "Email reminders are on"
                : "Email delivery is paused"}
        </OwnerText>
        <OwnerText muted>
          Appointment requests, deposit reminders, confirmations, 24-hour and 2-hour reminders,
          receipts, order updates, waitlist openings and an after-visit thank you.
        </OwnerText>
        {!demo && connection && !connection.configured && (
          <OwnerText>
            Setup needed in Supabase → Secrets: {connection.missing.join(", ")}. Use a verified
            sender. No email can be sent until setup is complete.
          </OwnerText>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <OwnerButton
            label={connection?.enabled ? "Pause email reminders" : "Turn on email reminders"}
            disabled={demo || busy || !connection?.configured}
            onPress={() => void act(connection?.enabled ? "pause" : "configure")}
          />
          <OwnerButton
            label="Send due messages now"
            secondary
            disabled={demo || busy || !connection?.enabled || !connection?.configured}
            onPress={() => void act("process")}
          />
          <OwnerButton
            label="Refresh status"
            secondary
            disabled={demo || busy}
            onPress={() => void load()}
          />
        </View>
        <OwnerText size={17} muted>
          Only service updates go to the account’s verified email. Marketing and birthday offers are
          separate and remain off. WhatsApp automation is not connected; client buttons open a draft
          for you to send.
        </OwnerText>
      </Card>
      {!!error && <ErrorBox message={error} retry={() => void load()} />}
      {!!result && <OwnerText>{result}</OwnerText>}
      <OwnerText size={24} bold>
        Recent email activity
      </OwnerText>
      {!messages.length && (
        <Card>
          <OwnerText muted>
            {demo
              ? "No messages are sent from the demo workspace."
              : "New booking, payment and order updates will appear here. Old or changed requests are skipped automatically."}
          </OwnerText>
        </Card>
      )}
      {messages.map((message) => (
        <Card key={message.id} style={{ gap: 8 }}>
          <OwnerText bold>{eventLabels[message.event] || "Service update"}</OwnerText>
          <OwnerText>{labels[message.status] || message.status}</OwnerText>
          <OwnerText size={17} muted>
            {dateLabel(message.sent_at || message.scheduled_at)} · {message.attempts} attempt(s)
          </OwnerText>
          {!!message.last_error && (
            <OwnerText size={17} muted>
              {message.last_error}
            </OwnerText>
          )}
        </Card>
      ))}
      <OwnerText size={17} muted>
        Provider acceptance means the email was submitted successfully. It does not guarantee
        arrival in the inbox.
      </OwnerText>
      {total > 20 && (
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <OwnerButton
            label="Previous"
            secondary
            disabled={page === 0}
            onPress={() => setPage(page - 1)}
          />
          <OwnerText>
            Page {page + 1} of {Math.ceil(total / 20)}
          </OwnerText>
          <OwnerButton
            label="Next"
            secondary
            disabled={(page + 1) * 20 >= total}
            onPress={() => setPage(page + 1)}
          />
        </View>
      )}
    </View>
  );
}
