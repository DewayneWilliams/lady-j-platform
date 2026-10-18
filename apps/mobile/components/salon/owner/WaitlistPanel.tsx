import { formatDuration } from "@/lib/salon/duration";
import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Client, dateLabel } from "@/lib/salon/types";
import { WaitlistEntry } from "@/lib/salon/ownerAssistant";
import { whatsappContactUrl } from "@/lib/salon/whatsapp";
import { db, check } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, ErrorBox } from "../ui";
import { OwnerButton, OwnerText, OwnerTitle } from "./OwnerUI";
export default function WaitlistPanel({
  entries,
  clients,
  demo,
  onRefresh,
}: {
  entries: WaitlistEntry[];
  clients: Client[];
  demo: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [page, setPage] = useState(0),
    [busy, setBusy] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const s = useSalon();
  const pages = Math.max(1, Math.ceil(entries.length / 20));
  const current = Math.min(page, pages - 1);
  return (
    <View style={{ gap: 18 }}>
      <OwnerTitle
        title="Clients waiting for a time"
        description="An opening is an invitation to book. It never reserves a time automatically."
      />
      {!!error && <ErrorBox message={error} />}
      {!entries.length && (
        <Card>
          <OwnerText muted>
            No upcoming waitlist requests. Clients can join when their preferred date has no
            available times.
          </OwnerText>
        </Card>
      )}
      {entries.slice(current * 20, current * 20 + 20).map((entry) => {
        const client = clients.find(
          (v) => v.customer_id === entry.customer_id || v.id === entry.customer_id,
        );
        const url = whatsappContactUrl(
          client?.whatsapp_phone || client?.phone,
          "Hello " +
            (client?.first_name || client?.full_name || "") +
            ", regarding your Lady J waitlist request for " +
            dateLabel(entry.requested_date + "T12:00:00-04:00") +
            ": please check current availability in the app. A time is secured only when your booking is completed.",
        );
        return (
          <Card key={entry.id} style={{ gap: 14 }}>
            <OwnerText bold>{client?.full_name || "Registered client"}</OwnerText>
            <OwnerText>
              {dateLabel(entry.requested_date + "T12:00:00-04:00")} ·{" "}
              {formatDuration(entry.duration)}
            </OwnerText>
            <OwnerText muted>{entry.service_names.join(" + ")}</OwnerText>
            {!!entry.last_notified_at && (
              <OwnerText size={17} muted>
                An opening was detected. Check Communication for email status.
              </OwnerText>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <OwnerButton
                label="Open WhatsApp"
                icon="MessageCircle"
                secondary
                disabled={demo || !url}
                onPress={() => {
                  if (url)
                    void Linking.openURL(url).catch(() => s.notify("Unable to open WhatsApp."));
                }}
              />
              <OwnerButton
                label={confirm === entry.id ? "Confirm removal" : "Remove request"}
                secondary
                disabled={!!busy || demo}
                onPress={() => {
                  if (confirm !== entry.id) {
                    setConfirm(entry.id);
                    return;
                  }
                  setBusy(entry.id);
                  setError("");
                  void (async () => {
                    try {
                      check(await db().rpc("lj_leave_waitlist", { p_id: entry.id }));
                      await onRefresh();
                      setConfirm("");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Unable to remove this request.");
                    } finally {
                      setBusy("");
                    }
                  })();
                }}
              />
              {confirm === entry.id && (
                <OwnerButton label="Keep request" secondary onPress={() => setConfirm("")} />
              )}
            </View>
          </Card>
        );
      })}
      {pages > 1 && (
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <OwnerButton
            label="Previous"
            secondary
            disabled={current === 0}
            onPress={() => setPage(current - 1)}
          />
          <OwnerText>
            Page {current + 1} of {pages}
          </OwnerText>
          <OwnerButton
            label="Next"
            secondary
            disabled={current + 1 >= pages}
            onPress={() => setPage(current + 1)}
          />
        </View>
      )}
      <OwnerText size={17} muted>
        WhatsApp opens a draft for you to review and send. Automatic WhatsApp messages are not
        connected.
      </OwnerText>
    </View>
  );
}
