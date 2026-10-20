import { displayDate, monthNames } from "@/lib/salon/dates";
import CalendarPicker from "./CalendarPicker";
import { fieldLabel } from "@/lib/salon/design";
import { formatDuration } from "@/lib/salon/duration";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Txt, ButtonLabel, Action, useColors } from "./ui";

type Choice = { value: string; label: string };
function Wheel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useColors();
  const { fontScale } = useWindowDimensions();
  const [labelHeight, setLabelHeight] = useState(0);
  const rowHeight = Math.max(
    56,
    Math.ceil(20 * 1.25 * fontScale) + 24,
    Math.ceil(labelHeight) + 24,
  );
  const list = useRef<FlatList<Choice>>(null);
  const index = Math.max(
    0,
    options.findIndex((v) => v.value === value),
  );
  const position = useRef(index);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState(index);
  useEffect(() => {
    if (position.current !== index) {
      position.current = index;
      setSelected(index);
      list.current?.scrollToOffset({ offset: index * rowHeight, animated: false });
    }
  }, [index]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    list.current?.scrollToOffset({ offset: position.current * rowHeight, animated: false });
  }, [rowHeight]);
  const choose = (next: number) => {
    const i = Math.max(0, Math.min(options.length - 1, next));
    position.current = i;
    setSelected(i);
    onChange(options[i].value);
    list.current?.scrollToOffset({ offset: i * rowHeight, animated: true });
  };
  const scroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(
      0,
      Math.min(options.length - 1, Math.round(e.nativeEvent.contentOffset.y / rowHeight)),
    );
    position.current = i;
    setSelected(i);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(options[i].value);
      list.current?.scrollToOffset({ offset: i * rowHeight, animated: true });
    }, 160);
  };
  return (
    <View
      style={{ flex: 1, minWidth: 0, gap: 8 }}
      accessibilityRole="adjustable"
      accessibilityLabel={fieldLabel(label)}
      accessibilityValue={{ text: options[selected]?.label }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        choose(selected + (e.nativeEvent.actionName === "increment" ? 1 : -1))
      }
    >
      <Txt bold size={14} style={{ textAlign: "center" }}>
        {fieldLabel(label)}
      </Txt>
      <View style={{ height: rowHeight * 5, overflow: "hidden" }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: rowHeight * 2,
            height: rowHeight,
            left: 0,
            right: 0,
            borderRadius: 9,
            backgroundColor: c.secondary,
          }}
        />
        <FlatList
          ref={list}
          data={options}
          keyExtractor={(v) => v.value}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: rowHeight, offset: i * rowHeight, index: i })}
          contentContainerStyle={{ paddingVertical: rowHeight * 2 }}
          showsVerticalScrollIndicator={false}
          snapToInterval={rowHeight}
          decelerationRate="fast"
          onScroll={scroll}
          scrollEventThrottle={32}
          nestedScrollEnabled
          windowSize={5}
          initialNumToRender={9}
          renderItem={({ item, index: i }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${fieldLabel(label)}: ${item.label}`}
              onPress={() => choose(i)}
              style={{
                height: rowHeight,
                paddingHorizontal: 10,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ButtonLabel
                size={20}
                style={{ flexShrink: 0, maxWidth: "100%" }}
                onTextLayout={(event) => {
                  const height = event.nativeEvent.lines.reduce(
                    (sum, line) => sum + line.height,
                    0,
                  );
                  setLabelHeight((current) => Math.max(current, height));
                }}
                color={i === selected ? c.foreground : c.mutedForeground}
              >
                {item.label}
              </ButtonLabel>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}
const localToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const pad = (n: number) => String(n).padStart(2, "0");
function PickerFrame({
  title,
  onClose,
  onDone,
  children,
  clear,
}: {
  title: string;
  onClose: () => void;
  onDone: () => void;
  children: React.ReactNode;
  clear?: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <SafeAreaView
          edges={{ top: "off", bottom: "additive", left: "additive", right: "additive" }}
          style={{
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            gap: 20,
            maxWidth: 600,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Txt size={23} bold>
            {title}
          </Txt>
          {children}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Action label="Cancel" secondary onPress={onClose} />
            {clear && <Action label="Clear" secondary onPress={clear} />}
            <Action label="Done" onPress={onDone} style={{ backgroundColor: c.primary }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
function PickerButton({
  label,
  display,
  onPress,
}: {
  label: string;
  display: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 18, gap: 8 }}>
      <Txt size={18} bold>
        {fieldLabel(label)}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fieldLabel(label)}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.background,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 58,
        }}
      >
        <ButtonLabel size={20}>{display}</ButtonLabel>
        <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
          Tap to scroll and select
        </Txt>
      </Pressable>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  birthday = false,
  optional = false,
  calendar = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  birthday?: boolean;
  optional?: boolean;
  calendar?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || (birthday ? "1990-01-01" : localToday()));
  const [year, month, day] = draft.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: birthday ? 121 : 31 }, (_, i) =>
    birthday ? thisYear - 120 + i : thisYear - 20 + i,
  );
  const change = (y: number, m: number, d: number) =>
    setDraft(`${y}-${pad(m)}-${pad(Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate()))}`);
  return (
    <>
      <PickerButton
        label={fieldLabel(label)}
        display={value ? displayDate(value) : "Select date"}
        onPress={() => {
          setDraft(value || (birthday ? "1990-01-01" : localToday()));
          setOpen(true);
        }}
      />
      {open && (
        <PickerFrame
          title={fieldLabel(label)}
          onClose={() => setOpen(false)}
          onDone={() => {
            onChange(birthday && draft > localToday() ? localToday() : draft);
            setOpen(false);
          }}
          clear={
            optional
              ? () => {
                  onChange("");
                  setOpen(false);
                }
              : undefined
          }
        >
          {calendar ? (
            <CalendarPicker unrestricted value={draft} onChange={setDraft} />
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Wheel
                label="Day"
                value={String(day)}
                options={Array.from(
                  { length: new Date(Date.UTC(year, month, 0)).getUTCDate() },
                  (_, i) => ({ value: String(i + 1), label: String(i + 1) }),
                )}
                onChange={(v) => change(year, month, +v)}
              />
              <Wheel
                label="Month"
                value={String(month)}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: monthNames[i],
                }))}
                onChange={(v) => change(year, +v, day)}
              />
              <Wheel
                label="Year"
                value={String(year)}
                options={years.map((v) => ({ value: String(v), label: String(v) }))}
                onChange={(v) => change(+v, month, day)}
              />
            </View>
          )}
        </PickerFrame>
      )}
    </>
  );
}
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "10:00");
  const [hour, minute] = draft.split(":").map(Number);
  const [displayHour, displayMinute] = (value || "10:00").split(":").map(Number);
  const setTime = (h: number, m: number) => setDraft(`${pad(h)}:${pad(m)}`);
  return (
    <>
      <PickerButton
        label={fieldLabel(label)}
        display={`${displayHour % 12 || 12}:${pad(displayMinute)} ${displayHour >= 12 ? "PM" : "AM"}`}
        onPress={() => {
          setDraft(value || "10:00");
          setOpen(true);
        }}
      />
      {open && (
        <PickerFrame
          title={fieldLabel(label)}
          onClose={() => setOpen(false)}
          onDone={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Wheel
              label="Hour"
              value={String(hour % 12 || 12)}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              }))}
              onChange={(v) => setTime((+v % 12) + (hour >= 12 ? 12 : 0), minute)}
            />
            <Wheel
              label="Minute"
              value={String(minute)}
              options={Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: pad(i) }))}
              onChange={(v) => setTime(hour, +v)}
            />
            <Wheel
              label="Period"
              value={hour >= 12 ? "PM" : "AM"}
              options={[
                { value: "AM", label: "AM" },
                { value: "PM", label: "PM" },
              ]}
              onChange={(v) => setTime((hour % 12) + (v === "PM" ? 12 : 0), minute)}
            />
          </View>
        </PickerFrame>
      )}
    </>
  );
}
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const local = value
    ? value.includes("Z")
      ? new Date(new Date(value).getTime() - 4 * 3600000).toISOString().slice(0, 16)
      : value.replace(/-04:00$/, "").slice(0, 16)
    : `${localToday()}T10:00`;
  return (
    <View>
      <DateField
        label={label === "Date" ? "Date" : `${fieldLabel(label)} · Date`}
        value={local.slice(0, 10)}
        onChange={(v) => onChange(`${v}T${local.slice(11, 16)}`)}
      />
      <TimeField
        label={label === "Date" ? "Time" : `${fieldLabel(label)} · Time`}
        value={local.slice(11, 16)}
        onChange={(v) => onChange(`${local.slice(0, 10)}T${v}`)}
      />
    </View>
  );
}
export function DurationField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value || "60");
  const choices = Array.from({ length: 32 }, (_, i) => ({
    value: String((i + 1) * 15),
    label: formatDuration((i + 1) * 15),
  }));
  return (
    <>
      <PickerButton
        label={fieldLabel(label)}
        display={formatDuration(Number(value || 60))}
        onPress={() => {
          setDraft(String(Math.min(480, Math.max(15, Math.round(Number(value || 60) / 15) * 15))));
          setOpen(true);
        }}
      />
      {open && (
        <PickerFrame
          title={fieldLabel(label)}
          onClose={() => setOpen(false)}
          onDone={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          <Wheel label="Duration" options={choices} value={draft} onChange={setDraft} />
        </PickerFrame>
      )}
    </>
  );
}

export function ChoiceWheelField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <>
      <PickerButton
        label={label}
        display={options.find((v) => v.value === value)?.label || "Choose"}
        onPress={() => {
          if (!disabled) {
            setDraft(value);
            setOpen(true);
          }
        }}
      />
      {open && (
        <PickerFrame
          title={label}
          onClose={() => setOpen(false)}
          onDone={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          <Wheel label={label} options={options} value={draft} onChange={setDraft} />
        </PickerFrame>
      )}
    </>
  );
}
