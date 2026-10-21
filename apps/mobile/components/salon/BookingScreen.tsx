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
import * as Clipboard from "expo-clipboard";
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
const requestUuid = () =>
  globalThis.crypto?.randomUUID?.() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 3) | 8).toString(16);
  });
async function receiptBytes(asset: ImagePicker.ImagePickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();
  if (!asset.base64) throw new Error("Choose the receipt again before confirming.");
  return Uint8Array.from(atob(asset.base64), (char) => char.charCodeAt(0)).buffer;
}
export function PaymentChoice({
  method,
  setMethod,
  deposit,
  reference = "",
  setReference = () => undefined,
  paymentDate = "",
  setPaymentDate = () => undefined,
  receipt = null,
  chooseReceipt = () => undefined,
}: {
  method: string;
  setMethod: (v: string) => void;
  deposit?: number;
  reference?: string;
  setReference?: (v: string) => void;
  paymentDate?: string;
  setPaymentDate?: (v: string) => void;
  receipt?: ImagePicker.ImagePickerAsset | null;
  chooseReceipt?: () => void;
}) {
  const c = useColors(),
    s = useSalon();
  const [expanded, setExpanded] = useState(true);
  const details = [
    ["Bank", s.settings?.bank_name || "First Citizens Bank"],
    ["Account Name", s.settings?.bank_account_name || "LADY J SALON AND DAY SPA"],
    ["Account Type", s.settings?.bank_account_type || "Savings"],
    ["Account Number", s.settings?.bank_account_number || "3201297"],
    ["Currency", s.settings?.bank_currency || "TTD"],
  ];
  return (
    <View style={{ gap: 13 }}>
      {[
        {
          id: "bank",
          icon: "Landmark" as const,
          title: "Bank transfer",
          desc: "Recommended · Pending owner verification",
        },
        {
          id: "card",
          icon: "CreditCard" as const,
          title: "Credit / debit card",
          desc: "Card processing is not currently available",
        },
      ].map((v) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{
            checked: method === v.id,
            disabled: v.id === "card",
          }}
          key={v.id}
          disabled={v.id === "card"}
          onPress={() => setMethod(v.id)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor:
              v.id === "card" ? c.muted : method === v.id ? c.brandAccentSurface : c.card,
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
        <Card
          style={{
            backgroundColor: c.goldSurface,
            borderColor: c.goldBorder,
            padding: 16,
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View style={{ flex: 1 }}>
              <Txt bold>
                {deposit == null
                  ? "Bank transfer instructions"
                  : `Transfer ${money(deposit)} to reserve your time`}
              </Txt>
              <Txt size={12} color={c.mutedForeground}>
                Secure bank details
              </Txt>
            </View>
            <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={20} color={c.brandAccent} />
          </Pressable>
          {expanded && (
            <View style={{ gap: 10 }}>
              {details.map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 18,
                    borderTopWidth: label === "Bank" ? 0 : 1,
                    borderColor: c.goldBorder,
                    paddingTop: label === "Bank" ? 0 : 9,
                  }}
                >
                  <Txt size={13} color={c.mutedForeground}>
                    {label}
                  </Txt>
                  <Txt size={14} bold style={{ textAlign: "right", flex: 1 }}>
                    {value}
                  </Txt>
                </View>
              ))}
              <Action
                label="Copy Account Number"
                secondary
                icon="Copy"
                onPress={() =>
                  void Clipboard.setStringAsync(details[3][1]).then(() =>
                    s.notify("Account number copied."),
                  )
                }
                style={{ alignSelf: "stretch" }}
              />
              {!!s.settings?.bank_instructions && (
                <Txt size={13}>{s.settings.bank_instructions}</Txt>
              )}
              <Txt size={12} color={c.mutedForeground}>
                Uploading proof does not verify payment. Your deposit stays Pending Verification
                until authorized salon staff confirms the funds in the bank account.
              </Txt>
              {deposit != null && (
                <>
                  <Field
                    label="Transaction Reference Number"
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Enter the bank reference"
                  />
                  <Field
                    label="Payment Date"
                    value={paymentDate}
                    onChangeText={setPaymentDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <Action
                    label={receipt ? "Change Payment Receipt" : "Upload Payment Receipt"}
                    secondary
                    icon="Upload"
                    onPress={chooseReceipt}
                    style={{ alignSelf: "stretch" }}
                  />
                  {!!receipt && (
                    <Txt size={13} color={c.success}>
                      Selected: {receipt.fileName || "Payment receipt image"}
                    </Txt>
                  )}
                </>
              )}
            </View>
          )}
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
    [method, setMethod] = useState("bank"),
    [reference, setReference] = useState(""),
    [paymentDate, setPaymentDate] = useState(todayKey()),
    [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [policy, setPolicy] = useState(false),
    [agreementId, setAgreementId] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(""),
    [photo, setPhoto] = useState(""),
    [guestName, setGuestName] = useState(""),
    [guestEmail, setGuestEmail] = useState(""),
    [guestPhone, setGuestPhone] = useState(""),
    [guestAgreement, setGuestAgreement] = useState<GuestAgreementDraft | null>(null);
  const bookingRequestKey = useRef(requestUuid());
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
    (!noPaymentRequired &&
      (method !== "bank" ||
        !s.session ||
        reference.trim().length < 3 ||
        !validReportDate(paymentDate) ||
        paymentDate > todayKey() ||
        !receipt)) ||
    (!s.session && !s.testMode && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()));
  const slotGeneration = useRef(0);
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
  async function chooseReceipt() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024)
        throw new Error("Choose a receipt image smaller than 8 MB.");
      setReceipt(asset);
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to choose the payment receipt.");
    }
  }
  async function submit() {
    setError("");
    if (!policy || !time || !agreementId || !pricing.ready) return;
    setBusy(true);
    let receiptPath: string | null = null;
    try {
      if (!noPaymentRequired && (!s.session || !receipt))
        throw new Error("Sign in and add your bank transfer proof before confirming.");
      if (!noPaymentRequired && s.session && receipt) {
        const mime = receipt.mimeType || "image/jpeg";
        const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        receiptPath = `${s.session.user.id}/${bookingRequestKey.current}/receipt.${extension}`;
        check(
          await db()
            .storage.from("lj-payment-receipts")
            .upload(receiptPath, await receiptBytes(receipt), { contentType: mime, upsert: true }),
        );
      }
      const id = s.session
        ? check(
            await db().rpc("lj_book_checkout", {
              p_services: selected.map((v) => v.id),
              p_start: time,
              p_reference: reference,
              p_policy: policy,
              p_code: pricing.code,
              p_agreement: agreementId,
              p_payment_date: noPaymentRequired ? null : paymentDate,
              p_receipt_path: receiptPath,
              p_receipt_filename: receipt?.fileName || null,
              p_receipt_mime: receipt?.mimeType || (receipt ? "image/jpeg" : null),
              p_request_key: bookingRequestKey.current,
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
      if (receiptPath) {
        await db()
          .storage.from("lj-payment-receipts")
          .remove([receiptPath])
          .catch(() => undefined);
      }
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
        : "Confirm My Appointment →";
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
        {step < 3 && (
          <Action
            label={barLabel}
            gold
            icon="ArrowRight"
            disabled={barDisabled}
            onPress={() => {
              if (step === 1) setStep(2);
              else setStep(3);
            }}
            style={{ minHeight: 42, paddingHorizontal: 10, paddingVertical: 7 }}
          />
        )}
      </View>
    </View>
  );
  if (done)
    return (
      <Shell>
        <View style={{ maxWidth: 640, alignSelf: "center", width: "100%", paddingVertical: 35 }}>
          <Card style={{ alignItems: "center", padding: 35, gap: 18 }}>
            <Icon
              name={noPaymentRequired ? "CalendarCheck" : "Clock3"}
              size={42}
              color={c.brandAccent}
            />
            <Tag>
              {noPaymentRequired ? "Appointment confirmed" : "Request saved · Payment pending"}
            </Tag>
            <Txt serif size={34} style={{ textAlign: "center" }}>
              {noPaymentRequired
                ? "Your consultation is booked."
                : "Your booking is pending verification."}
            </Txt>
            <Txt style={{ textAlign: "center" }}>
              {selected.map((v) => v.name).join(" + ")}
              {`\n`}
              {dateLabel(time)} at {timeLabel(time)}
            </Txt>
            <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {noPaymentRequired
                ? "Your appointment is confirmed. No payment or deposit is required."
                : "Your transfer proof was saved securely. The appointment remains pending until the owner verifies funds received; uploaded proof is not a verified payment."}
            </Txt>
            {s.session ? (
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
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", gap: 14 }}>
          <View style={{ alignItems: "center", paddingHorizontal: 14, marginBottom: 8 }}>
            <Txt serif size={width < 390 ? 29 : 34} style={{ textAlign: "center" }}>
              Your Beautiful Transformation Awaits
            </Txt>
            <Txt color={c.mutedForeground} style={{ textAlign: "center", marginTop: 8 }}>
              You&apos;re one step closer to looking and feeling your best.
            </Txt>
          </View>
          {!s.session && !noPaymentRequired && (
            <Card style={{ gap: 12, borderColor: c.goldBorder, backgroundColor: c.goldSurface }}>
              <Txt bold>Sign in to complete secure payment</Txt>
              <Txt size={13} color={c.mutedForeground}>
                A private account is required to store your receipt, signed PDF, and payment audit
                trail.
              </Txt>
              <Action
                label="Sign In to Continue"
                onPress={() => go("login", { next: "booking" })}
                style={{ alignSelf: "stretch" }}
              />
            </Card>
          )}
          {!s.session && noPaymentRequired && !s.testMode && (
            <Card style={{ gap: 12 }}>
              <Txt size={19} bold>
                Guest contact details
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
          <Card style={{ borderColor: c.goldBorder, padding: 18, gap: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <Txt size={20} bold style={{ flex: 1 }}>
                Your Selected Services
              </Txt>
              <LinkText onPress={() => setStep(1)}>Edit Services</LinkText>
            </View>
            {selected.map((service, index) => (
              <View
                key={service.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 11,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Photo name={service.image} style={{ width: 48, height: 48, borderRadius: 10 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={15} bold>
                    {service.name}
                  </Txt>
                  <Txt size={12} color={c.mutedForeground}>
                    {serviceDurationLabel(service)}
                  </Txt>
                </View>
                <Txt size={15} bold style={{ textAlign: "right" }}>
                  {money(
                    pricing.quote?.items.find((item) => item.id === service.id)?.price ??
                      service.price,
                  )}
                </Txt>
              </View>
            ))}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
                backgroundColor: c.brandAccentSurface,
                padding: 13,
                borderRadius: 10,
                marginTop: 8,
              }}
            >
              <Txt bold color={c.brandAccent}>
                {selected.length} service{selected.length === 1 ? "" : "s"}
              </Txt>
              <Txt bold color={c.brandAccent}>
                {money(total)}
              </Txt>
            </View>
          </Card>
          <Card style={{ padding: 18, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="CalendarDays" size={23} color={c.brandAccent} />
              <Txt size={20} bold style={{ flex: 1 }}>
                Your Appointment
              </Txt>
              <LinkText onPress={() => setStep(2)}>Edit</LinkText>
            </View>
            {[
              ["Date", dateLabel(time)],
              ["Time", timeLabel(time)],
              ["Total Duration", formatDuration(duration)],
              ["Total Price", money(total)],
            ].map(([label, value], index) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 18,
                  paddingTop: 10,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Txt size={14} color={c.mutedForeground}>
                  {label}
                </Txt>
                <Txt size={14} bold style={{ textAlign: "right" }}>
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
          <Card style={{ padding: 18, gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="WalletCards" size={23} color={c.brandAccent} />
              <View style={{ flex: 1 }}>
                <Txt size={20} bold>
                  Payment Method
                </Txt>
                <Txt size={13} color={c.mutedForeground}>
                  Choose how you&apos;d like to pay your deposit.
                </Txt>
              </View>
            </View>
            {noPaymentRequired ? (
              <Txt bold>No payment or deposit required.</Txt>
            ) : (
              <PaymentChoice
                method={method}
                setMethod={setMethod}
                deposit={deposit}
                reference={reference}
                setReference={setReference}
                paymentDate={paymentDate}
                setPaymentDate={setPaymentDate}
                receipt={receipt}
                chooseReceipt={() => void chooseReceipt()}
              />
            )}
          </Card>
          <Card style={{ padding: 18, gap: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon name="Calculator" size={23} color={c.brandAccent} />
              <Txt size={20} bold>
                Payment Summary
              </Txt>
            </View>
            {s.session && !noPaymentRequired && <PromoCode pricing={pricing} />}
            {[
              ["Total Price", money(total)],
              ["50% Deposit", money(noPaymentRequired ? 0 : deposit)],
              ["Remaining Balance", money(noPaymentRequired ? 0 : total - deposit)],
              ["Selected Method", noPaymentRequired ? "No payment required" : "Bank transfer"],
              ["Payment Status", noPaymentRequired ? "No payment due" : "Pending Verification"],
            ].map(([label, value], index) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 18,
                  paddingVertical: 11,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Txt size={14} color={c.mutedForeground}>
                  {label}
                </Txt>
                <Txt
                  size={label === "50% Deposit" ? 17 : 14}
                  bold
                  color={
                    label === "50% Deposit" || label === "Payment Status"
                      ? c.brandAccent
                      : c.foreground
                  }
                  style={{ textAlign: "right", flex: 1 }}
                >
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
          {s.testMode ? (
            <Card style={{ gap: 8, backgroundColor: c.goldSurface, borderColor: c.goldBorder }}>
              <Tag>Development Test Mode</Tag>
              <Txt bold>Secure signing is unavailable in the login-free preview.</Txt>
              <Txt size={13} color={c.mutedForeground}>
                Sign in to create a real private agreement and booking.
              </Txt>
            </Card>
          ) : s.session ||
            (noPaymentRequired && guestName.trim() && guestEmail.trim() && guestPhone.trim()) ? (
            <ServiceAgreement
              services={selected.map((v) => v.id)}
              onReady={setAgreementId}
              noPaymentRequired={noPaymentRequired}
              guest={!s.session}
              guestName={guestName}
              onGuestReady={setGuestAgreement}
            />
          ) : null}
          <Card style={{ padding: 16, gap: 8 }}>
            <Check
              checked={policy}
              onPress={() => setPolicy(!policy)}
              label={
                noPaymentRequired
                  ? "I acknowledge the booking policy."
                  : "I acknowledge the booking, deposit, and cancellation policy."
              }
            />
            <LinkText onPress={() => go("policies")}>Read Policy</LinkText>
          </Card>
          {!!error && <ErrorBox message={error} />}
          <Action
            label="Confirm My Appointment →"
            prominent
            disabled={barDisabled}
            busy={busy}
            onPress={() => void submit()}
            style={{ alignSelf: "stretch", width: "100%", borderRadius: 14 }}
          />
        </View>
      )}
      <View style={{ height: 40 }} />
    </Shell>
  );
}
