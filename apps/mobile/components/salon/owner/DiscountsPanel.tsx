import { displayDate } from "@/lib/salon/dates";
import { DateField } from "../DateFields";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { db, check, asRows } from "@/lib/salon/client";
import { Discount } from "@/lib/salon/discounts";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, Chip, Field, Check, ErrorBox, Txt, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
import * as Clipboard from "expo-clipboard";

const scopes = [
  { id: "all" as const, label: "Everything" },
  { id: "service" as const, label: "Services" },
  { id: "product" as const, label: "Products" },
  { id: "workshop" as const, label: "Workshops" },
];
const empty = {
  name: "",
  code: "",
  percentage: "",
  discount_type: "percentage" as "percentage" | "fixed",
  fixed_amount: "",
  scope: "all" as Discount["scope"],
  item_id: "",
  active: true,
  expiry: "",
  start_date: "",
  start_time: "00:00",
  end_time: "23:59",
  timezone: "America/Port_of_Spain",
};
export default function DiscountsPanel({
  demo,
  demoRows,
  onDemoRows,
  catalogs,
}: {
  demo: boolean;
  demoRows: Discount[];
  onDemoRows: (rows: Discount[]) => void;
  catalogs: Record<"service" | "product" | "workshop", { id: string; name: string }[]>;
}) {
  const s = useSalon(),
    c = useColors();
  const [rows, setRows] = useState<Discount[]>([]);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [editId, setEditId] = useState("");
  const [promo, setPromo] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (demo) return;
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const data = asRows<Discount & { lj_promo_redemptions?: { discount_amount: number }[] }>(
          check(
            await db()
              .from("lj_discounts")
              .select("*,lj_promo_redemptions(discount_amount)")
              .order("created_at", { ascending: false })
              .order("id")
              .range(page * 20, page * 20 + 19),
          ),
          "Discounts",
        );
        if (active)
          setRows(
            data.map((row) => ({
              ...row,
              redemption_count: row.lj_promo_redemptions?.length || 0,
              total_discount:
                row.lj_promo_redemptions?.reduce(
                  (sum, redemption) => sum + Number(redemption.discount_amount),
                  0,
                ) || 0,
            })),
          );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load discounts.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [demo, page, version]);
  const visible = demo ? demoRows.slice(page * 20, page * 20 + 20) : rows;
  function open(row?: Discount) {
    setEditId(row?.id || "");
    setPromo(row ? !!row.code : true);
    setSearch("");
    setError("");
    setForm(
      row
        ? {
            name: row.name,
            code: row.code || "",
            percentage: String(row.percentage),
            discount_type: row.discount_type || "percentage",
            fixed_amount: row.fixed_amount == null ? "" : String(row.fixed_amount),
            scope: row.scope,
            item_id: row.item_id || "",
            active: row.active,
            expiry: row.expires_at
              ? new Intl.DateTimeFormat("en-CA", {
                  timeZone: "America/Port_of_Spain",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(row.expires_at))
              : "",
            start_date: row.starts_at ? row.starts_at.slice(0, 10) : "",
            start_time: row.starts_at
              ? new Intl.DateTimeFormat("en-GB", {
                  timeZone: row.timezone || "America/Port_of_Spain",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(row.starts_at))
              : "00:00",
            end_time: row.expires_at
              ? new Intl.DateTimeFormat("en-GB", {
                  timeZone: row.timezone || "America/Port_of_Spain",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(row.expires_at))
              : "23:59",
            timezone: row.timezone || "America/Port_of_Spain",
          }
        : { ...empty },
    );
  }
  async function save() {
    if (!form) return;
    setError("");
    const percentage = Number(form.percentage);
    const fixedAmount = Number(form.fixed_amount);
    const code = promo ? form.code.trim().toUpperCase() : null;
    if (!form.name.trim()) return setError("Give this discount a name.");
    if (
      form.discount_type === "percentage" &&
      (!Number.isFinite(percentage) || percentage <= 0 || percentage >= 100)
    )
      return setError("Enter a percentage greater than 0 and less than 100.");
    if (
      form.discount_type === "fixed" &&
      (!Number.isFinite(fixedAmount) || fixedAmount <= 0 || fixedAmount > 100000)
    )
      return setError("Enter a fixed discount greater than TT$0.");
    if (promo && !/^[A-Z0-9_-]{3,30}$/.test(code || ""))
      return setError("Use 3–30 letters, numbers, dashes or underscores for your code.");
    const expiry = form.expiry.trim();
    if (
      (form.start_date || expiry) &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.start_time) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.end_time))
    )
      return setError("Use a valid 24-hour start and end time, for example 09:30.");
    const starts_at = form.start_date ? `${form.start_date}T${form.start_time}:00-04:00` : null;
    const expires_at = expiry ? `${expiry}T${form.end_time}:00-04:00` : null;
    const parsedDay = Date.parse(`${expiry}T12:00:00Z`);
    if (
      expiry &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
        !Number.isFinite(parsedDay) ||
        new Date(parsedDay).toISOString().slice(0, 10) !== expiry)
    )
      return setError("Choose a valid expiry date.");
    if (form.active && expires_at && Date.parse(expires_at) <= Date.now())
      return setError("Choose a future expiry date or leave it blank.");
    if (starts_at && expires_at && Date.parse(expires_at) <= Date.parse(starts_at))
      return setError("End date and time must follow the start.");
    const data = {
      name: form.name.trim(),
      code,
      percentage,
      discount_type: form.discount_type,
      fixed_amount: form.discount_type === "fixed" ? fixedAmount : null,
      scope: form.scope,
      item_id: form.item_id || null,
      active: form.active,
      expires_at,
      starts_at,
      timezone: form.timezone,
    };
    setBusy(true);
    try {
      if (demo)
        onDemoRows([
          { ...data, id: editId || `demo-discount-${Date.now()}` },
          ...demoRows.filter((v) => v.id !== editId),
        ]);
      else if (editId)
        check(await db().from("lj_discounts").update(data).eq("id", editId).select("id").single());
      else check(await db().from("lj_discounts").insert(data).select("id").single());
      setForm(null);
      setPage(0);
      setVersion((v) => v + 1);
      s.notify(
        demo
          ? "Promotion saved."
          : "Promotion saved. Eligible customers can use it before payment.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save this discount.";
      setError(
        /duplicate|unique/i.test(message)
          ? "This promo code is already in use. Choose another code."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  const statusOf = (row: Discount) =>
    !row.active
      ? "Disabled"
      : row.expires_at && Date.parse(row.expires_at) <= Date.now()
        ? "Expired"
        : row.starts_at && Date.parse(row.starts_at) > Date.now()
          ? "Scheduled"
          : "Active";
  async function toggleActive(row: Discount) {
    try {
      if (demo)
        onDemoRows(
          demoRows.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)),
        );
      else check(await db().from("lj_discounts").update({ active: !row.active }).eq("id", row.id));
      setVersion((value) => value + 1);
      s.notify(row.active ? "Promotion disabled." : "Promotion activated.");
    } catch (reason) {
      setError(
        reason instanceof Error && /unique|duplicate/i.test(reason.message)
          ? "Another active promotion already uses this code."
          : reason instanceof Error
            ? reason.message
            : "Unable to update this promotion.",
      );
    }
  }
  async function deleteUnused(row: Discount) {
    try {
      if (demo) onDemoRows(demoRows.filter((item) => item.id !== row.id));
      else check(await db().from("lj_discounts").delete().eq("id", row.id));
      setVersion((value) => value + 1);
      s.notify("Unused promotion deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Only unused promotions can be deleted.");
    }
  }
  return (
    <View style={{ gap: 18 }}>
      <OwnerText>
        Create scheduled percentage or fixed-value promo codes. Checkout validates every code again
        before the booking is saved.
      </OwnerText>
      {!form && <OwnerButton label="Create Promotion" icon="Plus" onPress={() => open()} />}
      {!!error && (
        <ErrorBox message={error} retry={!form ? () => setVersion((v) => v + 1) : undefined} />
      )}
      {form && (
        <Card style={{ gap: 12 }}>
          <OwnerText size={24} bold>
            {editId ? "Edit Promotion" : "Create Promotion"}
          </OwnerText>
          <Field
            large
            label="Discount name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            placeholder="A little birthday treat"
          />
          <OwnerText bold>Discount Type</OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip
              label="Percentage (%)"
              selected={form.discount_type === "percentage"}
              onPress={() => setForm({ ...form, discount_type: "percentage" })}
            />
            <Chip
              label="Fixed TT$"
              selected={form.discount_type === "fixed"}
              onPress={() => setForm({ ...form, discount_type: "fixed" })}
            />
          </View>
          <Field
            large
            label={
              form.discount_type === "percentage" ? "Discount Amount (%)" : "Discount Amount (TT$)"
            }
            value={form.discount_type === "percentage" ? form.percentage : form.fixed_amount}
            onChangeText={(value) =>
              setForm({
                ...form,
                ...(form.discount_type === "percentage"
                  ? { percentage: value }
                  : { fixed_amount: value }),
              })
            }
            keyboardType="numeric"
            placeholder={form.discount_type === "percentage" ? "10" : "50"}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="Promo code" selected={promo} onPress={() => setPromo(true)} />
            <Chip label="Automatic discount" selected={!promo} onPress={() => setPromo(false)} />
          </View>
          {promo && (
            <Field
              large
              label="Customer promo code"
              value={form.code}
              onChangeText={(code) => setForm({ ...form, code: code.toUpperCase() })}
              placeholder="LADYJ10"
            />
          )}
          <OwnerText bold>Applies To</OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {scopes.map((v) => (
              <Chip
                key={v.id}
                label={v.label}
                selected={form.scope === v.id}
                onPress={() => {
                  setForm({ ...form, scope: v.id, item_id: "" });
                  setSearch("");
                }}
              />
            ))}
          </View>
          {form.scope !== "all" && (
            <View style={{ gap: 8 }}>
              <Chip
                label={`All ${scopes.find((v) => v.id === form.scope)?.label.toLowerCase()}`}
                selected={!form.item_id}
                onPress={() => setForm({ ...form, item_id: "" })}
              />
              <Field
                large
                label="Or find one item"
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name"
              />
              {!!form.item_id && (
                <OwnerText bold>
                  Selected:{" "}
                  {catalogs[form.scope].find((v) => v.id === form.item_id)?.name ||
                    "Unavailable item"}
                </OwnerText>
              )}
              {(catalogs[form.scope] || [])
                .filter((v) =>
                  String(v?.name ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .slice(0, 8)
                .map((v) => (
                  <Chip
                    key={v.id}
                    label={v.name}
                    selected={form.item_id === v.id}
                    onPress={() => setForm({ ...form, item_id: v.id })}
                  />
                ))}
              <Txt size={13} color={c.mutedForeground}>
                Search to find a specific item. Leaving “All” selected includes the whole category.
              </Txt>
            </View>
          )}
          <DateField
            label="Start Date (optional)"
            value={form.start_date}
            onChange={(start_date) => setForm({ ...form, start_date })}
            optional
          />
          <Field
            large
            label="Start Time"
            value={form.start_time}
            onChangeText={(start_time) => setForm({ ...form, start_time })}
            placeholder="00:00"
          />
          <DateField
            label="End Date (optional)"
            value={form.expiry}
            onChange={(expiry) => setForm({ ...form, expiry })}
            optional
          />
          <Field
            large
            label="End Time"
            value={form.end_time}
            onChangeText={(end_time) => setForm({ ...form, end_time })}
            placeholder="23:59"
          />
          <View style={{ gap: 8 }}>
            <OwnerText bold>Timezone</OwnerText>
            <Chip
              label="America/Port_of_Spain (GMT−4)"
              selected={form.timezone === "America/Port_of_Spain"}
              onPress={() => setForm({ ...form, timezone: "America/Port_of_Spain" })}
            />
          </View>
          <Check
            checked={form.active}
            onPress={() => setForm({ ...form, active: !form.active })}
            label="Discount is active"
          />
          <OwnerText muted>
            Customers get the best eligible percentage per item. Delivery fees stay separate.
          </OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <OwnerButton
              label={busy ? "Saving" : "Save discount"}
              disabled={busy}
              onPress={() => void save()}
            />
            <OwnerButton
              label="Cancel"
              secondary
              disabled={busy}
              onPress={() => {
                setForm(null);
                setError("");
              }}
            />
          </View>
        </Card>
      )}
      {loading && <OwnerText muted>Loading discounts</OwnerText>}
      {!loading && !visible.length && !form && (
        <Card>
          <OwnerText>No discounts yet. Create your first offer above.</OwnerText>
        </Card>
      )}
      {!loading &&
        ["Active", "Scheduled", "Expired", "Disabled"].map((group) => {
          const grouped = visible.filter((row) => statusOf(row) === group);
          if (!grouped.length) return null;
          return (
            <View key={group} style={{ gap: 10 }}>
              <OwnerText size={22} bold>
                {group}
              </OwnerText>
              {grouped.map((v) => (
                <Card key={v.id} style={{ gap: 10 }}>
                  <OwnerText size={24} bold>
                    {v.name} ·{" "}
                    {v.discount_type === "fixed"
                      ? `TT$${Number(v.fixed_amount || 0).toFixed(2)}`
                      : `${v.percentage}%`}
                  </OwnerText>
                  <OwnerText>{v.code ? `Promo code: ${v.code}` : "Automatic discount"}</OwnerText>
                  <OwnerText muted>
                    {v.scope === "all"
                      ? "Everything"
                      : v.item_id
                        ? catalogs[v.scope].find((i) => i.id === v.item_id)?.name || "Specific item"
                        : scopes.find((i) => i.id === v.scope)?.label}{" "}
                    · {statusOf(v)}
                  </OwnerText>
                  <OwnerText muted>
                    {v.redemption_count || 0} redemptions ·{" "}
                    {`TT$${Number(v.total_discount || 0).toFixed(2)}`} total discounts
                  </OwnerText>
                  {v.expires_at && <OwnerText muted>Expires {displayDate(v.expires_at)}</OwnerText>}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <OwnerButton label="View / Edit" secondary onPress={() => open(v)} />
                    {!!v.code && (
                      <OwnerButton
                        label="Copy Code"
                        secondary
                        onPress={() =>
                          void Clipboard.setStringAsync(v.code || "").then(() =>
                            s.notify("Promo code copied."),
                          )
                        }
                      />
                    )}
                    <OwnerButton
                      label={v.active ? "Deactivate" : "Activate"}
                      secondary
                      onPress={() => void toggleActive(v)}
                    />
                    <OwnerButton
                      label="Duplicate"
                      secondary
                      onPress={() => {
                        open({
                          ...v,
                          id: "",
                          name: `${v.name} Copy`,
                          code: v.code ? `${v.code}COPY` : null,
                        });
                        setEditId("");
                      }}
                    />
                    {!v.redemption_count && (
                      <OwnerButton
                        label="Delete Unused"
                        secondary
                        onPress={() => void deleteUnused(v)}
                      />
                    )}
                  </View>
                </Card>
              ))}
            </View>
          );
        })}
      {(page > 0 || visible.length === 20) && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <OwnerButton
            label="Previous"
            secondary
            disabled={page === 0 || loading}
            onPress={() => setPage((v) => v - 1)}
          />
          <OwnerButton
            label="Next"
            secondary
            disabled={visible.length < 20 || loading}
            onPress={() => setPage((v) => v + 1)}
          />
        </View>
      )}
    </View>
  );
}
