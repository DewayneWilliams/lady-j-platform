import { useCalendarRealtime } from "@/lib/salon/useCalendarRealtime";
import { formatDuration } from "@/lib/salon/duration";
import { useLocalSearchParams } from "expo-router";
import { validReportDate } from "@/lib/salon/revenueReport";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { JoinWaitlist } from "./Waitlist";
import ServiceAgreement from "./ServiceAgreement";
import { serviceCategories } from "@/lib/salon/categories";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import PromoCode from "./PromoCode";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { db, check } from "@/lib/salon/client";
import { money, dateLabel, timeLabel } from "@/lib/salon/types";
import Shell, { useNav } from "./Shell";
import { Search } from "./CatalogScreens";
import {
  Txt,
  Action,
  Heading,
  Photo,
  Tag,
  LinkText,
  Card,
  Chip,
  Check,
  Empty,
  Field,
  ErrorBox,
  useColors,
  shared,
} from "./ui";
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function CalendarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  const c = useColors();
  const [month, setMonth] = useState(() => new Date(`${value || todayKey()}T12:00:00Z`));
  const year = month.getUTCFullYear(),
    m = month.getUTCMonth(),
    days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate(),
    offset = new Date(Date.UTC(year, m, 1)).getUTCDay();
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Pressable
          accessibilityLabel="Previous month"
          onPress={() => setMonth(new Date(Date.UTC(year, m - 1, 1)))}
          style={{ padding: 14 }}
        >
          <Icon name="ChevronLeft" color={c.foreground} size={20} />
        </Pressable>
        <Txt bold size={18}>
          {month.toLocaleDateString("en-TT", { month: "long", year: "numeric", timeZone: "UTC" })}
        </Txt>
        <Pressable
          accessibilityLabel="Next month"
          onPress={() => setMonth(new Date(Date.UTC(year, m + 1, 1)))}
          style={{ padding: 14 }}
        >
          <Icon name="ChevronRight" color={c.foreground} size={20} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((v, i) => (
          <View key={i} style={{ width: "14.285%", alignItems: "center", paddingBottom: 12 }}>
            <Txt size={13} color={c.mutedForeground}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: offset + days }, (_, i) => {
          const n = i - offset + 1;
          const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
          const day = i % 7,
            disabled = n < 1 || key < todayKey() || day === 0 || day === 1;
          return (
            <Pressable
              key={i}
              disabled={disabled}
              accessibilityLabel={key}
              accessibilityState={{ selected: value === key, disabled }}
              onPress={() => onChange(key)}
              style={{
                width: "14.285%",
                height: 49,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n > 0 && (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    backgroundColor: value === key ? c.primary : "transparent",
                  }}
                >
                  <Txt
                    size={15}
                    bold={value === key}
                    color={
                      value === key
                        ? c.primaryForeground
                        : disabled
                          ? c.mutedForeground
                          : c.foreground
                    }
                    style={{ opacity: disabled ? 0.35 : 1 }}
                  >
                    {n}
                  </Txt>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function PaymentChoice({
  method,
  setMethod,
}: {
  method: string;
  setMethod: (v: string) => void;
}) {
  const c = useColors(),
    s = useSalon();
  return (
    <View style={{ gap: 13 }}>
      {[
        {
          id: "simulation",
          icon: "CreditCard" as const,
          title: "Credit / debit card",
          desc: "Not available yet · Please use bank transfer",
        },
        {
          id: "bank",
          icon: "Landmark" as const,
          title: "Bank transfer",
          desc: "Pending until the owner verifies your funds",
        },
      ].map((v) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: method === v.id, disabled: v.id === "simulation" }}
          key={v.id}
          disabled={v.id === "simulation"}
          onPress={() => setMethod(v.id)}
          style={{
            padding: 18,
            opacity: v.id === "simulation" ? 0.55 : 1,
            borderWidth: method === v.id ? 2 : 1,
            borderColor: method === v.id ? c.primary : c.border,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Icon name={v.icon} size={23} color={c.secondaryForeground} />
          <View style={{ flex: 1 }}>
            <Txt bold size={15}>
              {v.title}
            </Txt>
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 3 }}>
              {v.desc}
            </Txt>
          </View>
          <Icon
            name={method === v.id ? "CircleCheck" : "Circle"}
            size={21}
            color={method === v.id ? c.primary : c.border}
          />
        </Pressable>
      ))}
      {method === "bank" && (
        <Card style={{ backgroundColor: c.secondary }}>
          <Txt bold size={14}>
            Bank transfer instructions
          </Txt>
          <Txt size={14} style={{ marginTop: 8 }}>
            {s.settings?.bank_instructions ||
              "The salon has not provided bank details yet. You may submit an unpaid request; contact the salon for instructions before transferring any funds."}
          </Txt>
          <Txt size={12} style={{ marginTop: 10, opacity: 0.7 }}>
            Your appointment or purchase remains pending until the owner confirms receipt. A
            transfer reference alone does not confirm payment.
          </Txt>
        </Card>
      )}
    </View>
  );
}
export default function BookingScreen() {
  const s = useSalon(),
    c = useColors(),
    go = useNav(),
    { width } = useWindowDimensions();
  const { date: requestedDate } = useLocalSearchParams<{ date?: string }>();
  const initialDate =
    typeof requestedDate === "string" &&
    validReportDate(requestedDate) &&
    requestedDate >= todayKey()
      ? requestedDate
      : todayKey();
  const [step, setStep] = useState(1),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [date, setDate] = useState(initialDate),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [slotLoading, setSlotLoading] = useState(false),
    [error, setError] = useState(""),
    [method, setMethod] = useState("bank"),
    [reference, setReference] = useState(""),
    [policy, setPolicy] = useState(false),
    [agreementId, setAgreementId] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(""),
    [photo, setPhoto] = useState("");
  const selected = s.services.filter((v) => s.selected.includes(v.id));
  const pricing = useDiscountQuote(
    "service",
    selected.map((v) => ({ id: v.id, quantity: 1 })),
  );
  const total = Number(
      pricing.quote?.subtotal ?? selected.reduce((n, v) => n + Number(v.price), 0),
    ),
    duration = selected.reduce((n, v) => n + v.duration, 0),
    deposit = Math.round(total * 50) / 100;
  const slotGeneration = useRef(0);
  const customerId = s.session?.user.id;
  const refreshSlots = useCallback(async () => {
    if (!customerId || !s.authReady || step !== 2 || !duration) return;
    const generation = ++slotGeneration.current;
    setSlotLoading(true);
    setError("");
    try {
      const data = check(await db().rpc("lj_available", { p_date: date, p_duration: duration })) as
        | { starts_at: string }[]
        | null;
      if (generation !== slotGeneration.current) return;
      const next = (data || []).map((row) => row.starts_at);
      setSlots(next);
      setTime((previous) => (next.includes(previous) ? previous : ""));
    } catch (e) {
      if (generation === slotGeneration.current) {
        setSlots([]);
        setTime("");
        setError(
          e instanceof Error ? e.message : "Unable to check availability. Please try again.",
        );
      }
    } finally {
      if (generation === slotGeneration.current) setSlotLoading(false);
    }
  }, [customerId, s.authReady, step, duration, date]);
  useEffect(() => {
    setTime("");
    setSlots([]);
    void refreshSlots();
    return () => {
      slotGeneration.current += 1;
    };
  }, [refreshSlots]);
  useForegroundRefresh(refreshSlots, step === 2 && !!customerId && s.authReady);
  useCalendarRealtime(refreshSlots, step === 2 && !!customerId && s.authReady);
  async function choosePhoto() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!r.canceled) setPhoto(r.assets?.[0]?.uri || "");
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to open your photos.");
    }
  }
  async function submit() {
    setError("");
    if (!policy || !time || !agreementId || (s.session && !pricing.ready)) return;
    if (method === "simulation") {
      setDone("demo");
      return;
    }
    if (!s.session) {
      go("login", { next: "booking" });
      return;
    }
    setBusy(true);
    try {
      const id = check(
        await db().rpc("lj_book", {
          p_services: selected.map((v) => v.id),
          p_start: time,
          p_reference: reference,
          p_policy: policy,
          p_code: pricing.code,
        }),
      );
      setDone(String(id));
      await s.refreshPrivate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t save your request. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <Shell>
        <View style={{ maxWidth: 640, alignSelf: "center", width: "100%", paddingVertical: 35 }}>
          <Card style={{ alignItems: "center", padding: 35, gap: 18 }}>
            <Icon
              name={done === "demo" ? "Sparkles" : "CalendarCheck"}
              size={42}
              color={c.primary}
            />
            <Tag>
              {done === "demo"
                ? "Payment simulation · No booking created"
                : "Request saved · Payment pending"}
            </Tag>
            <Txt serif size={34} style={{ textAlign: "center" }}>
              {done === "demo" ? "A preview of your next moment." : "Your moment is on its way."}
            </Txt>
            <Txt style={{ textAlign: "center" }}>
              {selected.map((v) => v.name).join(" + ")}
              {`\n`}
              {dateLabel(time)} at {timeLabel(time)}
            </Txt>
            <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {done === "demo"
                ? "This was a demonstration. No card was charged, no time was reserved, and no appointment was created. Choose bank transfer to submit a real unpaid request."
                : "Your appointment is reserved pending owner verification of your bank deposit. This is not a payment receipt or a confirmed appointment."}
            </Txt>
            {done === "demo" ? (
              <Action
                label="Choose bank transfer"
                onPress={() => {
                  setDone("");
                  setMethod("bank");
                }}
              />
            ) : (
              <Action label="View my appointments" onPress={() => go("appointments")} />
            )}
            <LinkText onPress={() => go("home")}>Return home</LinkText>
          </Card>
        </View>
      </Shell>
    );
  return (
    <Shell footer={false}>
      <Heading sub="A little time for you, in three simple steps.">Book your moment</Heading>
      <View
        style={{
          flexDirection: "row",
          gap: width > 600 ? 30 : 8,
          marginVertical: 10,
          marginBottom: 30,
        }}
      >
        {["Your service", "Date & time", "Secure appointment"].map((v, i) => (
          <Pressable
            key={v}
            disabled={i + 1 > step}
            onPress={() => {
              setStep(i + 1);
              setError("");
            }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
              paddingBottom: 18,
              borderBottomWidth: 2,
              borderColor: step === i + 1 ? c.primary : c.border,
            }}
          >
            <View
              style={{
                width: 27,
                height: 27,
                borderRadius: 14,
                backgroundColor: step === i + 1 ? c.primary : c.muted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt size={12} color={step === i + 1 ? c.primaryForeground : c.mutedForeground}>
                {i + 1}
              </Txt>
            </View>
            <Txt size={width > 600 ? 14 : 11} bold={step === i + 1}>
              {v}
            </Txt>
          </Pressable>
        ))}
      </View>
      {!!error && <ErrorBox message={error} />}
      {step === 1 && (
        <View style={{ flexDirection: width > 900 ? "row" : "column", gap: 28 }}>
          <View style={{ flex: 1 }}>
            <Search value={query} onChange={setQuery} placeholder="Find your service" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 18 }}
            >
              {serviceCategories(s.services.map((v) => v.category)).map((v) => (
                <Chip key={v} label={v} selected={category === v} onPress={() => setCategory(v)} />
              ))}
            </ScrollView>
            <Tag>Demo catalog · Professional confirmation required</Tag>
            <View style={{ height: 16 }} />
            {s.services
              .filter(
                (v) =>
                  (category === "All" || v.category === category) &&
                  v.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((v) => (
                <Pressable
                  key={v.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.selected.includes(v.id) }}
                  onPress={() =>
                    s.setSelected((old) =>
                      old.includes(v.id) ? old.filter((id) => id !== v.id) : [...old, v.id],
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: s.selected.includes(v.id) ? c.primary : c.border,
                    borderRadius: 14,
                    marginBottom: 12,
                    backgroundColor: c.card,
                  }}
                >
                  <Photo name={v.image} style={{ width: 72, height: 82, borderRadius: 10 }} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Txt bold size={15}>
                      {v.name}
                    </Txt>
                    <Txt size={12} color={c.mutedForeground} lines={2}>
                      {v.description}
                    </Txt>
                    <Txt size={13}>
                      {formatDuration(v.duration)} {s.session ? ` · ${money(v.price)}` : ""}
                    </Txt>
                  </View>
                  <Icon
                    name={s.selected.includes(v.id) ? "CircleCheck" : "CirclePlus"}
                    size={24}
                    color={s.selected.includes(v.id) ? c.primary : c.mutedForeground}
                  />
                </Pressable>
              ))}
          </View>
          <View style={{ width: width > 900 ? 315 : undefined, gap: 20 }}>
            <Card>
              <Txt serif size={24}>
                Your inspiration
              </Txt>
              <Txt size={13} color={c.mutedForeground} style={{ marginVertical: 13 }}>
                Have a look in mind? Choose a photo to explore a matching service.
              </Txt>
              {!!photo && (
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", height: 180, borderRadius: 12, marginBottom: 12 }}
                />
              )}
              <Action
                label={photo ? "Change photo" : "Choose inspiration photo"}
                icon="ImagePlus"
                secondary
                onPress={() => void choosePhoto()}
              />
              {!!photo && (
                <View style={{ gap: 10, marginTop: 15 }}>
                  <Tag>AI simulation</Tag>
                  <Txt size={13}>
                    This photo stays on your device. AI analysis is not connected. Our sample
                    suggestion is a signature silk press; your stylist must confirm suitability and
                    the final quote.
                  </Txt>
                  <LinkText
                    onPress={() => {
                      const v = s.services.find((v) => v.name === "Signature silk press");
                      if (v) s.setSelected((old) => (old.includes(v.id) ? old : [...old, v.id]));
                    }}
                  >
                    Add suggested service
                  </LinkText>
                </View>
              )}
            </Card>
            <Card style={{ backgroundColor: c.secondary }}>
              <Txt bold size={15}>
                {selected.length} service{selected.length === 1 ? "" : "s"} selected
              </Txt>
              <Txt size={13} style={{ marginTop: 8, marginBottom: 18 }}>
                {formatDuration(duration)}{" "}
                {s.session ? `· ${money(total)}` : "· Sign in for pricing"}
              </Txt>
              <Action
                label="Choose date & time"
                disabled={!selected.length || selected.length > 10}
                icon="ArrowRight"
                onPress={() => setStep(2)}
                style={{ alignSelf: "stretch" }}
              />
            </Card>
          </View>
        </View>
      )}
      {step === 2 && (
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 26 }}>
          <Card style={{ flex: 1 }}>
            {!!s.settings?.max_daily_bookings_per_client && (
              <Txt color={c.mutedForeground} style={{ marginBottom: 16 }}>
                Up to {s.settings.max_daily_bookings_per_client} appointment
                {s.settings.max_daily_bookings_per_client === 1 ? "" : "s"} per client per day. You
                can combine several services in one appointment.
              </Txt>
            )}
            <CalendarPicker value={date} onChange={setDate} />
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 16, textAlign: "center" }}>
              Tuesday–Saturday · 10 AM–6 PM{`\n`}America/Port_of_Spain (GMT−4)
            </Txt>
          </Card>
          <Card style={{ flex: 1 }}>
            <Txt serif size={27}>
              Make time for yourself
            </Txt>
            <Txt size={14} color={c.mutedForeground} style={{ marginVertical: 12 }}>
              {dateLabel(`${date}T12:00:00Z`)} · {formatDuration(duration)}
            </Txt>
            {slotLoading ? (
              <ActivityIndicator color={c.primary} style={{ margin: 35 }} />
            ) : (
              <View style={shared.wrap}>
                {slots.map((slot) => (
                  <Chip
                    key={slot}
                    label={timeLabel(slot)}
                    selected={time === slot}
                    onPress={() => setTime(slot)}
                  />
                ))}
              </View>
            )}
            {!slotLoading && !slots.length && <JoinWaitlist date={date} services={s.selected} />}
            <View style={{ marginTop: 28 }}>
              <Action
                label="Continue to deposit"
                icon="ArrowRight"
                disabled={!time || slotLoading}
                onPress={() => setStep(3)}
              />
            </View>
            <LinkText onPress={() => setStep(1)}>Change services</LinkText>
          </Card>
        </View>
      )}
      {step === 3 && (
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 27 }}>
          <View style={{ flex: 1 }}>
            <Txt serif size={28} style={{ marginBottom: 20 }}>
              Secure your appointment
            </Txt>
            {!s.session ? (
              <Card style={{ gap: 15, marginBottom: 20 }}>
                <Txt>
                  Your account keeps your bookings private. Sign in to see your prices and submit a
                  real request.
                </Txt>
                <Action
                  label="Sign in to continue"
                  onPress={() => go("login", { next: "booking" })}
                />
                <LinkText onPress={() => go("register", { next: "booking" })}>
                  Create your private account
                </LinkText>
              </Card>
            ) : null}
            {s.session && (
              <ServiceAgreement services={selected.map((v) => v.id)} onReady={setAgreementId} />
            )}
            {s.session && <PromoCode pricing={pricing} />}
            <PaymentChoice method={method} setMethod={setMethod} />
            {method === "bank" && (
              <View style={{ marginTop: 18 }}>
                <Field
                  label="Bank transfer reference (if available)"
                  value={reference}
                  onChangeText={setReference}
                  placeholder="You can submit an unpaid request"
                />
              </View>
            )}
            <Check
              checked={policy}
              onPress={() => setPolicy(!policy)}
              label="I understand the 50% deposit and cancellation terms in my signed agreement."
            />
            <LinkText onPress={() => go("policies")}>Read the cancellation policy</LinkText>
            <Txt size={12} color={c.mutedForeground} style={{ marginBottom: 22 }}>
              24+ hours: full deposit refund or one complimentary rescheduling. Under 24 hours: the
              deposit is non-refundable; management may offer 50% as future credit. No-shows forfeit
              the deposit.
            </Txt>
            <Action
              label={
                method === "simulation"
                  ? "Try simulated card checkout"
                  : "Submit bank transfer request"
              }
              disabled={
                !agreementId ||
                !policy ||
                (method === "bank" && !s.session) ||
                (!!s.session && !pricing.ready)
              }
              busy={busy}
              onPress={() => void submit()}
              style={{ alignSelf: "stretch" }}
            />
          </View>
          <Card
            style={{
              flex: width > 800 ? 0.7 : undefined,
              height: "auto",
              alignSelf: "flex-start",
              width: width > 800 ? undefined : "100%",
            }}
          >
            <Tag>Appointment summary</Tag>
            <Txt serif size={26} style={{ marginVertical: 18 }}>
              {dateLabel(time)}
            </Txt>
            <Txt size={16}>
              {timeLabel(time)} · {formatDuration(duration)}
            </Txt>
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: 20 }} />
            {selected.map((v) => (
              <View
                key={v.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 18,
                  marginBottom: 15,
                }}
              >
                <Txt size={14} style={{ flex: 1 }}>
                  {v.name}
                </Txt>
                <Txt size={14}>{s.session ? money(v.price) : "Sign in"}</Txt>
              </View>
            ))}
            {[
              ...(Number(pricing.quote?.discount_total) > 0
                ? [
                    ["Subtotal", pricing.quote!.original_subtotal],
                    ["Discount", -Number(pricing.quote!.discount_total)],
                  ]
                : []),
              ["Total", total],
              ["50% deposit", deposit],
              ["Remaining at your visit", total - deposit],
            ].map(([label, amount]) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 20,
                  marginVertical: 10,
                }}
              >
                <Txt size={label === "50% deposit" ? 17 : 14} bold={label === "50% deposit"}>
                  {label}
                </Txt>
                <Txt size={17} bold={label === "50% deposit"}>
                  {s.session ? money(Number(amount)) : "—"}
                </Txt>
              </View>
            ))}
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 13 }}>
              Sample TTD prices. Your selected services and final quote require professional
              confirmation.
            </Txt>
          </Card>
        </View>
      )}
      <View style={{ height: 40 }} />
    </Shell>
  );
}
