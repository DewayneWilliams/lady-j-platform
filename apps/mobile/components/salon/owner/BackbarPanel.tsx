import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "@/lib/icons/LucideIcon";
import { check, db, supabase, asRows } from "@/lib/salon/client";
import type { Service } from "@/lib/salon/types";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { Card, Txt, useColors } from "../ui";
import { OwnerButton, OwnerText, OwnerTitle } from "./OwnerUI";

type Category = { id: string; name: string; sort_order: number };
type Item = {
  id: string;
  name: string;
  brand: string;
  size_label: string;
  category_id: string | null;
  tracking_method: "applications" | "time";
  quantity: number;
  applications_remaining: number | null;
  applications_per_container: number | null;
  low_stock_threshold: number;
  expires_on: string | null;
  replacement_interval_days: number | null;
  photo_path: string | null;
  notes: string;
};
type Form = Omit<Item, "id" | "photo_path"> & { id?: string; photo_path?: string | null; vendor_name?: string; purchase_date?: string; unit_cost?: number; payment_method?: string; payment_status?: "paid" | "outstanding"; receipt_path?: string };
const empty: Form = {
  name: "",
  brand: "",
  size_label: "",
  category_id: null,
  tracking_method: "applications",
  quantity: 1,
  applications_remaining: 0,
  applications_per_container: 30,
  low_stock_threshold: 5,
  expires_on: null,
  replacement_interval_days: null,
  notes: "",
  vendor_name: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  unit_cost: 0,
  payment_method: "cash",
  payment_status: "paid",
  receipt_path: "",
};

