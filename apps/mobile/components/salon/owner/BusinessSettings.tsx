import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { Settings } from "@/lib/salon/types";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, ErrorBox, Field, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
type Delivery = { configured: boolean; enabled: boolean; missing?: string[] };
async function emailSettings(action: "status" | "configure" | "pause"): Promise<Delivery> {
  const response = await db().functions.invoke("lj-send-reminders", { body: { action } });
  if (response.error) {
    let message = "Unable to load email settings. Try again.";
    try {
      const detail = await response.error.context?.json();
      if (typeof detail?.error === "string") message = detail.error;
    } catch {
      /* Retain the short fallback. */
    }
    throw new Error(message);
  }
  if (response.data?.error) throw new Error(String(response.data.error));
  return response.data as Delivery;
}
export default function BusinessSettings({
  settings,
  demo,
  demoNotifications,
  onDemoNotifications,
  onDemoSave,
  onSaved,
}: {
  settings: Settings | null;
  demo: boolean;
  demoNotifications: boolean;
  onDemoNotifications: (value: boolean) => void;
  onDemoSave: (settings: Settings) => void;
  onSaved: () => Promise<void>;
}) {
  const s = useSalon(),
    c = useColors();
  const [form, setForm] = useState({
    business_name: settings?.business_name || "Lady J Salon & Day Spa",
    contact_email: settings?.contact_email || "",
    contact_phone: settings?.contact_phone || "",
    address: settings?.address || "",
  });
  const [delivery, setDelivery] = useState<Delivery | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState("");
  useEffect(() => {
    if (demo) return;
    let active = true;
    void emailSettings("status")
      .then((value) => {
        if (active) setDelivery(value);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load notifications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo]);
  const notifications = demo ? demoNotifications : !!delivery?.enabled;
  return (
    <View style={{ gap: 20 }}>
      <OwnerText size={28} bold>
        Settings
      </OwnerText>
      {!!error && <ErrorBox message={error} />}
      <Card style={{ gap: 12 }}>
        <Field
          label="Business name"
          value={form.business_name}
          onChangeText={(business_name) => setForm({ ...form, business_name })}
        />
        <Field
          label="Contact email"
          keyboardType="email-address"
          value={form.contact_email}
          onChangeText={(contact_email) => setForm({ ...form, contact_email })}
        />
        <Field
          label="Contact phone"
          keyboardType="phone-pad"
          value={form.contact_phone}
          onChangeText={(contact_phone) => setForm({ ...form, contact_phone })}
        />
        <Field
          label="Address"
          value={form.address}
          onChangeText={(address) => setForm({ ...form, address })}
          multiline
        />
        <OwnerButton
          label={busy ? "Saving" : "Save settings"}
          disabled={busy}
          onPress={() => {
            setError("");
            if (!form.business_name.trim()) {
              setError("Enter a business name.");
              return;
            }
            if (
              form.contact_email.trim() &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())
            ) {
              setError("Enter a valid contact email.");
              return;
            }
            setBusy(true);
            void (async () => {
              const values = {
                ...form,
                business_name: form.business_name.trim(),
                contact_email: form.contact_email.trim(),
              };
              if (demo)
                onDemoSave({ ...settings, ...values, id: settings?.id || "business" } as Settings);
              else {
                if (!settings?.id) throw new Error("Refresh to load business settings.");
                check(
                  await db()
                    .from("lj_settings")
                    .update(values)
                    .eq("id", settings.id)
                    .select("id")
                    .single(),
                );
                await onSaved();
                await s.refresh();
              }
              s.notify(demo ? "Settings saved." : "Business settings saved.");
            })()
              .catch((e) => setError(e instanceof Error ? e.message : "Unable to save settings."))
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <OwnerText bold>Notifications</OwnerText>
            <OwnerText size={16} muted>
              Appointment emails
            </OwnerText>
          </View>
          <Switch
            accessibilityLabel="Notifications"
            value={notifications}
            disabled={busy || loading}
            trackColor={{ false: c.border, true: c.tertiary }}
            onValueChange={(enabled) => {
              setError("");
              if (demo) {
                onDemoNotifications(enabled);
                return;
              }
              if (!delivery?.configured && enabled) {
                setError("Connect a verified email sender before enabling notifications.");
                return;
              }
              setBusy(true);
              void emailSettings(enabled ? "configure" : "pause")
                .then(() => emailSettings("status"))
                .then(setDelivery)
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Unable to update notifications."),
                )
                .finally(() => setBusy(false));
            }}
          />
        </View>
        <OwnerText size={16} muted>
          {demo
            ? "Email delivery is off in this workspace."
            : loading
              ? "Loading notification settings"
              : delivery?.configured
                ? notifications
                  ? "Appointment emails are on."
                  : "Appointment emails are off."
                : "A verified email sender is required."}
        </OwnerText>
      </Card>
    </View>
  );
}
