import { DateField } from "../DateFields";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { db, check } from "@/lib/salon/client";
import { Discount } from "@/lib/salon/discounts";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Card, Chip, Field, Check, ErrorBox, Txt, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

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
  scope: "all" as Discount["scope"],
  item_id: "",
  active: true,
  expiry: "",
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
        const data = check(
          await db()
            .from("lj_discounts")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id")
            .range(page * 20, page * 20 + 19),
        ) as Discount[];
        if (active) setRows(data);
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
    setPromo(!!row?.code);
    setSearch("");
    setError("");
    setForm(
      row
        ? {
            name: row.name,
            code: row.code || "",
            percentage: String(row.percentage),
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
          }
        : { ...empty },
    );
  }
  async function save() {
    if (!form) return;
    setError("");
    const percentage = Number(form.percentage);
    const code = promo ? form.code.trim().toUpperCase() : null;
    if (!form.name.trim()) return setError("Give this discount a name.");
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage >= 100)
      return setError("Enter a percentage greater than 0 and less than 100.");
    if (promo && !/^[A-Z0-9_-]{3,30}$/.test(code || ""))
      return setError("Use 3–30 letters, numbers, dashes or underscores for your code.");
    const expiry = form.expiry.trim();
    const expires_at = expiry ? `${expiry}T23:59:59-04:00` : null;
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
    const data = {
      name: form.name.trim(),
      code,
      percentage,
      scope: form.scope,
      item_id: form.item_id || null,
      active: form.active,
      expires_at,
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
          ? "Demo discount saved. Customer checkout is unchanged."
          : "Discount saved. Eligible customers can use it before payment.",
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
  return (
    <View style={{ gap: 18 }}>
      <OwnerText>
        Set a percentage for any service, product or workshop. Add a code customers can enter, or
        apply the offer automatically.
      </OwnerText>
      {!form && <OwnerButton label="Create discount" icon="Plus" onPress={() => open()} />}
      {!!error && (
        <ErrorBox message={error} retry={!form ? () => setVersion((v) => v + 1) : undefined} />
      )}
      {form && (
        <Card style={{ gap: 12 }}>
          <OwnerText size={24} bold>
            {editId ? "Edit discount" : "Create discount"}
          </OwnerText>
          <Field
            large
            label="Discount name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            placeholder="A little birthday treat"
          />
          <Field
            large
            label="Discount percentage"
            value={form.percentage}
            onChangeText={(percentage) => setForm({ ...form, percentage })}
            keyboardType="numeric"
            placeholder="10"
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
          <OwnerText bold>Applies to</OwnerText>
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
              {catalogs[form.scope]
                .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
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
            label="Expiry date (optional)"
            value={form.expiry}
            onChange={(expiry) => setForm({ ...form, expiry })}
            optional
          />
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
              label={busy ? "Saving…" : "Save discount"}
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
      {loading && <OwnerText muted>Loading discounts…</OwnerText>}
      {!loading && !visible.length && !form && (
        <Card>
          <OwnerText>No discounts yet. Create your first offer above.</OwnerText>
        </Card>
      )}
      {!loading &&
        visible.map((v) => (
          <Card key={v.id} style={{ gap: 10 }}>
            <OwnerText size={24} bold>
              {v.name} · {v.percentage}%
            </OwnerText>
            <OwnerText>{v.code ? `Promo code: ${v.code}` : "Automatic discount"}</OwnerText>
            <OwnerText muted>
              {v.scope === "all"
                ? "Everything"
                : v.item_id
                  ? catalogs[v.scope].find((i) => i.id === v.item_id)?.name || "Specific item"
                  : scopes.find((i) => i.id === v.scope)?.label}{" "}
              ·{" "}
              {!v.active
                ? "Inactive"
                : v.expires_at && Date.parse(v.expires_at) <= Date.now()
                  ? "Expired"
                  : "Active"}
            </OwnerText>
            {v.expires_at && (
              <OwnerText muted>
                Expires{" "}
                {new Date(v.expires_at).toLocaleDateString("en-TT", {
                  timeZone: "America/Port_of_Spain",
                })}
              </OwnerText>
            )}
            <OwnerButton label="Edit discount" secondary onPress={() => open(v)} />
          </Card>
        ))}
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
