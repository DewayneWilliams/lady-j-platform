import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { asRows, check, db } from "@/lib/salon/client";
import { exportCsv } from "@/lib/salon/csvExport";
import { ownerReportPdf } from "@/lib/salon/ownerReportPdf";
import type { ReportDocument } from "@/lib/salon/ownerReports";
import { exportReportPdf } from "@/lib/salon/reportFile";
import Icon from "@/lib/icons/LucideIcon";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { DateField } from "../DateFields";
import { ButtonLabel, Card, ErrorBox, Txt, useColors } from "../ui";
import { OwnerButton, OwnerStat, OwnerText } from "./OwnerUI";
import { ownerEditorPortal } from "./OwnerEditorPortal";

type Vendor = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  contact_person: string;
  notes: string;
  archived_at: string | null;
  is_demo: boolean;
};
type Purchase = {
  id: string;
  vendor_id: string;
  inventory_kind: "retail" | "backbar";
  product_id: string | null;
  backbar_item_id: string | null;
  item_name: string;
  brand: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  paid_amount: number | null;
  purchase_date: string;
  payment_method: string;
  payment_status: "paid" | "partial" | "outstanding" | "voided";
  receipt_path: string | null;
  is_demo: boolean;
};
type Stock = { id: string; name: string; brand?: string; stock?: number };
type VendorDraft = Pick<
  Vendor,
  "name" | "company" | "phone" | "email" | "address" | "contact_person" | "notes"
>;
type PurchaseDraft = {
  id?: string;
  vendor_id: string;
  inventory_kind: "retail" | "backbar";
  item_name: string;
  brand: string;
  quantity: string;
  unit_cost: string;
  purchase_date: string;
  payment_method: string;
  payment_status: "paid" | "partial" | "outstanding";
  paid_amount: string;
  receipt_path: string;
  inventory_id: string;
};

