import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { db, check, asRows } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import { WaitlistEntry } from "@/lib/salon/ownerAssistant";
import { dateLabel } from "@/lib/salon/types";
import { salonDayKey } from "@/lib/salon/ownerToday";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { Action, Card, ErrorBox, LinkText, Txt } from "./ui";
import { useNav } from "./Shell";
export function JoinWaitlist({ date, services }: { date: string; services: string[] }) {
  const [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const serviceKey = [...services].sort().join(",");
  useEffect(() => {
    setJoined(false);
    setError("");
  }, [date, serviceKey]);
  return (
    <View style={{ paddingTop: 20, gap: 12 }}>
      <Txt>
        No times are available for these services on this date. Choose another day or join the
        waitlist.
      </Txt>
      <Action
        label={joined ? "You’re on the waitlist" : "Join this day’s waitlist"}
        secondary
        disabled={joined || busy}
        busy={busy}
        onPress={() => {
          setBusy(true);
          setError("");
          void (async () => {
            try {
              check(await db().rpc("lj_join_waitlist", { p_date: date, p_services: services }));
              setJoined(true);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to join the waitlist. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
      {joined && (
        <Txt size={14}>
          Your request is saved in My appointments. The salon can contact you if a suitable opening
          appears. This does not reserve a time or confirm a booking.
        </Txt>
      )}
      {!!error && <ErrorBox message={error} />}
    </View>
  );
}
export function MyWaitlist() {
  const s = useSalon(),
    go = useNav();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const customer = s.session?.user.id;
  const load = useCallback(async () => {
    if (!customer) return;
    try {
      setEntries(
        asRows<WaitlistEntry>(
          check(
            await db()
              .from("lj_waitlist")
              .select("*")
              .eq("customer_id", customer)
              .eq("status", "waiting")
              .gte("requested_date", salonDayKey())
              .order("requested_date")
              .limit(10),
          ),
          "Waitlist",
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your waitlist.");
    }
  }, [customer]);
  useEffect(() => {
    void load();
  }, [load]);
  useForegroundRefresh(load, !!customer);
  if (!entries.length && !error) return null;
  return (
    <View style={{ gap: 14, marginTop: 20 }}>
      <Txt size={24} bold>
        My waitlist
      </Txt>
      {!!error && <ErrorBox message={error} retry={() => void load()} />}
      {entries.map((entry) => (
        <Card key={entry.id} style={{ gap: 12 }}>
          <Txt bold>{dateLabel(entry.requested_date + "T12:00:00-04:00")}</Txt>
          <Txt>{entry.service_names.join(" + ")}</Txt>
          <Txt size={14}>Waiting for an opening. No time is reserved.</Txt>
          <Action
            label="Check this day’s availability"
            secondary
            onPress={() => {
              const ids = entry.service_ids.filter((id) =>
                s.services.some((service) => service.id === id && service.active),
              );
              if (ids.length !== entry.service_ids.length) {
                s.notify("Some services have changed. Please choose from the current menu.");
                go("services");
                return;
              }
              s.setSelected(ids);
              go("booking", { date: entry.requested_date });
            }}
          />
          <LinkText
            onPress={() => {
              if (busy) return;
              setBusy(entry.id);
              void (async () => {
                try {
                  check(await db().rpc("lj_leave_waitlist", { p_id: entry.id }));
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to leave the waitlist.");
                } finally {
                  setBusy("");
                }
              })();
            }}
          >
            {busy === entry.id ? "Leaving" : "Leave waitlist"}
          </LinkText>
        </Card>
      ))}
    </View>
  );
}
