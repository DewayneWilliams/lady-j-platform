import { DateField } from "../DateFields";
import React, { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Transaction, Appointment, Product, Purchase, money, dateLabel } from "@/lib/salon/types";
import {
  revenueLines,
  summarizeRevenue,
  revenueCsv,
  salonDate,
  validReportDate,
  RevenueCategory,
} from "@/lib/salon/revenueReport";
import { exportCsv } from "@/lib/salon/csvExport";
import { Card, ErrorBox, useColors } from "../ui";
import { OwnerButton, OwnerStat, OwnerText, OwnerTitle } from "./OwnerUI";
export default function RevenuePanel({
  transactions,
  appointments,
  purchases,
  demo,
}: {
  transactions: Transaction[];
  appointments: Appointment[];
  products: Product[];
  purchases: Purchase[];
  demo: boolean;
}) {
  const c = useColors(),
    { width } = useWindowDimensions();
  const today = salonDate(new Date().toISOString());
  const [period, setPeriod] = useState("This month"),
    [from, setFrom] = useState(today.slice(0, 7) + "-01"),
    [to, setTo] = useState(today),
    [category, setCategory] = useState<RevenueCategory | "All">("All"),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState("");
  const range = useMemo(() => {
    if (period === "Custom") return { from, to };
    if (period === "This month") return { from: today.slice(0, 7) + "-01", to: today };
    if (period === "This year") return { from: today.slice(0, 4) + "-01-01", to: today };
    const date = new Date(today + "T12:00Z");
    date.setUTCDate(date.getUTCDate() - (period === "7 days" ? 6 : 29));
    return { from: date.toISOString().slice(0, 10), to: today };
  }, [period, from, to, today]);
  const invalid =
    !validReportDate(range.from) || !validReportDate(range.to) || range.from > range.to;
  const allLines = useMemo(
    () => revenueLines(transactions, appointments, purchases),
    [transactions, appointments, purchases],
  );
  const rows = allLines.filter(
    (v) =>
      !invalid &&
      v.date >= range.from &&
      v.date <= range.to &&
      (category === "All" || v.category === category),
  );
  const summary = summarizeRevenue(rows);
  const promotionalDiscounts =
    appointments
      .filter(
        (appointment) =>
          salonDate(appointment.starts_at) >= range.from &&
          salonDate(appointment.starts_at) <= range.to &&
          !["cancelled", "no_show"].includes(appointment.status),
      )
      .reduce((total, appointment) => total + Number(appointment.discount_total || 0), 0) +
    purchases
      .filter(
        (purchase) =>
          salonDate(purchase.created_at) >= range.from &&
          salonDate(purchase.created_at) <= range.to,
      )
      .reduce((total, purchase) => total + Number(purchase.discount_total || 0), 0);
  const amount = (cents: number) => money(cents / 100);
  const formatDate = (v: string) =>
    dateLabel(v + "T12:00Z", { weekday: undefined, year: "numeric" });
  const download = async () => {
    setExporting(true);
    setError("");
    try {
      await exportCsv(
        `lady-j-${demo ? "sample-" : ""}revenue-${category.toLowerCase()}-${range.from}-to-${range.to}.csv`,
        revenueCsv(rows, range.from, range.to, demo),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be exported. Try again.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={{ gap: 24 }}>
      <OwnerTitle
        title="Revenue received"
        description={demo ? "Receipts and refunds" : "Cash received, clearly accounted for."}
      />
      <Card style={{ gap: 18 }}>
        <OwnerText size={24} bold>
          Report period
        </OwnerText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {["This month", "7 days", "30 days", "This year", "Custom"].map((v) => (
            <OwnerButton key={v} label={v} secondary={period !== v} onPress={() => setPeriod(v)} />
          ))}
        </View>
        {period === "Custom" && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {(
              [
                ["From date", from, setFrom],
                ["To date", to, setTo],
              ] as const
            ).map(([label, value, setValue]) => (
              <View key={label} style={{ flex: 1, minWidth: 180, gap: 8 }}>
                <DateField label={label} value={value} onChange={setValue} />
              </View>
            ))}
          </View>
        )}
        {invalid ? (
          <ErrorBox message="Choose a start date before the end date." />
        ) : (
          <OwnerText muted>
            {formatDate(range.from)} – {formatDate(range.to)} · TTD
          </OwnerText>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(
            [
              "All",
              "Services",
              "Products",
              "Workshops",
              ...(allLines.some((v) => v.category === "Other") ? ["Other"] : []),
            ] as (RevenueCategory | "All")[]
          ).map((v) => (
            <OwnerButton
              key={v}
              label={v === "All" ? "All revenue" : v}
              secondary={category !== v}
              onPress={() => setCategory(v)}
            />
          ))}
        </View>
        <OwnerButton
          label={exporting ? "Preparing CSV" : "Download CSV"}
          icon="Download"
          disabled={exporting || invalid}
          onPress={() => void download()}
        />
        {!!error && <ErrorBox message={error} />}
      </Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        <OwnerStat
          label="Money received"
          value={amount(summary.gross)}
          icon="Wallet"
          note="Confirmed receipts, including deposits"
          style={{ flex: 1, minWidth: 240 }}
        />
        <OwnerStat
          label="Refunds paid"
          value={amount(summary.refunds)}
          icon="ArrowUpRight"
          note="Refunds actually recorded as paid"
          style={{ flex: 1, minWidth: 240 }}
        />
        <OwnerStat
          label="Net received"
          value={amount(summary.net)}
          icon="ChartNoAxesCombined"
          note="Money received less refunds paid"
          style={{
            flex: 1,
            minWidth: 240,
            backgroundColor: c.goldSurface,
            borderColor: c.goldBorder,
          }}
        />
        <OwnerStat
          label="Promotional discounts"
          value={money(promotionalDiscounts)}
          icon="BadgePercent"
          note="Recorded separately from money received"
          style={{ flex: 1, minWidth: 240 }}
        />
      </View>
      <Card style={{ gap: 18 }}>
        <OwnerText size={26} bold>
          Revenue by category
        </OwnerText>
        <OwnerText muted>
          Separate views of services, boutique sales and academy workshops.
        </OwnerText>
        {summary.categories.map((v) => (
          <View
            key={v.category}
            style={{ gap: 8, paddingVertical: 18, borderTopWidth: 1, borderColor: c.border }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <OwnerText size={22} bold>
                {v.category}
              </OwnerText>
              <OwnerText size={26} bold>
                {amount(v.net)}
              </OwnerText>
            </View>
            <View
              style={{ height: 5, borderRadius: 3, backgroundColor: c.muted, overflow: "hidden" }}
            >
              <View
                style={{
                  height: 5,
                  width: `${summary.gross ? Math.min(100, (v.received / summary.gross) * 100) : 0}%`,
                  backgroundColor: c.tertiary,
                }}
              />
            </View>
            <OwnerText muted>
              {amount(v.received)} received · {amount(v.refunded)} refunded
            </OwnerText>
            <OwnerText muted>
              {v.receipts} {v.receipts === 1 ? "receipt" : "receipts"}
            </OwnerText>
          </View>
        ))}
        {!rows.length && (
          <OwnerText>
            No received payments in this period. Confirmed receipts will appear here automatically.
          </OwnerText>
        )}
      </Card>
      {!!summary.items.length && (
        <Card style={{ gap: 16 }}>
          <OwnerText size={26} bold>
            Service & item detail
          </OwnerText>
          <OwnerText muted>
            Net received, highest first. Shared payments are allocated using booked item prices.
          </OwnerText>
          {summary.items.slice(0, 12).map((v) => (
            <View
              key={v.category + v.item}
              style={{ gap: 6, borderTopWidth: 1, borderColor: c.border, paddingTop: 16 }}
            >
              <OwnerText bold>{v.item}</OwnerText>
              <OwnerText muted>{v.category}</OwnerText>
              <OwnerText size={24}>{amount(v.net)}</OwnerText>
            </View>
          ))}
          {summary.items.length > 12 && (
            <OwnerText muted>
              Showing 12 items. The CSV includes every item in this report.
            </OwnerText>
          )}
        </Card>
      )}
      <Card style={{ gap: 18 }}>
        <OwnerText size={26} bold>
          Receipt activity
        </OwnerText>
        {rows.slice(0, 10).map((v, i) => (
          <View
            key={v.transactionId + v.item + v.type + i}
            style={{
              gap: 7,
              paddingTop: 16,
              borderTopWidth: 1,
              borderColor: c.border,
              flexDirection: width >= 900 ? "row" : "column",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <OwnerText bold>{v.item}</OwnerText>
              <OwnerText muted>
                {formatDate(v.date)} · {v.category}
              </OwnerText>
              <OwnerText muted>
                {v.type} · {v.method === "bank" ? "Bank transfer" : v.method}{" "}
                {v.reference ? "· " + v.reference : ""}
              </OwnerText>
            </View>
            <OwnerText size={24} bold>
              {amount(v.cents)}
            </OwnerText>
          </View>
        ))}
        <OwnerText muted>
          {rows.length
            ? `Showing ${Math.min(rows.length, 10)} of ${rows.length} item entries. Download the CSV for the complete report.`
            : "No receipt activity yet."}
        </OwnerText>
      </Card>
      <OwnerText muted>
        Cash received reporting, not profit. Deposits count when received and refunds when paid.
        Credits remain in Payments. Pending requests are excluded.
      </OwnerText>
      {rows.some((v) => v.dateBasis === "Request date fallback") && (
        <OwnerText muted>
          Older records without a confirmed receipt or refund date use the original request date.
          These entries are identified in the CSV.
        </OwnerText>
      )}
    </View>
  );
}