const day = () => new Date().toISOString().slice(0, 10);
const ttd = (value: number) =>
  `TT$${Number(value || 0).toLocaleString("en-TT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyVendor: VendorDraft = {
  name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  contact_person: "",
  notes: "",
};
const emptyPurchase = (vendor_id = ""): PurchaseDraft => ({
  vendor_id,
  inventory_kind: "retail",
  item_name: "",
  brand: "",
  quantity: "1",
  unit_cost: "",
  purchase_date: day(),
  payment_method: "bank",
  payment_status: "paid",
  paid_amount: "",
  receipt_path: "",
  inventory_id: "",
});
const demoVendorNames = [
  "Peter's Professional Hair Supply",
  "Andrew's Beauty Essentials",
  "James' Salon Equipment",
  "John's Luxury Haircare",
  "Philip's Nail Collection",
  "Bartholomew's Skincare Supply",
  "Matthew's Beauty Wholesale",
  "Thomas' Barber Supplies",
  "James Alphaeus Cosmetics",
  "Thaddaeus Spa Essentials",
  "Simon's Professional Products",
  "Judas Iscariot Beauty Distribution",
];
const demoVendors: Vendor[] = demoVendorNames.map((name, index) => ({
  id: `demo-vendor-${index + 1}`,
  name,
  company: name,
  phone: `+1 868 555 ${String(3100 + index)}`,
  email: `vendor${index + 1}@demo.invalid`,
  address: `${index + 1} Sample Commerce Road, Trinidad`,
  contact_person: [
    "Peter",
    "Andrew",
    "James",
    "John",
    "Philip",
    "Bartholomew",
    "Matthew",
    "Thomas",
    "James",
    "Thaddaeus",
    "Simon",
    "Judas",
  ][index],
  notes: "Fictional disciples-inspired vendor company for Development Test Mode only.",
  archived_at: null,
  is_demo: true,
}));
const demoProducts = [
  ["Professional Color Tubes", "Wella", "backbar", 12, 82.5],
  ["Hydrating Shampoo", "Joico", "retail", 8, 64],
  ["Styling Tools", "BabylissPRO", "backbar", 3, 290],
  ["Repair Conditioner", "Redken", "retail", 10, 79],
  ["Gel Polish Set", "OPI", "retail", 15, 48],
  ["Hydrating Facial Mask", "Dermalogica", "retail", 9, 72],
  ["Silk Press Serum", "Design Essentials", "retail", 14, 44],
  ["Clipper Blades", "Andis", "backbar", 6, 95],
  ["Finishing Powder", "MAC", "retail", 7, 68],
  ["Body Treatment Oil", "Osea", "backbar", 10, 61],
  ["Keratin Treatment", "Keratin Complex", "backbar", 5, 155],
  ["Smoothing Shampoo", "Pure Brazilian", "retail", 11, 57],
] as const;
const dateAgo = (days: number) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
};
const demoVendorPurchases: Purchase[] = [
  ...demoProducts.map(([item_name, brand, inventory_kind, quantity, unit_cost], index) => ({
    id: `demo-vendor-purchase-${index + 1}`,
    vendor_id: `demo-vendor-${index + 1}`,
    inventory_kind,
    product_id: null,
    backbar_item_id: null,
    item_name,
    brand,
    quantity,
    unit_cost,
    total_cost: quantity * unit_cost,
    paid_amount: quantity * unit_cost,
    purchase_date: dateAgo(index * 3),
    payment_method: "bank",
    payment_status: "paid" as const,
    receipt_path: null,
    is_demo: true,
  })),
  {
    id: "demo-vendor-price-history-1",
    vendor_id: "demo-vendor-1",
    inventory_kind: "backbar",
    product_id: null,
    backbar_item_id: null,
    item_name: "Professional Color Tubes",
    brand: "Wella",
    quantity: 10,
    unit_cost: 76,
    total_cost: 760,
    paid_amount: 760,
    purchase_date: dateAgo(42),
    payment_method: "bank",
    payment_status: "paid",
    receipt_path: null,
    is_demo: true,
  },
  {
    id: "demo-vendor-price-history-2",
    vendor_id: "demo-vendor-2",
    inventory_kind: "retail",
    product_id: null,
    backbar_item_id: null,
    item_name: "Hydrating Shampoo",
    brand: "Joico",
    quantity: 8,
    unit_cost: 59,
    total_cost: 472,
    paid_amount: 472,
    purchase_date: dateAgo(48),
    payment_method: "bank",
    payment_status: "paid",
    receipt_path: null,
    is_demo: true,
  },
];

function Field({
  label,
  value,
  onChange,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 5, flex: 1, minWidth: 140 }}>
      <Txt size={12} bold color={c.mutedForeground}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{
          minHeight: multiline ? 74 : 42,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: multiline ? 9 : 7,
          color: c.foreground,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
function Choices<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {values.map((item) => (
        <OwnerButton
          key={item}
          compact
          label={item === "outstanding" ? "Unpaid" : item}
          secondary={item !== value}
          onPress={() => onChange(item)}
        />
      ))}
    </View>
  );
}

function VendorFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const c = useColors();
  const selected = options.find((option) => option.value === value) || options[0];
  return (
    <View style={{ gap: 3 }}>
      <Txt size={12} bold color={c.mutedForeground}>
        {label}
      </Txt>
      <Select
        value={{ value: selected.value, label: selected.label }}
        onValueChange={(option) => option && onChange(option.value)}
      >
        <SelectTrigger
          accessibilityLabel={label}
          style={{
            minHeight: 42,
            height: "auto",
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
            backgroundColor: c.background,
            borderColor: c.border,
          }}
        >
          <ButtonLabel size={16}>{selected.label}</ButtonLabel>
        </SelectTrigger>
        <SelectContent portalHost={ownerEditorPortal} position="popper">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              label={option.label}
              value={option.value}
              textClassName="text-base native:text-base"
              style={{ minHeight: 44 }}
            />
          ))}
        </SelectContent>
      </Select>
    </View>
  );
}

export default function VendorSpendingPanel({
  onBack,
  demo = false,
}: {
  onBack?: () => void;
  demo?: boolean;
}) {
  const c = useColors(),
    saving = useRef(false);
  const [vendors, setVendors] = useState<Vendor[]>([]),
    [purchases, setPurchases] = useState<Purchase[]>([]),
    [retail, setRetail] = useState<Stock[]>([]),
    [backbar, setBackbar] = useState<Stock[]>([]);
  const [query, setQuery] = useState(""),
    [period, setPeriod] = useState<"Today" | "7 Days" | "30 Days" | "Custom">("30 Days"),
    [kind, setKind] = useState<"All" | "Retail" | "Backbar">("All"),
    [from, setFrom] = useState(day().slice(0, 7) + "-01"),
    [to, setTo] = useState(day()),
    [mode, setMode] = useState<"live" | "demo">(demo ? "demo" : "live"),
    [sort, setSort] = useState<"spend" | "name">("spend"),
    [selected, setSelected] = useState("all");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [vendorForm, setVendorForm] = useState<{ id?: string; values: VendorDraft } | null>(null),
    [purchaseForm, setPurchaseForm] = useState<PurchaseDraft | null>(null),
    [reportOpen, setReportOpen] = useState(false);
  const load = useCallback(async () => {
    if (demo) {
      setVendors(demoVendors);
      setPurchases(demoVendorPurchases);
      setRetail(
        demoProducts
          .filter((item) => item[2] === "retail")
          .map((item, index) => ({
            id: `demo-retail-${index}`,
            name: item[0],
            brand: item[1],
            stock: item[3],
          })),
      );
      setBackbar(
        demoProducts
          .filter((item) => item[2] === "backbar")
          .map((item, index) => ({ id: `demo-backbar-${index}`, name: item[0], brand: item[1] })),
      );
      return;
    }
    try {
      const [vendorResult, purchaseResult, retailResult, backbarResult] = await Promise.all([
        db().from("lj_vendors").select("*").is("archived_at", null).order("name"),
        db().from("lj_vendor_purchases").select("*").order("purchase_date", { ascending: false }),
        db().from("lj_products").select("id,name,brand,stock").is("deleted_at", null).order("name"),
        db().from("lj_backbar_items").select("id,name,brand").is("deleted_at", null).order("name"),
      ]);
      setVendors(asRows<Vendor>(check(vendorResult), "Vendors"));
      setPurchases(asRows<Purchase>(check(purchaseResult), "Vendor purchases"));
      setRetail(asRows<Stock>(check(retailResult), "Retail inventory"));
      setBackbar(asRows<Stock>(check(backbarResult), "Backbar inventory"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load vendor management.");
    }
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);
  const range = useMemo(() => {
    const now = day();
    if (period === "Custom") return { from, to };
    if (period === "Today") return { from: now, to: now };
    const date = new Date(`${now}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (period === "7 Days" ? 6 : 29));
    return { from: date.toISOString().slice(0, 10), to: now };
  }, [from, period, to]);
  const active = vendors.filter((item) => item.is_demo === (mode === "demo"));
  const filtered = purchases.filter(
    (item) =>
      item.is_demo === (mode === "demo") &&
      item.purchase_date >= range.from &&
      item.purchase_date <= range.to &&
      (kind === "All" || item.inventory_kind === kind.toLowerCase()) &&
      (selected === "all" || item.vendor_id === selected),
  );
  const paid = filtered.filter((item) => item.payment_status === "paid");
  const total = paid.reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0);
  const items = active
    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : spendFor(b.id) - spendFor(a.id),
    );
  function spendFor(id: string) {
    return filtered
      .filter((item) => item.vendor_id === id && item.payment_status === "paid")
      .reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0);
  }
  const name = (id: string) => vendors.find((item) => item.id === id)?.name || "Vendor";
  const liveToday = purchases
    .filter(
      (item) => !item.is_demo && item.purchase_date === day() && item.payment_status === "paid",
    )
    .reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0);
  const liveMonth = purchases
    .filter(
      (item) =>
        !item.is_demo &&
        item.purchase_date >= `${day().slice(0, 7)}-01` &&
        item.payment_status === "paid",
    )
    .reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0);
  const displayedToday =
    mode === "demo"
      ? purchases
          .filter(
            (item) =>
              item.is_demo && item.purchase_date === day() && item.payment_status === "paid",
          )
          .reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0)
      : liveToday;
  const displayedMonth =
    mode === "demo"
      ? purchases
          .filter(
            (item) =>
              item.is_demo &&
              item.purchase_date >= `${day().slice(0, 7)}-01` &&
              item.payment_status === "paid",
          )
          .reduce((sum, item) => sum + Number(item.paid_amount ?? item.total_cost), 0)
      : liveMonth;
  const priceChanges = useMemo(() => {
    const history = purchases.filter(
      (item) => item.is_demo === (mode === "demo") && item.payment_status !== "voided",
    );
    return Object.values(
      history.reduce<Record<string, Purchase[]>>((groups, item) => {
        const key = `${item.item_name.toLowerCase()}|${item.brand.toLowerCase()}`;
        (groups[key] ||= []).push(item);
        return groups;
      }, {}),
    )
      .flatMap((group) => {
        const ordered = group.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
        const current = ordered[ordered.length - 1];
        const previous = ordered[ordered.length - 2];
        return previous
          ? [
              {
                key: current.id,
                product: current.item_name,
                previous: Number(previous.unit_cost),
                current: Number(current.unit_cost),
                vendors: new Set(group.map((item) => item.vendor_id)).size,
              },
            ]
          : [];
      })
      .slice(0, 4);
  }, [mode, purchases]);
  const report: ReportDocument = useMemo(
    () => ({
      title: "Vendor Spending" as never,
      businessName: "Lady J International Beauty Academy",
      range,
      generatedAt: new Date().toISOString(),
      sample: mode === "demo",
      summary: [
        { label: "Paid spend", value: ttd(total) },
        {
          label: "Outstanding",
          value: ttd(
            filtered
              .filter((item) => !["paid", "voided"].includes(item.payment_status))
              .reduce(
                (sum, item) => sum + Number(item.total_cost) - Number(item.paid_amount || 0),
                0,
              ),
          ),
        },
        { label: "Transactions", value: filtered.length },
      ],
      notes: [
        mode === "demo"
          ? "Demo transactions are illustrative and excluded from live financial totals."
          : "Paid purchases only are included in spending totals.",
      ],
      headers: [
        "Date",
        "Vendor",
        "Product",
        "Inventory",
        "Quantity",
        "Unit cost",
        "Total",
        "Status",
      ],
      rows: filtered.map((item) => [
        item.purchase_date,
        name(item.vendor_id),
        item.item_name,
        item.inventory_kind,
        item.quantity,
        ttd(Number(item.unit_cost)),
        ttd(Number(item.total_cost)),
        item.payment_status,
      ]),
    }),
    [filtered, mode, range, total],
  );
  const saveVendor = async () => {
    if (!vendorForm?.values.name.trim()) return setError("Enter a vendor name.");
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(
        Object.entries(vendorForm.values).map(([key, value]) => [key, value.trim()]),
      ) as VendorDraft;
      if (demo) {
        setVendors((current) =>
          vendorForm.id
            ? current.map((vendor) =>
                vendor.id === vendorForm.id ? { ...vendor, ...values } : vendor,
              )
            : [
                ...current,
                {
                  id: `demo-vendor-custom-${Date.now()}`,
                  ...values,
                  archived_at: null,
                  is_demo: true,
                },
              ],
        );
      } else if (vendorForm.id)
        check(await db().from("lj_vendors").update(values).eq("id", vendorForm.id));
      else
        check(
          await db()
            .from("lj_vendors")
            .insert({ ...values, is_demo: mode === "demo" }),
        );
      setVendorForm(null);
      setNotice("Vendor saved.");
      if (!demo) await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save vendor.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const archive = (item: Vendor) =>
    Alert.alert("Archive vendor?", "Purchase history stays available.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          if (demo) {
            setVendors((current) => current.filter((vendor) => vendor.id !== item.id));
            setNotice("Demo vendor archived. Purchase history remains in this session.");
            return;
          }
          void db()
            .from("lj_vendors")
            .update({ archived_at: new Date().toISOString() })
            .eq("id", item.id)
            .then(load, (cause: unknown) =>
              setError(cause instanceof Error ? cause.message : "Unable to archive vendor."),
            );
        },
      },
    ]);
  const savePurchase = async () => {
    if (
      !purchaseForm?.vendor_id ||
      !purchaseForm.item_name.trim() ||
      Number(purchaseForm.quantity) <= 0 ||
      Number(purchaseForm.unit_cost) < 0
    )
      return setError("Choose a vendor and enter product, quantity, and unit cost.");
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const quantity = Number(purchaseForm.quantity),
      unitCost = Number(purchaseForm.unit_cost),
      paidAmount =
        purchaseForm.payment_status === "paid"
          ? quantity * unitCost
          : Math.max(0, Number(purchaseForm.paid_amount || 0));
    try {
      const payload = {
        vendor_id: purchaseForm.vendor_id,
        inventory_kind: purchaseForm.inventory_kind,
        product_id:
          purchaseForm.inventory_kind === "retail" ? purchaseForm.inventory_id || null : null,
        backbar_item_id:
          purchaseForm.inventory_kind === "backbar" ? purchaseForm.inventory_id || null : null,
        item_name: purchaseForm.item_name.trim(),
        brand: purchaseForm.brand.trim(),
        quantity,
        unit_cost: unitCost,
        purchase_date: purchaseForm.purchase_date,
        payment_method: purchaseForm.payment_method,
        payment_status: purchaseForm.payment_status,
        paid_amount: paidAmount,
        receipt_path: purchaseForm.receipt_path.trim() || null,
        is_demo: mode === "demo",
        inventory_applied: Boolean(purchaseForm.inventory_id),
      };
      if (demo) {
        const demoPurchase: Purchase = {
          id: purchaseForm.id || `demo-vendor-purchase-${Date.now()}`,
          ...payload,
          total_cost: quantity * unitCost,
          is_demo: true,
        };
        setPurchases((current) =>
          purchaseForm.id
            ? current.map((purchase) => (purchase.id === purchaseForm.id ? demoPurchase : purchase))
            : [demoPurchase, ...current],
        );
      } else if (purchaseForm.id)
        check(await db().from("lj_vendor_purchases").update(payload).eq("id", purchaseForm.id));
      else
        check(
          await db()
            .from("lj_vendor_purchases")
            .insert({ ...payload, created_by: (await db().auth.getUser()).data.user?.id || null }),
        );
      if (!purchaseForm.id && purchaseForm.inventory_id && mode === "live") {
        if (purchaseForm.inventory_kind === "retail") {
          const current = retail.find((item) => item.id === purchaseForm.inventory_id)?.stock || 0;
          check(
            await db()
              .from("lj_products")
              .update({ stock: current + quantity })
              .eq("id", purchaseForm.inventory_id),
          );
        } else
          check(
            await db().rpc("lj_adjust_backbar", {
              p_item: purchaseForm.inventory_id,
              p_delta: quantity,
              p_kind: "restock",
              p_reason: `Vendor purchase: ${purchaseForm.item_name.trim()}`,
            }),
          );
      }
      setPurchaseForm(null);
      setNotice(
        purchaseForm.id
          ? "Purchase corrected; audit history retained."
          : "Purchase recorded and inventory restocked.",
      );
      if (!demo) await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save purchase.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const voidPurchase = (item: Purchase) =>
    Alert.alert(
      "Void purchase?",
      "The original record remains in audit history. Inventory is not reversed automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Void",
          style: "destructive",
          onPress: () => {
            if (demo) {
              setPurchases((current) =>
                current.map((purchase) =>
                  purchase.id === item.id ? { ...purchase, payment_status: "voided" } : purchase,
                ),
              );
              setNotice("Demo purchase voided; audit history retained for this session.");
              return;
            }
            void db()
              .from("lj_vendor_purchases")
              .update({
                payment_status: "voided",
                voided_at: new Date().toISOString(),
                void_reason: "Voided by owner",
              })
              .eq("id", item.id)
              .then(
                () => {
                  setNotice("Purchase voided; audit history retained.");
                  return load();
                },
                (cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : "Unable to void purchase."),
              );
          },
        },
      ],
    );
  const csv = () =>
    void exportCsv(
      `lady-j-vendor-report-${range.from}-to-${range.to}.csv`,
      [report.headers, ...report.rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n"),
    );
  const pdf = () =>
    void ownerReportPdf(report)
      .then((content) =>
        exportReportPdf(`lady-j-vendor-report-${range.from}-to-${range.to}.pdf`, content),
      )
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Unable to create PDF."),
      );
  return (
    <View style={{ gap: 12 }}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Business"
          onPress={onBack}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            opacity: pressed ? 0.65 : 1,
            paddingVertical: 2,
          })}
        >
          <Icon name="ChevronLeft" size={16} color={c.mutedForeground} />
          <OwnerText size={13} muted>
            Back to Business
          </OwnerText>
        </Pressable>
      )}
      <View style={{ alignItems: "center" }}>
        <Txt size={20} bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          Vendors Management
        </Txt>
      </View>
      <View style={{ alignItems: "center" }}>
        <OwnerButton
          compact
          accent
          label="Add Vendor"
          icon="Plus"
          onPress={() => setVendorForm({ values: emptyVendor })}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <OwnerStat
          label="Spent Today"
          value={ttd(displayedToday)}
          icon="ReceiptText"
          compact
          valueSingleLine
          style={{ flex: 1, minWidth: 145, borderRadius: 11 }}
        />
        <OwnerStat
          label="This Month"
          value={ttd(displayedMonth)}
          icon="Wallet"
          compact
          valueSingleLine
          style={{ flex: 1, minWidth: 145, borderRadius: 11 }}
        />
        <OwnerStat
          label="Active Vendors"
          value={String(active.length)}
          icon="Building2"
          compact
          valueSingleLine
          style={{ flex: 1, minWidth: 145, borderRadius: 11 }}
        />
        <OwnerStat
          label="Paid Spending"
          value={ttd(total)}
          icon="Wallet"
          compact
          valueSingleLine
          style={{ flex: 1, minWidth: 145, borderRadius: 11 }}
        />
      </View>
      <Card style={{ gap: 5, padding: 6, borderRadius: 11 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search vendors"
          placeholderTextColor={c.mutedForeground}
          style={{
            minHeight: 42,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingHorizontal: 10,
            color: c.foreground,
          }}
        />
        <VendorFilterSelect
          label="Records & sort"
          value={`${mode}-${sort}`}
          options={[
            { value: "live-spend", label: "Live records · Highest spend" },
            { value: "live-name", label: "Live records · A–Z" },
            { value: "demo-spend", label: "Demo data · Highest spend" },
            { value: "demo-name", label: "Demo data · A–Z" },
          ]}
          onChange={(value) => {
            const [nextMode, nextSort] = value.split("-") as ["live" | "demo", "spend" | "name"];
            setMode(nextMode);
            setSort(nextSort);
            setSelected("all");
          }}
        />
        <VendorFilterSelect
          label="Purchase period"
          value={period}
          options={[
            { value: "Today", label: "Today" },
            { value: "7 Days", label: "Last 7 days" },
            { value: "30 Days", label: "Last 30 days" },
            { value: "Custom", label: "Custom range" },
          ]}
          onChange={(value) => setPeriod(value as typeof period)}
        />
        <VendorFilterSelect
          label="Inventory type"
          value={kind}
          options={[
            { value: "All", label: "All inventory" },
            { value: "Retail", label: "Retail" },
            { value: "Backbar", label: "Backbar" },
          ]}
          onChange={(value) => setKind(value as typeof kind)}
        />
        {period === "Custom" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <DateField label="From" value={from} onChange={setFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label="To" value={to} onChange={setTo} />
            </View>
          </View>
        )}
      </Card>
      {!!notice && (
        <OwnerText size={14} muted>
          {notice}
        </OwnerText>
      )}
      {!!error && <ErrorBox message={error} />}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        <View style={{ flex: 1, minWidth: 145 }}>
          <OwnerButton
            compact
            fill
            accent
            label="Record Purchase"
            icon="Plus"
            onPress={() =>
              setPurchaseForm(emptyPurchase(selected === "all" ? active[0]?.id || "" : selected))
            }
          />
        </View>
        <View style={{ flex: 1, minWidth: 145 }}>
          <OwnerButton
            compact
            fill
            secondary
            label="View Report"
            icon="ChartColumn"
            onPress={() => setReportOpen(true)}
          />
        </View>
        <View style={{ flex: 1, minWidth: 145 }}>
          <OwnerButton compact fill secondary label="Download PDF" icon="FileText" onPress={pdf} />
        </View>
        <View style={{ flex: 1, minWidth: 145 }}>
          <OwnerButton compact fill secondary label="Download CSV" icon="Download" onPress={csv} />
        </View>
      </View>
      {!!priceChanges.length && (
        <Card style={{ gap: 4, padding: 6, borderRadius: 11 }}>
          <OwnerText size={16} bold>
            Price tracking
          </OwnerText>
          {priceChanges.map((item) => {
            const change = item.current - item.previous;
            const percent = item.previous ? (change / item.previous) * 100 : 0;
            return (
              <View
                key={item.key}
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <OwnerText size={14} bold>
                    {item.product}
                  </OwnerText>
                  <Txt
                    size={13}
                    color={c.mutedForeground}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    Previous {ttd(item.previous)} · Current {ttd(item.current)}
                  </Txt>
                </View>
                <Txt
                  size={13}
                  color={c.mutedForeground}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {change >= 0 ? "↑" : "↓"} {ttd(Math.abs(change))} ({Math.abs(percent).toFixed(2)}
                  %) · {item.vendors} vendors
                </Txt>
              </View>
            );
          })}
        </Card>
      )}
      {items.map((item) => {
        const list = filtered.filter((row) => row.vendor_id === item.id),
          expanded = selected === item.id,
          spend = spendFor(item.id);
        return (
          <Card key={item.id} style={{ minHeight: 38, gap: 6, padding: 6, borderRadius: 11 }}>
            <Pressable
              accessibilityLabel={`${item.name}, ${list.length} purchases, ${ttd(spend)} spent`}
              accessibilityHint="Opens this vendor's purchases"
              onPress={() => setSelected(expanded ? "all" : item.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt bold size={15} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Txt>
              </View>
              <Txt
                size={13}
                color={c.mutedForeground}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {list.length} purchases · {ttd(spend)}
              </Txt>
              <Icon
                name={expanded ? "ChevronUp" : "ChevronRight"}
                size={19}
                color={c.mutedForeground}
              />
            </Pressable>
            {expanded && (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                  <OwnerButton
                    compact
                    secondary
                    label="Edit Vendor"
                    icon="Pencil"
                    onPress={() =>
                      setVendorForm({
                        id: item.id,
                        values: {
                          name: item.name,
                          company: item.company || "",
                          phone: item.phone || "",
                          email: item.email || "",
                          address: item.address || "",
                          contact_person: item.contact_person || "",
                          notes: item.notes || "",
                        },
                      })
                    }
                  />
                  <OwnerButton
                    compact
                    accent
                    label="Record Purchase"
                    icon="Plus"
                    onPress={() => setPurchaseForm(emptyPurchase(item.id))}
                  />
                  <OwnerButton
                    compact
                    secondary
                    label="Archive"
                    icon="Archive"
                    onPress={() => archive(item)}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  {list.length ? (
                    list.map((row) => (
                      <PurchaseLine
                        key={row.id}
                        row={row}
                        onEdit={() =>
                          setPurchaseForm({
                            id: row.id,
                            vendor_id: row.vendor_id,
                            inventory_kind: row.inventory_kind,
                            item_name: row.item_name,
                            brand: row.brand || "",
                            quantity: String(row.quantity),
                            unit_cost: String(row.unit_cost),
                            purchase_date: row.purchase_date,
                            payment_method: row.payment_method,
                            payment_status:
                              row.payment_status === "voided" ? "outstanding" : row.payment_status,
                            paid_amount: String(row.paid_amount || ""),
                            receipt_path: row.receipt_path || "",
                            inventory_id: row.product_id || row.backbar_item_id || "",
                          })
                        }
                        onVoid={() => voidPurchase(row)}
                      />
                    ))
                  ) : (
                    <OwnerText size={14} muted>
                      No purchases in this period.
                    </OwnerText>
                  )}
                </View>
              </>
            )}
          </Card>
        );
      })}
      {!items.length && (
        <Card style={{ padding: 9, borderRadius: 11 }}>
          <OwnerText muted size={15}>
            No vendors match this search.
          </OwnerText>
        </Card>
      )}
      <VendorModal form={vendorForm} setForm={setVendorForm} onSave={saveVendor} busy={busy} />
      <PurchaseModal
        form={purchaseForm}
        setForm={setPurchaseForm}
        vendors={active}
        retail={retail}
        backbar={backbar}
        onSave={savePurchase}
        busy={busy}
      />
      <ReportModal visible={reportOpen} report={report} onClose={() => setReportOpen(false)} />
    </View>
  );
}

function PurchaseLine({
  row,
  onEdit,
  onVoid,
}: {
  row: Purchase;
  onEdit: () => void;
  onVoid: () => void;
}) {
  const c = useColors(),
    [expanded, setExpanded] = useState(false);
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 8, gap: 4 }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <OwnerText size={15} bold>
            {row.purchase_date} · {row.item_name} · {row.quantity}
          </OwnerText>
          <Txt
            size={13}
            color={c.mutedForeground}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {row.inventory_kind === "retail" ? "Retail" : "Backbar"} · {ttd(Number(row.total_cost))}{" "}
            · {row.payment_status}
          </Txt>
        </View>
        <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={18} color={c.mutedForeground} />
      </Pressable>
      {expanded && (
        <>
          <Txt
            size={13}
            color={c.mutedForeground}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Brand {row.brand || "—"} · Unit cost {ttd(Number(row.unit_cost))} · {row.payment_method}
            {row.receipt_path ? " · Receipt saved" : ""}
          </Txt>
          {row.payment_status !== "voided" && (
            <View style={{ flexDirection: "row", gap: 7 }}>
              <OwnerButton compact secondary label="Edit" icon="Pencil" onPress={onEdit} />
              <OwnerButton compact destructive label="Void" icon="Ban" onPress={onVoid} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
function VendorModal({
  form,
  setForm,
  onSave,
  busy,
}: {
  form: { id?: string; values: VendorDraft } | null;
  setForm: (value: { id?: string; values: VendorDraft } | null) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const c = useColors();
  if (!form) return null;
  const change = (key: keyof VendorDraft) => (value: string) =>
    setForm({ ...form, values: { ...form.values, [key]: value } });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.48)", justifyContent: "flex-end" }}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Card style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: c.card }}>
            <OwnerText size={22} bold>
              {form.id ? "Edit Vendor" : "Add Vendor"}
            </OwnerText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Field label="Vendor name" value={form.values.name} onChange={change("name")} />
              <Field label="Company" value={form.values.company} onChange={change("company")} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Field
                label="Contact person"
                value={form.values.contact_person}
                onChange={change("contact_person")}
              />
              <Field
                label="Phone"
                value={form.values.phone}
                onChange={change("phone")}
                keyboardType="numeric"
              />
            </View>
            <Field
              label="Email"
              value={form.values.email}
              onChange={change("email")}
              keyboardType="email-address"
            />
            <Field
              label="Address"
              value={form.values.address}
              onChange={change("address")}
              multiline
            />
            <Field label="Notes" value={form.values.notes} onChange={change("notes")} multiline />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <OwnerButton fill secondary label="Cancel" onPress={() => setForm(null)} />
              <OwnerButton fill accent label="Save Vendor" busy={busy} onPress={onSave} />
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
function PurchaseModal({
  form,
  setForm,
  vendors,
  retail,
  backbar,
  onSave,
  busy,
}: {
  form: PurchaseDraft | null;
  setForm: (value: PurchaseDraft | null) => void;
  vendors: Vendor[];
  retail: Stock[];
  backbar: Stock[];
  onSave: () => void;
  busy: boolean;
}) {
  const c = useColors();
  if (!form) return null;
  const change = (key: keyof PurchaseDraft) => (value: string) =>
    setForm({ ...form, [key]: value });
  const stock = form.inventory_kind === "retail" ? retail : backbar,
    total = Number(form.quantity || 0) * Number(form.unit_cost || 0),
    outstanding = Math.max(
      0,
      total - (form.payment_status === "paid" ? total : Number(form.paid_amount || 0)),
    );
  const choose = (id: string) => {
    const item = stock.find((entry) => entry.id === id);
    setForm({
      ...form,
      inventory_id: id,
      item_name: item?.name || form.item_name,
      brand: item?.brand || form.brand,
    });
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.48)", justifyContent: "flex-end" }}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Card style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: c.card }}>
            <OwnerText size={22} bold>
              {form.id ? "Edit Purchase" : "Record Purchase"}
            </OwnerText>
            <OwnerText size={13} muted>
              Choose an inventory item to restock it with a new live purchase.
            </OwnerText>
            <OwnerText size={13} bold>
              Vendor
            </OwnerText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {vendors.map((item) => (
                <OwnerButton
                  key={item.id}
                  compact
                  label={item.name}
                  secondary={form.vendor_id !== item.id}
                  onPress={() => change("vendor_id")(item.id)}
                />
              ))}
            </View>
            <OwnerText size={13} bold>
              Inventory
            </OwnerText>
            <Choices
              values={["retail", "backbar"] as const}
              value={form.inventory_kind}
              onChange={(value) => setForm({ ...form, inventory_kind: value, inventory_id: "" })}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {stock.map((item) => (
                <OwnerButton
                  key={item.id}
                  compact
                  label={item.name}
                  secondary={form.inventory_id !== item.id}
                  onPress={() => choose(item.id)}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Field label="Product" value={form.item_name} onChange={change("item_name")} />
              <Field label="Brand" value={form.brand} onChange={change("brand")} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Field
                label="Quantity"
                value={form.quantity}
                onChange={change("quantity")}
                keyboardType="numeric"
              />
              <Field
                label="Unit cost (TTD)"
                value={form.unit_cost}
                onChange={change("unit_cost")}
                keyboardType="numeric"
              />
              <Field label="Date" value={form.purchase_date} onChange={change("purchase_date")} />
            </View>
            <OwnerText size={13} bold>
              Payment status
            </OwnerText>
            <Choices
              values={["paid", "partial", "outstanding"] as const}
              value={form.payment_status}
              onChange={(value) => setForm({ ...form, payment_status: value })}
            />
            {form.payment_status !== "paid" && (
              <Field
                label="Paid amount (TTD)"
                value={form.paid_amount}
                onChange={change("paid_amount")}
                keyboardType="numeric"
              />
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Field
                label="Payment method"
                value={form.payment_method}
                onChange={change("payment_method")}
              />
              <Field
                label="Receipt reference (optional)"
                value={form.receipt_path}
                onChange={change("receipt_path")}
              />
            </View>
            <View style={{ padding: 10, borderRadius: 10, backgroundColor: c.muted, gap: 2 }}>
              <OwnerText size={16} bold>
                Total {ttd(total)}
              </OwnerText>
              {form.payment_status !== "paid" && (
                <OwnerText size={13} muted>
                  Outstanding {ttd(outstanding)}
                </OwnerText>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <OwnerButton fill secondary label="Cancel" onPress={() => setForm(null)} />
              <OwnerButton
                fill
                accent
                label={form.id ? "Save Changes" : "Save Purchase"}
                busy={busy}
                onPress={onSave}
              />
            </View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
function ReportModal({
  visible,
  report,
  onClose,
}: {
  visible: boolean;
  report: ReportDocument;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ alignItems: "center" }}>
            <OwnerButton
              compact
              centered
              secondary
              label="← Back to Vendor Management"
              onPress={onClose}
            />
          </View>
          <OwnerText size={26} bold>
            Vendor Spending Report
          </OwnerText>
          <OwnerText size={14} muted>
            {report.range.from} to {report.range.to} ·{" "}
            {report.sample ? "Demo data" : "Live records"}
          </OwnerText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {report.summary.map((item) => (
              <OwnerStat
                key={item.label}
                label={item.label}
                value={String(item.value)}
                icon="ReceiptText"
                style={{ flex: 1, minWidth: 145, borderRadius: 11, padding: 12 }}
              />
            ))}
          </View>
          {report.rows.map((row, index) => (
            <Card key={`${row[0]}-${index}`} style={{ gap: 3, padding: 11, borderRadius: 11 }}>
              <OwnerText size={15} bold>
                {String(row[0])} · {String(row[1])}
              </OwnerText>
              <OwnerText size={14}>
                {String(row[2])} · {String(row[4])} · {String(row[6])}
              </OwnerText>
              <OwnerText size={13} muted>
                {String(row[3])} · {String(row[5])} · {String(row[7])}
              </OwnerText>
            </Card>
          ))}
          {!report.rows.length && (
            <Card style={{ padding: 16, borderRadius: 11 }}>
              <OwnerText muted>No transactions match these filters.</OwnerText>
            </Card>
          )}
          <View style={{ alignItems: "center" }}>
            <OwnerButton
              compact
              centered
              secondary
              label="← Back to Vendor Management"
              onPress={onClose}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
