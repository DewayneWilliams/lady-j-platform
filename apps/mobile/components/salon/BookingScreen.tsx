import CalendarPicker from "./CalendarPicker";
export { default as CalendarPicker } from "./CalendarPicker";
import { useCalendarRealtime } from "@/lib/salon/useCalendarRealtime";
import { formatDuration, serviceDurationLabel } from "@/lib/salon/duration";
import { useLocalSearchParams } from "expo-router";
import { validReportDate } from "@/lib/salon/revenueReport";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { JoinWaitlist } from "./Waitlist";
import ServiceAgreement, { type GuestAgreementDraft } from "./ServiceAgreement";
import ServiceCategories from "./ServiceCategories";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import PromoCode from "./PromoCode";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { db, check } from "@/lib/salon/client";
import { money, servicePriceLabel, dateLabel, timeLabel } from "@/lib/salon/types";
import Shell, { useNav } from "./Shell";
import { Search } from "./CatalogScreens";
import {
  Txt,
  ButtonLabel,
  Action,
  Heading,
  Photo,
  Tag,
  LinkText,
  Card,
  Chip,
  Check,
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
          desc: s.testMode
            ? "Development simulation · No payment or record created"
            : "Not available yet · Please use bank transfer",
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
          accessibilityState={{
            checked: method === v.id,
            disabled: v.id === "simulation" && !s.testMode,
          }}
          key={v.id}
          disabled={v.id === "simulation" && !s.testMode}
          onPress={() => setMethod(v.id)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: v.id === "simulation" && !s.testMode ? c.muted : c.card,
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
            <ButtonLabel>{v.title}</ButtonLabel>
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 3 }}>
              {v.desc}
            </Txt>
          </View>
          <Icon
            name={method === v.id ? "CircleCheck" : "Circle"}
            size={21}
            color={method === v.id ? c.brandAccent : c.mutedForeground}
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
  const { date: requestedDate, id: requestedServiceId } = useLocalSearchParams<{
    date?: string;
    id?: string;
  }>();
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
    [method, setMethod] = useState(s.testMode ? "simulation" : "bank"),
    [reference, setReference] = useState(""),
    [policy, setPolicy] = useState(false),
    [agreementId, setAgreementId] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(""),
    [photo, setPhoto] = useState(""),
    [guestName, setGuestName] = useState(""),
    [guestEmail, setGuestEmail] = useState(""),
    [guestPhone, setGuestPhone] = useState(""),
    [guestAgreement, setGuestAgreement] = useState<GuestAgreementDraft | null>(null);
  const appliedServiceId = useRef("");
  useEffect(() => {
    if (
      typeof requestedServiceId !== "string" ||
      s.loading ||
      appliedServiceId.current === requestedServiceId
    )
      return;
    const requested = s.services.find(
      (service) =>
        service.id === requestedServiceId && service.active && service.bookable !== false,
    );
    appliedServiceId.current = requestedServiceId;
    if (requested) s.setSelected([requested.id]);
    else setError("This service is unavailable. Choose another service.");
  }, [requestedServiceId, s.loading, s.services, s.setSelected]);
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
  const noPaymentRequired = selected.length > 0 && pricing.ready && total === 0;
  const submitDisabled =
    !agreementId ||
    !policy ||
    !pricing.ready ||
    (!s.session && !s.testMode && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()));
  useEffect(() => {
    if (s.testMode && step === 3) setAgreementId("development-test-agreement");
  }, [s.testMode, step]);
  const slotGeneration = useRef(0);
  const customerId = s.session?.user.id;
  const refreshSlots = useCallback(async () => {
    if (!s.authReady || step !== 2 || !duration) return;
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
  }, [s.authReady, step, duration, date]);
  useEffect(() => {
    setTime("");
    setSlots([]);
    void refreshSlots();
    return () => {
      slotGeneration.current += 1;
    };
  }, [refreshSlots]);
  useForegroundRefresh(refreshSlots, step === 2 && s.authReady);
  useCalendarRealtime(refreshSlots, step === 2 && s.authReady);
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
    if (!policy || !time || !agreementId || !pricing.ready) return;
    if (method === "simulation") {
      setDone("demo");
      return;
    }
    setBusy(true);
    try {
      const id = s.session
        ? check(
            await db().rpc("lj_book", {
              p_services: selected.map((v) => v.id),
              p_start: time,
              p_reference: reference,
              p_policy: policy,
              p_code: pricing.code,
            }),
          )
        : check(
            await db().rpc("lj_guest_book", {
              p_name: guestName.trim(),
              p_email: guestEmail.trim(),
              p_phone: guestPhone.trim(),
              p_services: selected.map((v) => v.id),
              p_start: time,
              p_reference: reference,
              p_policy: policy,
              p_code: pricing.code,
              p_signature: guestAgreement?.signature || [],
              p_version: guestAgreement?.version || "",
            }),
          );
      setDone(String(id));
      if (s.session) await s.refreshPrivate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t save your request. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const barDisabled =
    step === 1
      ? !selected.length || selected.length > 10
      : step === 2
        ? !time || slotLoading
        : submitDisabled;
  const barLabel =
    step === 1
      ? "Next"
      : step === 2
        ? noPaymentRequired
          ? "Confirm"
          : "Payment"
        : noPaymentRequired
          ? "Confirm booking"
          : "Submit request";
  const bookingBar = (
    <View
      accessibilityLabel="Booking totals and navigation"
      style={{
        flexShrink: 0,
        borderTopWidth: 1,
        borderColor: c.border,
        backgroundColor: c.background,
        paddingHorizontal: width > 700 ? 24 : 10,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
          minHeight: 54,
          borderRadius: 15,
          backgroundColor: c.primary,
          paddingHorizontal: 10,
          paddingVertical: 7,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {step > 1 && (
          <Action
            label="Back"
            secondary
            onPress={() => {
              setStep(step - 1);
              setError("");
            }}
            style={{ minHeight: 42, paddingHorizontal: 9, paddingVertical: 7 }}
          />
        )}
        <View style={{ flex: 1, minWidth: 72 }}>
          <Txt size={11} color={c.primaryForeground} numberOfLines={1}>
            {selected.length} service{selected.length === 1 ? "" : "s"}
          </Txt>
          <Txt
            size={width < 390 ? 13 : 15}
            bold
            color={c.primaryForeground}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {pricing.busy ? "Updating…" : money(total)} · {formatDuration(duration)}
          </Txt>
        </View>
        <Action
          label={barLabel}
          gold
          icon={step < 3 ? "ArrowRight" : undefined}
          disabled={barDisabled}
          busy={step === 3 && busy}
          onPress={() => {
            if (step === 1) setStep(2);
            else if (step === 2) setStep(3);
            else void submit();
          }}
          style={{ minHeight: 42, paddingHorizontal: 10, paddingVertical: 7 }}
        />
      </View>
    </View>
  );
  if (done)
    return (
      <Shell>
        <View style={{ maxWidth: 640, alignSelf: "center", width: "100%", paddingVertical: 35 }}>
          <Card style={{ alignItems: "center", padding: 35, gap: 18 }}>
            <Icon
              name={done === "demo" ? "Sparkles" : "CalendarCheck"}
              size={42}
              color={c.brandAccent}
            />
            <Tag>
              {done === "demo"
                ? "No booking created"
                : noPaymentRequired
                  ? "Appointment confirmed"
                  : "Request saved · Payment pending"}
            </Tag>
            <Txt serif size={34} style={{ textAlign: "center" }}>
              {done === "demo"
                ? "A preview of your next moment."
                : noPaymentRequired
                  ? "Your consultation is booked."
                  : "Your moment is on its way."}
            </Txt>
            <Txt style={{ textAlign: "center" }}>
              {selected.map((v) => v.name).join(" + ")}
              {`\n`}
              {dateLabel(time)} at {timeLabel(time)}
            </Txt>
            <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {done === "demo"
                ? "No card was charged and no appointment was created. Choose bank transfer to submit a request."
                : noPaymentRequired
                  ? "Your appointment is confirmed. No payment or deposit is required."
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
            ) : s.session ? (
              <Action label="View my appointments" onPress={() => go("appointments")} />
            ) : (
              <Action label="Return home" onPress={() => go("home")} />
            )}
            <LinkText onPress={() => go("home")}>Return home</LinkText>
          </Card>
        </View>
      </Shell>
    );
  return (
    <Shell footer={false} bottomBar={bookingBar}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: 3, now: step }}
        accessibilityLabel={`Step ${step} of 3 — ${["Choose Your Service", "Choose Your Date & Time", "Payment"][step - 1]}`}
      >
        <Heading
          sub={`Step ${step} of 3 — ${["Choose Your Service", "Choose Your Date & Time", "Payment"][step - 1]}`}
        >
          Book your moment
        </Heading>
      </View>
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
              flexDirection: "column",
              minWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
              paddingVertical: 12,
              gap: 9,
              borderBottomWidth: 2,
              borderColor: step === i + 1 ? c.primary : c.border,
            }}
          >
            <View
              style={{
                minWidth: 32,
                minHeight: 32,
                borderRadius: 14,
                backgroundColor: step === i + 1 ? c.primary : c.muted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ButtonLabel color={step === i + 1 ? c.primaryForeground : c.mutedForeground}>
                {i + 1}
              </ButtonLabel>
            </View>
            <ButtonLabel>{v}</ButtonLabel>
          </Pressable>
        ))}
      </View>
      {!!error && <ErrorBox message={error} />}
      {step === 1 && (
        <View style={{ flexDirection: width > 900 ? "row" : "column", gap: 28 }}>
          <View style={{ flex: 1 }}>
            <Search value={query} onChange={setQuery} placeholder="Find your service" />
            <ServiceCategories booking value={category} onChange={setCategory} />
            {s.services
              .filter(
                (v) =>
                  v.bookable !== false &&
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
                    <ButtonLabel size={20}>{v.name}</ButtonLabel>
                    <Txt size={12} color={c.mutedForeground}>
                      {v.description}
                    </Txt>
                    <Txt size={13}>
                      {serviceDurationLabel(v)} · {servicePriceLabel(v)}
                    </Txt>
                  </View>
                  <Icon
                    name={s.selected.includes(v.id) ? "CircleCheck" : "CirclePlus"}
                    size={24}
                    color={s.selected.includes(v.id) ? c.brandAccent : c.mutedForeground}
                  />
                </Pressable>
              ))}
          </View>
          <View style={{ width: width > 900 ? 315 : "100%", gap: 20, alignItems: "center" }}>
            <Card style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
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
                iconColor={c.brandAccent}
                secondary
                onPress={() => void choosePhoto()}
              />
              {!!photo && (
                <View style={{ gap: 10, marginTop: 15 }}>
                  <Tag>Photo suggestions are not connected</Tag>
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
              <ActivityIndicator color={c.brandAccent} style={{ margin: 35 }} />
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
            {!slotLoading && !slots.length && (
              <>
                <Txt>Unavailable</Txt>
                <JoinWaitlist date={date} services={s.selected} />
              </>
            )}
            <LinkText onPress={() => setStep(1)}>Change services</LinkText>
          </Card>
        </View>
      )}
      {step === 3 && (
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 27 }}>
          <View style={{ flex: 1 }}>
            <Txt serif size={28} style={{ marginBottom: 20 }}>
              {noPaymentRequired ? "Confirm your appointment" : "Secure your appointment"}
            </Txt>
            {!s.session && !s.testMode && (
              <Card style={{ gap: 15, marginBottom: 20 }}>
                <Txt size={20} bold>
                  Guest contact details
                </Txt>
                <Txt color={c.mutedForeground}>
                  We use these details to save your private client record and keep this appointment
                  linked correctly.
                </Txt>
                <Field label="Full Name" value={guestName} onChangeText={setGuestName} />
                <Field
                  label="Email"
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  keyboardType="email-address"
                />
                <Field
                  label="Mobile Number"
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  keyboardType="phone-pad"
                />
              </Card>
            )}
            {s.testMode ? (
              <Card style={{ gap: 8, backgroundColor: c.goldSurface, borderColor: c.goldBorder }}>
                <Tag>Development Test Mode</Tag>
                <Txt bold>Agreement preview enabled</Txt>
                <Txt size={13} color={c.mutedForeground}>
                  No signature, appointment, payment or private client record will be created.
                </Txt>
              </Card>
            ) : s.session || (guestName.trim() && guestEmail.trim() && guestPhone.trim()) ? (
              <ServiceAgreement
                services={selected.map((v) => v.id)}
                onReady={setAgreementId}
                noPaymentRequired={noPaymentRequired}
                guest={!s.session}
                guestName={guestName}
                onGuestReady={setGuestAgreement}
              />
            ) : null}
            {s.session && !noPaymentRequired && <PromoCode pricing={pricing} />}
            {noPaymentRequired ? (
              <Card>
                <Txt bold>No payment or deposit required.</Txt>
              </Card>
            ) : (
              <PaymentChoice method={method} setMethod={setMethod} />
            )}
            {!noPaymentRequired && method === "bank" && (
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
              label={
                noPaymentRequired
                  ? "I agree to the booking terms. No payment is required."
                  : "I understand the 50% deposit and cancellation terms in my signed agreement."
              }
            />
            <LinkText onPress={() => go("policies")}>Read the cancellation policy</LinkText>
            <Txt size={12} color={c.mutedForeground} style={{ marginBottom: 22 }}>
              {noPaymentRequired
                ? "Please cancel or reschedule if you cannot attend."
                : "24+ hours: full deposit refund or one complimentary rescheduling. Under 24 hours: the deposit is non-refundable; management may offer 50% as future credit. No-shows forfeit the deposit."}
            </Txt>
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
                <Txt size={14}>{money(v.price)}</Txt>
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
              ...(!noPaymentRequired
                ? [
                    ["50% deposit", deposit],
                    ["Remaining at your visit", total - deposit],
                  ]
                : []),
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
                  {money(Number(amount))}
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
