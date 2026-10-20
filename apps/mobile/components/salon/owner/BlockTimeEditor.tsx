import { validReportDate } from "@/lib/salon/revenueReport";
import BlockReasonField from "./BlockReasonField";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { Appointment } from "@/lib/salon/types";
import { localCalendarTime } from "@/lib/salon/calendarActivity";
import { db, check } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import { DateField, TimeField } from "../DateFields";
import { Txt, useColors } from "../ui";
import { OwnerButton } from "./OwnerUI";

export default function BlockTimeEditor({
  date,
  block,
  live,
  initialReason = "personal",
  onSaved,
  onBusyChange,
  onDemoSave,
}: {
  date: string;
  block: Appointment | null;
  live: boolean;
  initialReason?: string;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  onDemoSave: (block: Appointment) => void;
}) {
  const c = useColors(),
    s = useSalon();
  const [reason, setReason] = useState(block?.block_reason || initialReason);
  const [from, setFrom] = useState(block ? localCalendarTime(block.starts_at) : date + "T10:00");
  const [to, setTo] = useState(block ? localCalendarTime(block.ends_at) : date + "T11:00");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const saving = useRef(false);
  const requestKey = useRef("block-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const save = async () => {
    if (saving.current) return;
    setError("");
    const startDate = new Date(from + ":00-04:00"),
      endDate = new Date(to + ":00-04:00");
    if (
      !validReportDate(from.slice(0, 10)) ||
      !validReportDate(to.slice(0, 10)) ||
      !Number.isFinite(startDate.getTime()) ||
      !Number.isFinite(endDate.getTime()) ||
      endDate <= startDate
    ) {
      setError("End must be after start.");
      return;
    }
    saving.current = true;
    setBusy(true);
    onBusyChange(true);
    const description = block?.block_description || (reason === "other" ? "Blocked time" : "");
    try {
      if (live) {
        check(
          await db().rpc("lj_save_calendar_block", {
            p_id: block?.id || null,
            p_start: startDate.toISOString(),
            p_end: endDate.toISOString(),
            p_reason: reason,
            p_description: description,
            p_all_day: false,
            p_repeat: "none",
            p_until: null,
            p_weekdays: [],
            p_scope: "one",
            p_expected: block?.updated_at || null,
            p_request_key: requestKey.current,
          }),
        );
      } else {
        onDemoSave({
          id: block?.id || requestKey.current,
          customer_id: "",
          kind: "block",
          status: "confirmed",
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          services: [],
          total: 0,
          deposit: 0,
          deposit_paid: false,
          note: description,
          block_description: description,
          block_reason: reason,
          block_repeat: "none",
          all_day: false,
          updated_at: new Date().toISOString(),
        });
      }
      s.notify(live ? "Time blocked." : "Time blocked.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save block.");
    } finally {
      saving.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <BlockReasonField value={reason} onChange={setReason} disabled={busy} />
      <DateField
        calendar
        label="From"
        value={from.slice(0, 10)}
        onChange={(v) => setFrom(v + from.slice(10))}
      />
      <TimeField
        label="Start time"
        value={from.slice(11, 16)}
        onChange={(v) => setFrom(from.slice(0, 11) + v)}
      />
      <DateField
        calendar
        label="To"
        value={to.slice(0, 10)}
        onChange={(v) => setTo(v + to.slice(10))}
      />
      <TimeField
        label="End time"
        value={to.slice(11, 16)}
        onChange={(v) => setTo(to.slice(0, 11) + v)}
      />
      {!!error && (
        <Txt size={16} color={c.paymentPending}>
          {error}
        </Txt>
      )}
      <OwnerButton label={busy ? "Saving" : "Save"} disabled={busy} onPress={() => void save()} />
    </View>
  );
}
