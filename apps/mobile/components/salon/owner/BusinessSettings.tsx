import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { Settings } from "@/lib/salon/types";
import { useSalon } from "@/lib/salon/SalonProvider";
import {
  CelebrationSounds,
  paymentSoundOptions,
  serviceSoundOptions,
} from "@/lib/salon/useCelebrationSounds";
import { ButtonLabel, ErrorBox, Field, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import LoyaltySettings from "./LoyaltySettings";

type Delivery = { configured: boolean; enabled: boolean; missing?: string[] };
async function emailSettings(action: "status" | "configure" | "pause"): Promise<Delivery> {
  const response = await db().functions.invoke("lj-send-reminders", { body: { action } });
  if (response.error) throw new Error("Unable to load email settings. Try again.");
  if (response.data?.error) throw new Error(String(response.data.error));
  return response.data as Delivery;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 10, paddingVertical: 12, borderTopWidth: 1, borderColor: c.border }}>
      <OwnerText size={24} bold>
        {title}
      </OwnerText>
      {children}
    </View>
  );
}
function ReadValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <OwnerText size={16} bold>
        {label}
      </OwnerText>
      <OwnerText>{value || "Not recorded"}</OwnerText>
    </View>
  );
}
function ToggleRow({
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <OwnerText bold>{label}</OwnerText>
        <OwnerText size={15} muted>
          {detail}
        </OwnerText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        trackColor={{ false: c.border, true: c.tertiary }}
        onValueChange={onChange}
      />
    </View>
  );
}
function VolumeSlider({
  label,
  value,
  onChange,
  onSave,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onSave: (value: number) => void;
}) {
  const c = useColors();
  const [width, setWidth] = useState(1);
  const update = (x: number, save = false) => {
    const next = Math.round(Math.max(0, Math.min(100, (x / width) * 100)));
    onChange(next);
    if (save) onSave(next);
  };
  return (
    <View style={{ gap: 7 }}>
      <OwnerText size={16}>
        {label}: {value}%
      </OwnerText>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => update(event.nativeEvent.locationX)}
        onResponderMove={(event) => update(event.nativeEvent.locationX)}
        onResponderRelease={(event) => update(event.nativeEvent.locationX, true)}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        style={{ height: 44, justifyContent: "center" }}
      >
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.muted }}>
          <View
            style={{
              width: `${value}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: c.brandAccentFill,
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            left: `${value}%`,
            marginLeft: -10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: c.brandAccentFill,
          }}
        />
      </View>
    </View>
  );
}

export default function BusinessSettings({
  settings,
  demo,
  demoNotifications,
  onDemoNotifications,
  onDemoSave,
  onSaved,
  sounds,
  onBack,
}: {
  settings: Settings | null;
  demo: boolean;
  demoNotifications: boolean;
  onDemoNotifications: (value: boolean) => void;
  onDemoSave: (settings: Settings) => void;
  onSaved: () => Promise<void>;
  sounds: CelebrationSounds;
  onBack: () => void;
}) {
  const s = useSalon(),
    c = useColors();
  const initial = useMemo(
    () => ({
      business_name: settings?.business_name || "Lady J Salon & Day Spa",
      contact_email: settings?.contact_email || "",
      contact_phone: settings?.contact_phone || "",
      whatsapp_phone: settings?.whatsapp_phone || "",
      address: settings?.address || "",
      opens_at: String(settings?.opens_at || "10:00").slice(0, 5),
      closes_at: String(settings?.closes_at || "18:00").slice(0, 5),
      vip_before_start: String(settings?.vip_before_start || "06:00").slice(0, 5),
      vip_after_end: String(settings?.vip_after_end || "22:00").slice(0, 5),
      cleanup_buffer_minutes: String(settings?.cleanup_buffer_minutes ?? 0),
      max_daily_bookings_per_client: String(settings?.max_daily_bookings_per_client ?? 1),
      bank_name: settings?.bank_name || "",
      bank_account_name: settings?.bank_account_name || "",
      bank_account_type: settings?.bank_account_type || "",
      bank_account_number: settings?.bank_account_number || "",
      bank_currency: settings?.bank_currency || "TTD",
      bank_instructions: settings?.bank_instructions || "",
      loyalty_points_per_ttd: String(settings?.loyalty_points_per_ttd ?? 1),
      loyalty_redemption_points: String(settings?.loyalty_redemption_points ?? 100),
      loyalty_redemption_value: String(settings?.loyalty_redemption_value ?? 5),
      loyalty_welcome_credit: String(settings?.loyalty_welcome_credit ?? 50),
      loyalty_birthday_credit: String(settings?.loyalty_birthday_credit ?? 50),
      loyalty_referrer_points: String(settings?.loyalty_referrer_points ?? 300),
      loyalty_friend_points: String(settings?.loyalty_friend_points ?? 150),
      loyalty_minimum_spend: String(settings?.loyalty_minimum_spend ?? 250),
      loyalty_birthday_gift_note: settings?.loyalty_birthday_gift_note || "Complimentary surprise gift presented in person",
    }),
    [settings],
  );
  const [form, setForm] = useState(initial),
    [editing, setEditing] = useState(false),
    [delivery, setDelivery] = useState<Delivery | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState("");
  const [serviceSound, setServiceSound] = useState(
      settings?.service_completion_sound || "royal_fanfare",
    ),
    [serviceVolume, setServiceVolume] = useState(settings?.service_completion_volume ?? 90),
    [paymentSound, setPaymentSound] = useState(settings?.payment_confirmation_sound || "cha_ching"),
    [paymentVolume, setPaymentVolume] = useState(settings?.payment_confirmation_volume ?? 65);
  useEffect(() => setForm(initial), [initial]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void emailSettings("status")
      .then((value) => active && setDelivery(value))
      .catch(
        (e) => active && setError(e instanceof Error ? e.message : "Unable to load notifications."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [demo]);
  const persist = async (values: Partial<Settings>, message?: string) => {
    if (demo) {
      onDemoSave({ ...settings, ...values, id: settings?.id || "business" } as Settings);
      if (message) s.notify(message);
      return;
    }
    if (!settings?.id) throw new Error("Refresh to load business settings.");
    check(
      await db().from("lj_settings").update(values).eq("id", settings.id).select("id").single(),
    );
    await onSaved();
    await s.refresh();
    if (message) s.notify(message);
  };
  const saveSound = (values: Partial<Settings>) => {
    setError("");
    void persist(values, "Sound preference saved.").catch((e) =>
      setError(e instanceof Error ? e.message : "Unable to save sound preference."),
    );
  };
  const notifications = demo ? demoNotifications : !!delivery?.enabled;
  const soundGroup = (kind: "service" | "payment") => {
    const options = kind === "service" ? serviceSoundOptions : paymentSoundOptions;
    const selected = kind === "service" ? serviceSound : paymentSound;
    const volume = kind === "service" ? serviceVolume : paymentVolume;
    return (
      <View style={{ gap: 8 }}>
        <OwnerText bold>
          {kind === "service" ? "Service Completion" : "Payment Confirmation"}
        </OwnerText>
        {options.map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === id }}
            onPress={() => {
              if (kind === "service") setServiceSound(id);
              else setPaymentSound(id);
              saveSound(
                kind === "service"
                  ? { service_completion_sound: id }
                  : { payment_confirmation_sound: id },
              );
              if (id !== "silent") sounds.preview(id, volume / 100);
            }}
            style={{
              minHeight: 46,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected === id ? c.brandAccent : c.border,
            }}
          >
            <ButtonLabel size={17}>{label}</ButtonLabel>
            {id !== "silent" && (
              <OwnerText size={15} muted>
                Tap to preview
              </OwnerText>
            )}
          </Pressable>
        ))}
        <VolumeSlider
          label={`${kind === "service" ? "Service" : "Payment"} volume`}
          value={volume}
          onChange={kind === "service" ? setServiceVolume : setPaymentVolume}
          onSave={(next) =>
            saveSound(
              kind === "service"
                ? { service_completion_volume: next }
                : { payment_confirmation_volume: next },
            )
          }
        />
      </View>
    );
  };
  return (
    <View style={{ gap: 8 }}>
      <OwnerText size={30} bold>
        Settings
      </OwnerText>
      {!!error && <ErrorBox message={error} />}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <OwnerButton
            fill
            compact
            label="Edit"
            accent
            disabled={editing || busy}
            onPress={() => setEditing(true)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <OwnerButton
            fill
            compact
            label={busy ? "Saving" : "Save Settings"}
            accent
            disabled={!editing || busy}
            onPress={() => {
              setBusy(true);
              setError("");
              const cleanup = Number(form.cleanup_buffer_minutes),
                limit = Number(form.max_daily_bookings_per_client);
              void persist(
                {
                  ...form,
                  cleanup_buffer_minutes: cleanup,
                  max_daily_bookings_per_client: limit,
                  loyalty_points_per_ttd: Number(form.loyalty_points_per_ttd),
                  loyalty_redemption_points: Number(form.loyalty_redemption_points),
                  loyalty_redemption_value: Number(form.loyalty_redemption_value),
                  loyalty_welcome_credit: Number(form.loyalty_welcome_credit),
                  loyalty_birthday_credit: Number(form.loyalty_birthday_credit),
                  loyalty_referrer_points: Number(form.loyalty_referrer_points),
                  loyalty_friend_points: Number(form.loyalty_friend_points),
                  loyalty_minimum_spend: Number(form.loyalty_minimum_spend),
                } as Partial<Settings>,
                "Business settings saved.",
              )
                .then(() => setEditing(false))
                .catch((e) => setError(e instanceof Error ? e.message : "Unable to save settings."))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      </View>
      <Section title="Business Details">
        {editing ? (
          <>
            <Field
              label="Business Name"
              value={form.business_name}
              onChangeText={(business_name) => setForm({ ...form, business_name })}
            />
            <Field
              label="Contact Email"
              value={form.contact_email}
              keyboardType="email-address"
              onChangeText={(contact_email) => setForm({ ...form, contact_email })}
            />
            <Field
              label="Contact Phone"
              value={form.contact_phone}
              keyboardType="phone-pad"
              onChangeText={(contact_phone) => setForm({ ...form, contact_phone })}
            />
            <Field
              label="WhatsApp Number"
              value={form.whatsapp_phone}
              keyboardType="phone-pad"
              onChangeText={(whatsapp_phone) => setForm({ ...form, whatsapp_phone })}
            />
            <Field
              label="Address"
              value={form.address}
              multiline
              onChangeText={(address) => setForm({ ...form, address })}
            />
          </>
        ) : (
          <>
            <ReadValue label="Business Name" value={form.business_name} />
            <ReadValue label="Email" value={form.contact_email} />
            <ReadValue label="Phone" value={form.contact_phone} />
            <ReadValue label="WhatsApp" value={form.whatsapp_phone} />
            <ReadValue label="Address" value={form.address} />
          </>
        )}
      </Section>
      <Section title="Hours">
        <ReadValue label="Tuesday–Saturday" value={`${form.opens_at}–${form.closes_at}`} />
      </Section>
      <Section title="Booking/VIP">
        {editing ? (
          <>
            <Field
              label="Cleanup Buffer (Minutes)"
              value={form.cleanup_buffer_minutes}
              keyboardType="numeric"
              onChangeText={(cleanup_buffer_minutes) =>
                setForm({ ...form, cleanup_buffer_minutes })
              }
            />
            <Field
              label="Appointments Per Client Per Day (0 = Unlimited)"
              value={form.max_daily_bookings_per_client}
              keyboardType="numeric"
              onChangeText={(max_daily_bookings_per_client) =>
                setForm({ ...form, max_daily_bookings_per_client })
              }
            />
            <Field
              label="VIP Hours Begin"
              value={form.vip_before_start}
              onChangeText={(vip_before_start) => setForm({ ...form, vip_before_start })}
            />
            <Field
              label="VIP Hours End"
              value={form.vip_after_end}
              onChangeText={(vip_after_end) => setForm({ ...form, vip_after_end })}
            />
          </>
        ) : (
          <>
            <ReadValue label="Cleanup Buffer" value={`${form.cleanup_buffer_minutes} minutes`} />
            <ReadValue
              label="VIP Window"
              value={`${form.vip_before_start}–${form.vip_after_end}`}
            />
          </>
        )}
      </Section>
      <Section title="Payments">
        {editing ? (
          <>
            <Field
              label="Bank Name"
              value={form.bank_name}
              onChangeText={(bank_name) => setForm({ ...form, bank_name })}
            />
            <Field
              label="Account Name"
              value={form.bank_account_name}
              onChangeText={(bank_account_name) => setForm({ ...form, bank_account_name })}
            />
            <Field
              label="Account Type"
              value={form.bank_account_type}
              onChangeText={(bank_account_type) => setForm({ ...form, bank_account_type })}
            />
            <Field
              label="Account Number"
              value={form.bank_account_number}
              onChangeText={(bank_account_number) => setForm({ ...form, bank_account_number })}
            />
            <Field
              label="Currency"
              value={form.bank_currency}
              onChangeText={(bank_currency) => setForm({ ...form, bank_currency })}
            />
            <Field
              label="Transfer Instructions"
              value={form.bank_instructions}
              multiline
              onChangeText={(bank_instructions) => setForm({ ...form, bank_instructions })}
            />
          </>
        ) : (
          <>
            <ReadValue label="Bank" value={form.bank_name} />
            <ReadValue
              label="Account"
              value={`${form.bank_account_name} · ${form.bank_account_type} · ${form.bank_account_number}`}
            />
            <ReadValue label="Currency" value={form.bank_currency} />
          </>
        )}
      </Section>
      <Section title="Loyalty & Rewards">
        <ToggleRow label="Lady J Rewards" detail="Credit points after verified payments and keep reward history." value={settings?.loyalty_enabled !== false} disabled={busy || demo} onChange={(loyalty_enabled) => void persist({ loyalty_enabled }, loyalty_enabled ? "Loyalty Program enabled." : "Loyalty Program paused.").catch((e) => setError(e instanceof Error ? e.message : "Unable to update rewards."))} />
        <ToggleRow label="Allow Discount Stacking" detail="Allow rewards to combine with promotional discounts." value={!!settings?.loyalty_allow_discount_stacking} disabled={busy || demo} onChange={(loyalty_allow_discount_stacking) => void persist({ loyalty_allow_discount_stacking }, "Reward stacking preference saved.").catch((e) => setError(e instanceof Error ? e.message : "Unable to update rewards."))} />
        <ToggleRow label="Birthday Surprise Gifts" detail="Gift details stay hidden from clients until their visit." value={settings?.loyalty_birthday_gift_enabled !== false} disabled={busy || demo} onChange={(loyalty_birthday_gift_enabled) => void persist({ loyalty_birthday_gift_enabled }, "Birthday gift preference saved.").catch((e) => setError(e instanceof Error ? e.message : "Unable to update rewards."))} />
        {editing ? <>
          <Field label="Points Earned Per TT$1 Paid" value={form.loyalty_points_per_ttd} keyboardType="decimal-pad" onChangeText={(loyalty_points_per_ttd) => setForm({ ...form, loyalty_points_per_ttd })} />
          <Field label="Points Per Redemption Unit" value={form.loyalty_redemption_points} keyboardType="decimal-pad" onChangeText={(loyalty_redemption_points) => setForm({ ...form, loyalty_redemption_points })} />
          <Field label="TT$ Value Per Redemption Unit" value={form.loyalty_redemption_value} keyboardType="decimal-pad" onChangeText={(loyalty_redemption_value) => setForm({ ...form, loyalty_redemption_value })} />
          <Field label="Welcome Credit (TT$)" value={form.loyalty_welcome_credit} keyboardType="decimal-pad" onChangeText={(loyalty_welcome_credit) => setForm({ ...form, loyalty_welcome_credit })} />
          <Field label="Birthday Credit (TT$)" value={form.loyalty_birthday_credit} keyboardType="decimal-pad" onChangeText={(loyalty_birthday_credit) => setForm({ ...form, loyalty_birthday_credit })} />
          <Field label="Referrer Points" value={form.loyalty_referrer_points} keyboardType="decimal-pad" onChangeText={(loyalty_referrer_points) => setForm({ ...form, loyalty_referrer_points })} />
          <Field label="Referred Friend Points" value={form.loyalty_friend_points} keyboardType="decimal-pad" onChangeText={(loyalty_friend_points) => setForm({ ...form, loyalty_friend_points })} />
          <Field label="Minimum Qualifying Spend (TT$)" value={form.loyalty_minimum_spend} keyboardType="decimal-pad" onChangeText={(loyalty_minimum_spend) => setForm({ ...form, loyalty_minimum_spend })} />
          <Field label="Private Birthday Gift Note" value={form.loyalty_birthday_gift_note} onChangeText={(loyalty_birthday_gift_note) => setForm({ ...form, loyalty_birthday_gift_note })} />
        </> : <>
          <ReadValue label="Earning Rate" value={`${form.loyalty_points_per_ttd} point per TT$1 paid`} />
          <ReadValue label="Redemption Rate" value={`${form.loyalty_redemption_points} points = TT$${form.loyalty_redemption_value}`} />
          <ReadValue label="Welcome / Birthday" value={`TT$${form.loyalty_welcome_credit} / TT$${form.loyalty_birthday_credit}`} />
          <ReadValue label="Referral Rewards" value={`${form.loyalty_referrer_points} / ${form.loyalty_friend_points} points`} />
          <ReadValue label="Minimum Qualifying Spend" value={`TT$${form.loyalty_minimum_spend}`} />
        </>}
        <LoyaltySettings demo={demo} redemptionPoints={Number(form.loyalty_redemption_points)} redemptionValue={Number(form.loyalty_redemption_value)} />
      </Section>
      <Section title="Notifications">
        <OwnerText size={16} muted>
          Appointment reminders are scheduled one hour before each visit. Channels only send through
          configured providers.
        </OwnerText>
        <ToggleRow
          label="Email"
          detail={
            delivery?.configured ? "Verified email delivery" : "A verified sender is required"
          }
          value={notifications}
          disabled={busy || loading}
          onChange={(enabled) => {
            if (demo) return onDemoNotifications(enabled);
            if (!delivery?.configured && enabled)
              return setError("Connect a verified email sender before enabling Email.");
            setBusy(true);
            void emailSettings(enabled ? "configure" : "pause")
              .then(() => emailSettings("status"))
              .then(setDelivery)
              .catch((e) => setError(e instanceof Error ? e.message : "Unable to update Email."))
              .finally(() => setBusy(false));
          }}
        />
        <ToggleRow
          label="WhatsApp"
          detail="No messaging provider is configured"
          value={!!settings?.whatsapp_reminders_enabled}
          disabled
          onChange={() => {}}
        />
        <ToggleRow
          label="SMS"
          detail="No SMS provider is configured"
          value={!!settings?.sms_reminders_enabled}
          disabled
          onChange={() => {}}
        />
        <ToggleRow
          label="Voice Announcements"
          detail="Requires a native background voice provider and device permission"
          value={!!settings?.voice_announcements_enabled}
          disabled
          onChange={() => {}}
        />
        <OwnerText size={15} muted>
          Voice script: “Upcoming appointment with [Client Name] for [Service], estimated duration
          [Duration].”
        </OwnerText>
      </Section>
      <Section title="Sounds">
        {soundGroup("service")}
        {soundGroup("payment")}
      </Section>
      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <OwnerButton label="Back to Business" secondary centered onPress={onBack} />
      </View>
    </View>
  );
}
