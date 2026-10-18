import React, { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import Icon from "@/lib/icons/LucideIcon";
import { Appointment } from "@/lib/salon/types";
import { addCalendarDays, blockReasons, localCalendarTime } from "@/lib/salon/calendarActivity";
import { db, check } from "@/lib/salon/client";
import { useSalon } from "@/lib/salon/SalonProvider";
import { DateField, DateTimeField } from "../DateFields";
import { Field, ErrorBox, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import CalendarActivityDot from "./CalendarActivityDot";
import { ownerEditorPortal } from "./OwnerEditorPortal";

function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 9, marginBottom: 20 }}>
      <OwnerText bold>{label}</OwnerText>
      <Select
        value={{ value, label: options.find((o) => o.value === value)?.label || value }}
        onValueChange={(option) => {
          if (option) onChange(option.value);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          accessibilityLabel={label}
          disabled={disabled}
          style={{
            minHeight: 58,
            height: "auto",
            borderRadius: 12,
            padding: 15,
            backgroundColor: c.background,
            borderColor: c.border,
          }}
        >
          <OwnerText>{options.find((o) => o.value === value)?.label || value}</OwnerText>
        </SelectTrigger>
        <SelectContent
          portalHost={ownerEditorPortal}
          position="popper"
          insets={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
            {options.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                label={o.label}
                textClassName="text-xl native:text-xl"
                style={{ minHeight: 58 }}
              />
            ))}
          </ScrollView>
        </SelectContent>
      </Select>
    </View>
  );
}
export default function BlockTimeEditor({
  date,
  block,
  live,
  initialReason = "personal",
  onSaved,
  onBusyChange,
}: {
  date: string;
  block: Appointment | null;
  live: boolean;
  initialReason?: string;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const c = useColors(),
    s = useSalon();
  const [reason, setReason] = useState(block?.block_reason || initialReason);
  const [description, setDescription] = useState(block?.block_description || block?.note || "");
  const [from, setFrom] = useState(block ? localCalendarTime(block.starts_at) : date + "T10:00");
  const [to, setTo] = useState(
    block
      ? block.all_day
        ? addCalendarDays(localCalendarTime(block.ends_at).slice(0, 10), -1) + "T11:00"
        : localCalendarTime(block.ends_at)
      : date + "T11:00",
  );
  const [allDay, setAllDay] = useState(block?.all_day || false);
  const [repeat, setRepeat] = useState(block?.block_repeat || "none");
  const [until, setUntil] = useState(block?.block_repeat_until || addCalendarDays(date, 84));
  const [weekdays, setWeekdays] = useState<number[]>(
    block?.block_weekdays?.length
      ? block.block_weekdays
      : [new Date(from.slice(0, 10) + "T12:00Z").getUTCDay()],
  );
  const [scope, setScope] = useState("one"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const requestKey = useRef("block-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const reasonInfo = blockReasons.find((r) => r.value === reason) || blockReasons[0];
  const updateFrom = (value: string) => {
    setFrom(value);
    const day = value.slice(0, 10),
      weekday = new Date(day + "T12:00Z").getUTCDay();
    setWeekdays((old) => (old.includes(weekday) ? old : [...old, weekday].sort()));
    if (to.slice(0, 10) < day) setTo(day + to.slice(10));
    if (until < day) setUntil(addCalendarDays(day, 84));
  };
  const save = async (remove = false) => {
    if (!live || busy) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (remove && block) {
        check(
          await db().rpc("lj_delete_calendar_block", {
            p_id: block.id,
            p_scope: scope,
            p_expected: block.updated_at,
          }),
        );
        s.notify(
          scope === "future"
            ? "This block and its future repeats were removed."
            : "Time block removed. This time is available again.",
        );
      } else {
        if (reason === "other" && !description.trim())
          throw new Error("Enter a description for Other (Specify).");
        const start = allDay ? from.slice(0, 10) + "T00:00" : from;
        const end = allDay ? addCalendarDays(to.slice(0, 10), 1) + "T00:00" : to;
        const startDate = new Date(start + ":00-04:00"),
          endDate = new Date(end + ":00-04:00");
        if (
          !Number.isFinite(startDate.getTime()) ||
          !Number.isFinite(endDate.getTime()) ||
          endDate <= startDate
        )
          throw new Error("Choose an end after the start.");
        const result = check(
          await db().rpc("lj_save_calendar_block", {
            p_id: block?.id || null,
            p_start: startDate.toISOString(),
            p_end: endDate.toISOString(),
            p_reason: reason,
            p_description: description.trim(),
            p_all_day: allDay,
            p_repeat: repeat,
            p_until: repeat === "none" ? null : until,
            p_weekdays: weekdays,
            p_scope: scope,
            p_expected: block?.updated_at || null,
            p_request_key: requestKey.current,
          }),
        ) as { count: number };
        s.notify(
          block
            ? "Blocked time updated."
            : result.count === 1
              ? "Time blocked."
              : result.count + " blocked periods saved.",
        );
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this schedule. Please try again.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {!live && (
        <OwnerText muted>
          Sign in as the salon owner to reserve real time. This preview does not create calendar
          records.
        </OwnerText>
      )}
      {!!error && <ErrorBox message={error} />}
      {confirmDelete ? (
        <View style={{ gap: 20 }}>
          <OwnerText bold>Are you sure you want to delete this blocked period?</OwnerText>
          <OwnerText>
            {scope === "future"
              ? "This block and future repeats in its schedule will be removed. Existing client appointments will be kept."
              : "Only this blocked period will be removed. Existing client appointments will be kept."}
          </OwnerText>
          <OwnerButton
            label={busy ? "Deleting…" : "Delete blocked period"}
            destructive
            disabled={busy || !live}
            onPress={() => void save(true)}
          />
          <OwnerButton
            label="Keep blocked period"
            secondary
            disabled={busy}
            onPress={() => setConfirmDelete(false)}
          />
        </View>
      ) : (
        <>
          <Choice label="Block reason" value={reason} options={blockReasons} onChange={setReason} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <CalendarActivityDot type={reasonInfo.color} size={9} />
            <OwnerText size={16} muted>
              {reasonInfo.label}
            </OwnerText>
          </View>
          <Field
            label={
              reason === "other"
                ? "Custom description (required)"
                : "Details (optional, owner only)"
            }
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="All-day block"
            accessibilityState={{ checked: allDay }}
            onPress={() => setAllDay(!allDay)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              minHeight: 58,
              marginBottom: 16,
            }}
          >
            <Icon name={allDay ? "SquareCheck" : "Square"} size={26} color={c.primary} />
            <OwnerText>All day</OwnerText>
          </Pressable>
          {allDay ? (
            <>
              <DateField
                label="Start date"
                value={from.slice(0, 10)}
                onChange={(day) => updateFrom(day + "T10:00")}
              />
              <DateField
                label="End date (included)"
                value={to.slice(0, 10)}
                onChange={(day) => setTo(day + "T11:00")}
              />
              <OwnerText size={16} muted>
                Reserves every hour of the selected dates.
              </OwnerText>
            </>
          ) : (
            <>
              <DateTimeField label="Start" value={from} onChange={updateFrom} />
              <DateTimeField label="End" value={to} onChange={setTo} />
            </>
          )}
          <View style={{ marginVertical: 12 }}>
            <OwnerText size={16} muted>
              Trinidad & Tobago time (GMT−4). Existing appointments are protected.
            </OwnerText>
          </View>
          {!block ? (
            <>
              <Choice
                label="Repeat"
                value={repeat}
                options={[
                  { value: "none", label: "Does not repeat" },
                  { value: "daily", label: "Every day" },
                  { value: "weekly", label: "Every week" },
                  { value: "monthly", label: "Every month" },
                ]}
                onChange={setRepeat}
              />
              {repeat === "weekly" && (
                <View style={{ gap: 10, marginBottom: 20 }}>
                  <OwnerText bold>Repeat on</OwnerText>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                      <Pressable
                        key={day}
                        accessibilityRole="checkbox"
                        accessibilityLabel={"Repeat on " + day}
                        accessibilityState={{ checked: weekdays.includes(i) }}
                        onPress={() =>
                          setWeekdays((old) =>
                            old.includes(i) ? old.filter((n) => n !== i) : [...old, i].sort(),
                          )
                        }
                        style={{
                          minHeight: 48,
                          minWidth: 48,
                          borderRadius: 12,
                          backgroundColor: weekdays.includes(i) ? c.secondary : c.background,
                          borderWidth: 1,
                          borderColor: weekdays.includes(i) ? c.primary : c.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <OwnerText size={16}>{day}</OwnerText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {repeat !== "none" && (
                <>
                  <DateField label="Repeat until" value={until} onChange={setUntil} />
                  <OwnerText size={16} muted>
                    {repeat === "monthly"
                      ? "Repeats on the same day of the month. Months without that date are skipped."
                      : "Repeats through this date, up to one year from the start."}
                  </OwnerText>
                </>
              )}
            </>
          ) : (
            block.block_series_id && (
              <>
                <Choice
                  label="Apply changes to"
                  value={scope}
                  options={[
                    { value: "one", label: "Only this block" },
                    { value: "future", label: "This and future repeats" },
                  ]}
                  onChange={setScope}
                />
                <OwnerText size={16} muted>
                  Part of a {block.block_repeat} schedule. To change its repeat pattern, delete
                  future repeats and create a new schedule.
                </OwnerText>
              </>
            )
          )}
          <View style={{ marginTop: 20 }}>
            <OwnerButton
              label={busy ? "Saving…" : block ? "Save blocked time" : "Block this time"}
              disabled={busy || !live}
              onPress={() => void save()}
            />
          </View>
          {block && (
            <View
              style={{ marginTop: 24, paddingTop: 22, borderTopWidth: 1, borderColor: c.border }}
            >
              <OwnerButton
                label="Delete blocked period"
                icon="Trash2"
                destructive
                disabled={busy || !live}
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