export default function BackbarPanel({
  services,
  demo = false,
  onBack,
}: {
  services: Service[];
  demo?: boolean;
  onBack: () => void;
}) {
  const c = useColors(),
    reduced = useReducedMotionPreference();
  const [categories, setCategories] = useState<Category[]>([]),
    [items, setItems] = useState<Item[]>([]),
    [category, setCategory] = useState("All"),
    [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Form | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [adjust, setAdjust] = useState<Item | null>(null),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState("Restock");
  const [links, setLinks] = useState<Record<string, string>>({}),
    [categoryName, setCategoryName] = useState("");
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced !== false) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(zoom, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [reduced, zoom]);
  const load = useCallback(async () => {
    if (demo) {
      setCategories(
        ["Hair", "Nails", "Skin", "Facials", "Waxing", "Brows", "Lashes", "Miscellaneous"].map(
          (name, i) => ({ id: name, name, sort_order: i }),
        ),
      );
      setItems([]);
      return;
    }
    try {
      const [a, b, d] = await Promise.all([
        db().from("lj_backbar_categories").select("*").eq("active", true).order("sort_order"),
        db().from("lj_backbar_items").select("*").is("deleted_at", null).order("name"),
        db().from("lj_vendors").select("id,name").order("name"),
      ]);
      setCategories(asRows<Category>(check(a), "Backbar categories"));
      setItems(asRows<Item>(check(b), "Backbar items"));
      setVendors(asRows<{ id: string; name: string }>(check(d), "Vendors"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Backbar.");
    }
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);
  async function scan() {
    setError("");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Camera permission is required to scan a product.");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.72,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPhoto(asset);
      setBusy(true);
      if (demo)
        throw new Error(
          "AI scanning requires an Owner account and Supabase connection; demo mode does not invent results.",
        );
      if (!supabase || !asset.base64) throw new Error("The scan image could not be prepared.");
      const response = await supabase.functions.invoke("lj-scan-backbar", {
        body: { base64: asset.base64, mimeType: asset.mimeType || "image/jpeg" },
      });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      const p = response.data.product;
      const match = categories.find((v) => v.name === p.category);
      setForm({
        ...empty,
        name: p.name || "",
        brand: p.brand || "",
        size_label: p.size_label || "",
        category_id: match?.id || null,
        tracking_method: p.tracking_method || "applications",
        applications_per_container: p.applications_per_container,
        applications_remaining: p.applications_per_container || 0,
        replacement_interval_days: p.replacement_interval_days,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The scan could not be completed.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!form || !form.name.trim()) return setError("Enter the product name.");
    setBusy(true);
    setError("");
    try {
      if (demo) {
        const id = form.id || `demo-backbar-${Date.now()}`;
        setItems((v) => [
          ...v.filter((x) => x.id !== id),
          { ...empty, ...form, id, photo_path: photo?.uri || form.photo_path || null } as Item,
        ]);
        setForm(null);
        setPhoto(null);
        return;
      }
      const { vendor_name, purchase_date, unit_cost, payment_method, payment_status, receipt_path, ...itemForm } = form;
      const payload = {
        ...itemForm,
        name: form.name.trim(),
        brand: form.brand.trim(),
        size_label: form.size_label.trim(),
        applications_remaining:
          form.tracking_method === "applications" ? Number(form.applications_remaining || 0) : null,
        applications_per_container:
          form.tracking_method === "applications"
            ? Number(form.applications_per_container || 1)
            : null,
        expires_on: form.tracking_method === "time" ? form.expires_on || null : null,
        replacement_interval_days:
          form.tracking_method === "time"
            ? Number(form.replacement_interval_days || 0) || null
            : null,
      };
      const saved = check(
        form.id
          ? await db().from("lj_backbar_items").update(payload).eq("id", form.id).select().single()
          : await db().from("lj_backbar_items").insert(payload).select().single(),
      ) as Item;
      if (form.vendor_name?.trim() && Number(form.unit_cost) >= 0) {
        const vendorName = form.vendor_name.trim();
        let vendor = vendors.find((value) => value.name.toLowerCase() === vendorName.toLowerCase());
        if (!vendor) {
          vendor = check(await db().from("lj_vendors").insert({ name: vendorName }).select("id,name").single()) as { id: string; name: string };
        }
        check(await db().from("lj_vendor_purchases").insert({
          vendor_id: vendor.id,
          inventory_kind: "backbar",
          backbar_item_id: saved.id,
          item_name: saved.name,
          brand: saved.brand,
          quantity: Math.max(1, Number(saved.quantity || 1)),
          unit_cost: Number(form.unit_cost || 0),
          purchase_date: form.purchase_date || new Date().toISOString().slice(0, 10),
          payment_method: form.payment_method || "cash",
          payment_status: form.payment_status || "paid",
          receipt_path: form.receipt_path?.trim() || null,
          created_by: (await db().auth.getUser()).data.user?.id || null,
        }));
      }
      if (photo?.base64) {
        const bytes = Uint8Array.from(atob(photo.base64), (x) => x.charCodeAt(0));
        const path = `backbar/${saved.id}.jpg`;
        check(
          await db()
            .storage.from("lj-catalog-media")
            .upload(path, bytes.buffer, { contentType: "image/jpeg", upsert: true }),
        );
        check(await db().from("lj_backbar_items").update({ photo_path: path }).eq("id", saved.id));
      }
      const usage = Object.entries(links)
        .filter(([, v]) => Number(v) > 0)
        .map(([service_id, v]) => ({
          item_id: saved.id,
          service_id,
          applications_used: Number(v),
        }));
      check(await db().from("lj_backbar_service_usage").delete().eq("item_id", saved.id));
      if (usage.length) check(await db().from("lj_backbar_service_usage").insert(usage));
      setForm(null);
      setPhoto(null);
      setLinks({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this item.");
    } finally {
      setBusy(false);
    }
  }
  async function applyAdjustment() {
    if (!adjust || !Number(amount)) return;
    setBusy(true);
    try {
      if (demo)
        setItems((v) =>
          v.map((x) =>
            x.id === adjust.id
              ? {
                  ...x,
                  applications_remaining: Math.max(
                    0,
                    Number(x.applications_remaining || 0) + Number(amount),
                  ),
                  quantity: Math.max(0, Number(x.quantity) + Number(amount)),
                }
              : x,
          ),
        );
      else
        check(
          await db().rpc("lj_adjust_backbar", {
            p_item: adjust.id,
            p_delta: Number(amount),
            p_kind: Number(amount) > 0 ? "restock" : "manual",
            p_reason: reason,
            p_request_key: crypto.randomUUID(),
          }),
        );
      setAdjust(null);
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to adjust stock.");
    } finally {
      setBusy(false);
    }
  }
  const field = (label: string, key: keyof Form, keyboardType?: "numeric") => (
    <View style={{ gap: 5 }}>
      <OwnerText size={15} bold>
        {label}
      </OwnerText>
      <TextInput
        value={String(form?.[key] ?? "")}
        onChangeText={(v) =>
          setForm((x) => (x ? { ...x, [key]: keyboardType ? Number(v) || 0 : v } : x))
        }
        keyboardType={keyboardType}
        placeholderTextColor={c.mutedForeground}
        style={{
          minHeight: 46,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          color: c.foreground,
          backgroundColor: c.background,
          fontSize: 16,
        }}
      />
    </View>
  );
  const filtered = items.filter((v) => category === "All" || v.category_id === category);
  return (
    <View style={{ gap: 16 }}>
      <OwnerTitle
        title="Backbar Management"
        description="Professional-use stock, separate from retail inventory."
      />
      {!!error && (
        <Card style={{ borderColor: c.destructive }}>
          <Txt color={c.destructive}>{error}</Txt>
        </Card>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan a Backbar product"
        onPress={() => void scan()}
        disabled={busy}
      >
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 22, borderColor: c.warning }}>
          <Animated.View
            style={{
              transform: [
                { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
            }}
          >
            <Icon name="ScanLine" size={42} color={c.brandAccent} />
          </Animated.View>
          <OwnerText size={22} bold>
            {busy ? "Identifying product…" : "AI Backbar Scanner"}
          </OwnerText>
          <OwnerText muted>
            Photograph the front label. Review every suggestion before saving.
          </OwnerText>
        </Card>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[{ id: "All", name: "All", sort_order: -1 }, ...categories].map((v) => (
          <Pressable
            key={v.id}
            onPress={() => setCategory(v.id)}
            style={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: category === v.id ? c.brandAccentFill : c.card,
              borderWidth: 1,
              borderColor: category === v.id ? c.brandAccentFill : c.border,
            }}
          >
            <Txt bold color={category === v.id ? c.primaryForeground : c.foreground}>
              {v.name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ alignItems: "center" }}>
        <OwnerButton
          label="Add Backbar Item"
          icon="Plus"
          centered
          onPress={() => {
            setForm({ ...empty });
            setPhoto(null);
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="New category"
          placeholderTextColor={c.mutedForeground}
          style={{
            flex: 1,
            minHeight: 46,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            color: c.foreground,
          }}
        />
        <OwnerButton
          label="Add"
          compact
          secondary
          onPress={async () => {
            if (!categoryName.trim()) return;
            if (demo)
              setCategories((v) => [
                ...v,
                { id: categoryName.trim(), name: categoryName.trim(), sort_order: v.length },
              ]);
            else
              check(
                await db()
                  .from("lj_backbar_categories")
                  .insert({ name: categoryName.trim(), sort_order: categories.length * 10 + 10 }),
              );
            setCategoryName("");
            await load();
          }}
        />
      </View>
      {filtered.length === 0 && (
        <Card style={{ alignItems: "center" }}>
          <OwnerText muted>No Backbar items in this category.</OwnerText>
        </Card>
      )}
      {filtered.map((item) => {
        const remaining =
          item.tracking_method === "applications"
            ? Number(item.applications_remaining || 0)
            : Number(item.quantity);
        const low = remaining <= Number(item.low_stock_threshold);
        const photoUrl = item.photo_path
          ? item.photo_path.startsWith("http") || item.photo_path.startsWith("data:")
            ? item.photo_path
            : db().storage.from("lj-catalog-media").getPublicUrl(item.photo_path).data.publicUrl
          : null;
        return (
          <Card key={item.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {photoUrl && (
                <Image
                  source={{ uri: photoUrl }}
                  style={{ width: 60, height: 72, borderRadius: 10 }}
                />
              )}
              <View style={{ flex: 1 }}>
                <OwnerText size={20} bold>
                  {item.name}
                </OwnerText>
                <OwnerText muted>
                  {[item.brand, item.size_label].filter(Boolean).join(" · ") || "Backbar product"}
                </OwnerText>
                <Txt color={low ? c.destructive : c.foreground}>
                  {item.tracking_method === "applications"
                    ? `${remaining} applications remaining`
                    : `${item.quantity} on hand${item.expires_on ? ` · Replace ${item.expires_on}` : ""}`}
                </Txt>
                {low && (
                  <Txt bold color={c.destructive}>
                    Low stock
                  </Txt>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <OwnerButton
                label="Edit"
                compact
                secondary
                onPress={async () => {
                  setForm({ ...item });
                  setPhoto(null);
                  if (!demo) {
                    const rows = check(
                      await db()
                        .from("lj_backbar_service_usage")
                        .select("service_id,applications_used")
                        .eq("item_id", item.id),
                    ) as { service_id: string; applications_used: number }[];
                    setLinks(
                      Object.fromEntries(
                        (rows || []).map((value) => [
                          value.service_id,
                          String(value.applications_used),
                        ]),
                      ),
                    );
                  }
                }}
              />
              <OwnerButton
                label="Restock / Adjust"
                compact
                secondary
                onPress={() => setAdjust(item)}
              />
              <OwnerButton
                label="Delete"
                compact
                destructive
                onPress={async () => {
                  if (demo) setItems((v) => v.filter((x) => x.id !== item.id));
                  else {
                    check(
                      await db()
                        .from("lj_backbar_items")
                        .update({ deleted_at: new Date().toISOString() })
                        .eq("id", item.id),
                    );
                    await load();
                  }
                }}
              />
            </View>
          </Card>
        );
      })}
      {form && (
        <Card style={{ gap: 12 }}>
          <OwnerText size={24} bold>
            {form.id ? "Edit Backbar Item" : "Add Backbar Item"}
          </OwnerText>
          {photo && <Image source={{ uri: photo.uri }} style={{ height: 150, borderRadius: 12 }} />}
          {field("Product name", "name")}
          <View style={{ gap: 5 }}>
            <OwnerText size={15} bold>Vendor</OwnerText>
            <TextInput value={form.vendor_name || ""} onChangeText={(vendor_name) => setForm((x) => x ? { ...x, vendor_name } : x)} placeholder="Search or add vendor" placeholderTextColor={c.mutedForeground} style={{ minHeight: 46, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, color: c.foreground, backgroundColor: c.background }} />
            {!!vendors.length && <OwnerText muted size={13}>{vendors.slice(0, 4).map((v) => v.name).join(" · ")}</OwnerText>}
          </View>
          {field("Brand", "brand")}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>{field("Purchase date", "purchase_date")}</View>
            <View style={{ flex: 1 }}>{field("Unit cost", "unit_cost", "numeric")}</View>
          </View>
          <OwnerText muted size={13}>Total purchase cost: {`${Number(form.quantity || 1) * Number(form.unit_cost || 0)}`}</OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {["cash", "bank", "card", "credit", "other"].map((payment_method) => <OwnerButton key={payment_method} label={payment_method} compact secondary={form.payment_method !== payment_method} onPress={() => setForm((x) => x ? { ...x, payment_method } : x)} />)}
            <OwnerButton label={form.payment_status === "paid" ? "Paid" : "Outstanding"} compact secondary onPress={() => setForm((x) => x ? { ...x, payment_status: x.payment_status === "paid" ? "outstanding" : "paid" } : x)} />
          </View>
          {field("Receipt link (optional)", "receipt_path")}
          {field("Container size", "size_label")}
          <OwnerText size={15} bold>
            Category
          </OwnerText>
          <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
            {categories.map((v) => (
              <OwnerButton
                key={v.id}
                label={v.name}
                compact
                secondary={form.category_id !== v.id}
                onPress={() => setForm((x) => (x ? { ...x, category_id: v.id } : x))}
              />
            ))}
          </ScrollView>
          <OwnerText size={15} bold>
            Tracking method
          </OwnerText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <OwnerButton
              label="Applications (A)"
              compact
              secondary={form.tracking_method !== "applications"}
              onPress={() => setForm((x) => (x ? { ...x, tracking_method: "applications" } : x))}
            />
            <OwnerButton
              label="Time (T)"
              compact
              secondary={form.tracking_method !== "time"}
              onPress={() => setForm((x) => (x ? { ...x, tracking_method: "time" } : x))}
            />
          </View>
          {form.tracking_method === "applications" ? (
            <>
              {field("Applications remaining", "applications_remaining", "numeric")}
              {field("Applications per container", "applications_per_container", "numeric")}
              {field("Low-stock alert at", "low_stock_threshold", "numeric")}
              <OwnerText size={15} bold>
                Service usage
              </OwnerText>
              {services
                .filter((v) => v.active && !v.is_special)
                .slice(0, 40)
                .map((v) => (
                  <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <OwnerText size={14}>{v.name}</OwnerText>
                    <TextInput
                      value={links[v.id] || ""}
                      onChangeText={(n) => setLinks((x) => ({ ...x, [v.id]: n }))}
                      keyboardType="numeric"
                      placeholder="Uses"
                      placeholderTextColor={c.mutedForeground}
                      style={{
                        marginLeft: "auto",
                        width: 72,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 8,
                        padding: 8,
                        color: c.foreground,
                      }}
                    />
                  </View>
                ))}
            </>
          ) : (
            <>
              {field("Quantity on hand", "quantity", "numeric")}
              {field("Expiration / replacement date (YYYY-MM-DD)", "expires_on")}
              {field("Replacement interval (days)", "replacement_interval_days", "numeric")}
            </>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <OwnerButton label="Save Item" busy={busy} onPress={() => void save()} />
            <OwnerButton label="Cancel" secondary onPress={() => setForm(null)} />
          </View>
        </Card>
      )}
      {adjust && (
        <Card style={{ gap: 12 }}>
          <OwnerText size={22} bold>
            Adjust {adjust.name}
          </OwnerText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Amount, e.g. 30 or -2"
            placeholderTextColor={c.mutedForeground}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              padding: 12,
              color: c.foreground,
            }}
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            placeholderTextColor={c.mutedForeground}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              padding: 12,
              color: c.foreground,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <OwnerButton
              label="Confirm Adjustment"
              onPress={() => void applyAdjustment()}
              busy={busy}
            />
            <OwnerButton label="Cancel" secondary onPress={() => setAdjust(null)} />
          </View>
        </Card>
      )}
    </View>
  );
}
