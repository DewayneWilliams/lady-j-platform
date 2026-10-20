import { monthNames } from "@/lib/salon/dates";
import React, { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button } from "@/components/ui/button";
import {
  ownerReports,
  buildOwnerReport,
  ownerReportCsv,
  validateReportRange,
  type OwnerReport,
  type ReportRange,
  type ReportRecords,
} from "@/lib/salon/ownerReports";
import { loadOwnerReportRecords } from "@/lib/salon/ownerReportData";
import { exportCsv } from "@/lib/salon/csvExport";
import { exportReportPdf } from "@/lib/salon/reportFile";
import { salonDayKey } from "@/lib/salon/ownerToday";
import { useSalon } from "@/lib/salon/SalonProvider";
import { DateField, ChoiceWheelField } from "../DateFields";
import { ButtonLabel, Card, Chip, ErrorBox, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

type Period = "Date Range" | "Month" | "Year";
export default function DownloadReports(records: Omit<ReportRecords, "expenses">) {
  const c = useColors(),
    s = useSalon(),
    today = salonDayKey();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const saving = useRef(false);
  const [period, setPeriod] = useState<Period>("Month");
  const [from, setFrom] = useState(today.slice(0, 7) + "-01"),
    [to, setTo] = useState(today);
  const [month, setMonth] = useState(String(Number(today.slice(5, 7)))),
    [year, setYear] = useState(today.slice(0, 4));
  function range(): ReportRange {
    if (period === "Date Range") {
      const value = { from, to };
      validateReportRange(value);
      return value;
    }
    if (!/^\d{4}$/.test(year) || Number(year) < 1900)
      throw new Error("Enter a valid four-digit year.");
    if (period === "Year") return { from: year + "-01-01", to: year + "-12-31" };
    if (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12)
      throw new Error("Choose a month from January to December.");
    const prefix = year + "-" + String(Number(month)).padStart(2, "0");
    const end = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    return { from: prefix + "-01", to: prefix + "-" + String(end).padStart(2, "0") };
  }
  async function download(kind: OwnerReport, format: "CSV" | "PDF") {
    if (saving.current) return;
    setError("");
    setNotice("");
    try {
      const selected = range();
      saving.current = true;
      setBusy(kind + format);
      const data: ReportRecords = records.demo
        ? { ...records, expenses: [] }
        : await loadOwnerReportRecords();
      const report = buildOwnerReport(
        kind,
        data,
        selected,
        s.settings?.business_name || "Lady J Salon & Day Spa",
      );
      const filename = `lady-j-${kind.toLowerCase().replace(/[^a-z]+/g, "-")}-${records.demo ? "sample-" : ""}${selected.from}-to-${selected.to}.${format.toLowerCase()}`;
      if (format === "CSV") await exportCsv(filename, ownerReportCsv(report));
      else {
        const { ownerReportPdf } = await import("@/lib/salon/ownerReportPdf");
        await exportReportPdf(
          filename,
          await ownerReportPdf(report, { gold: c.headerGold!, accent: c.brandAccentFill! }),
        );
      }
      setNotice(`${kind} ${format} ready.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to download report.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }
  return (
    <View style={{ gap: 20 }}>
      <OwnerText size={28} bold>
        Download Reports
      </OwnerText>
      <OwnerText size={16} muted>
        {records.demo ? "Sample data" : "Private owner reports · Live records"}
      </OwnerText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(["Date Range", "Month", "Year"] as const).map((value) => (
          <Chip
            key={value}
            label={value}
            selected={period === value}
            onPress={() => {
              if (!busy) {
                setPeriod(value);
                setError("");
                setNotice("");
              }
            }}
          />
        ))}
      </View>
      {period === "Date Range" ? (
        <View>
          <DateField label="From Date" value={from} onChange={setFrom} />
          <DateField label="To Date" value={to} onChange={setTo} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {period === "Month" && (
            <View style={{ flex: 1, minWidth: 0 }}>
              <ChoiceWheelField
                label="Month"
                value={month}
                onChange={setMonth}
                disabled={!!busy}
                options={monthNames.map((name, i) => ({ value: String(i + 1), label: name }))}
              />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <ChoiceWheelField
              label="Year"
              value={year}
              onChange={setYear}
              disabled={!!busy}
              options={Array.from(
                { length: Math.max(1, Number(today.slice(0, 4)) - 1899 + 11) },
                (_, i) => ({ value: String(1900 + i), label: String(1900 + i) }),
              )}
            />
          </View>
        </View>
      )}
      {!!error && <ErrorBox message={error} />}
      {!!notice && <OwnerText size={16}>{notice}</OwnerText>}
      {!!busy && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <ActivityIndicator color={c.brandAccent} />
          <OwnerText size={16}>Preparing your report</OwnerText>
        </View>
      )}
      {ownerReports.map((kind) => (
        <Card key={kind} style={{ gap: 16 }}>
          <OwnerText size={22} bold>
            {kind}
          </OwnerText>
          <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12 }}>
            {(["CSV", "PDF"] as const).map((format) => (
              <Button
                key={format}
                accessibilityLabel={`Download ${kind} ${format}`}
                disabled={!!busy}
                onPress={() => void download(kind, format)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 58,
                  height: "auto",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: format === "CSV" ? c.tertiary : c.card,
                  borderWidth: 1,
                  borderColor: format === "CSV" ? c.tertiary : c.border,
                }}
              >
                <ButtonLabel
                  size={18}
                  color={format === "CSV" ? c.tertiaryForeground : c.foreground}
                >
                  Download {format}
                </ButtonLabel>
              </Button>
            ))}
          </View>
          {kind === "Staff Performance" && (
            <OwnerText size={15} muted>
              No staff assignments are recorded. This report shows unassigned salon totals.
            </OwnerText>
          )}
          {kind === "Inventory" && (
            <OwnerText size={15} muted>
              Current stock, with paid-order activity for the selected dates.
            </OwnerText>
          )}
          {kind === "Expenses & Profit" && (
            <OwnerText size={15} muted>
              Cash received minus recorded expenses. Accounting profit requires complete costs.
            </OwnerText>
          )}
        </Card>
      ))}
    </View>
  );
}
