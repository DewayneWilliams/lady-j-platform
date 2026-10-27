import { monthNames } from "@/lib/salon/dates";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import {
  ownerReports,
  buildOwnerReport,
  ownerReportCsv,
  validateReportRange,
  type OwnerReport,
  type ReportDocument,
  type ReportRange,
  type ReportRecords,
} from "@/lib/salon/ownerReports";
import { loadOwnerReportRecords } from "@/lib/salon/ownerReportData";
import { exportCsv } from "@/lib/salon/csvExport";
import { exportReportPdf } from "@/lib/salon/reportFile";
import { salonDayKey } from "@/lib/salon/ownerToday";
import { useSalon } from "@/lib/salon/SalonProvider";
import { DateField, ChoiceWheelField } from "../DateFields";
import { ButtonLabel, Card, Chip, ErrorBox, Txt, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
import VendorSpendingPanel from "./VendorSpendingPanel";

type Period = "Date Range" | "Month" | "Year";

const reportAmount = (value: string | number) =>
  Number(String(value).replace(/[^0-9.-]/g, "")) || 0;

function ReportViewer({ report, onClose }: { report: ReportDocument; onClose: () => void }) {
  const c = useColors();
  const largest = Math.max(1, ...report.summary.map((item) => Math.abs(reportAmount(item.value))));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            backgroundColor: "#111111",
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt serif size={25} color="#FFFFFF" numberOfLines={1}>
              {report.title}
            </Txt>
            <Txt size={12} color="#E5E7EB">
              {report.range.from} to {report.range.to} · TTD
            </Txt>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close report"
            onPress={onClose}
            style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 8 }}
          >
            <Txt bold color="#FFFFFF">Close</Txt>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: "center", minHeight: 32, justifyContent: "center", paddingHorizontal: 8 }}>
            <Txt size={13} color={c.mutedForeground}>← Back to Business Reports</Txt>
          </Pressable>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {report.summary.map((item, index) => {
              const amount = Math.abs(reportAmount(item.value));
              return (
                <View
                  key={item.label}
                  style={{
                    flexGrow: 1,
                    flexBasis: "46%",
                    minWidth: 140,
                    borderRadius: 14,
                    padding: 12,
                    gap: 5,
                    backgroundColor: index === 0 ? c.goldSurface : c.card,
                    borderWidth: 1,
                    borderColor: index === 0 ? c.goldBorder : c.border,
                  }}
                >
                  <Txt size={12} color={c.mutedForeground} numberOfLines={1}>{item.label}</Txt>
                  <Txt size={19} bold numberOfLines={1} adjustsFontSizeToFit>{String(item.value)}</Txt>
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: c.muted, overflow: "hidden" }}>
                    <View style={{ width: `${Math.min(100, (amount / largest) * 100)}%`, height: 3, backgroundColor: index === 0 ? c.tertiary : c.brandAccent }} />
                  </View>
                </View>
              );
            })}
          </View>
          {report.notes.map((note) => (
            <Txt key={note} size={12} color={c.mutedForeground}>{note}</Txt>
          ))}
          <View style={{ gap: 8 }}>
            <Txt serif size={22}>Report detail</Txt>
            {!report.rows.length && <Txt color={c.mutedForeground}>No records for this period.</Txt>}
            {report.rows.map((row, rowIndex) => (
              <View
                key={`${rowIndex}-${String(row[0])}`}
                style={{ borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, padding: 12, gap: 7 }}
              >
                {row.map((value, column) => (
                  <View key={report.headers[column]} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                    <Txt size={12} color={c.mutedForeground} style={{ width: 104 }}>{report.headers[column]}</Txt>
                    <Txt size={13} bold style={{ flex: 1, textAlign: "right" }}>{String(value)}</Txt>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: "center", minHeight: 32, justifyContent: "center", paddingHorizontal: 8 }}>
            <Txt size={13} color={c.mutedForeground}>← Back to Business Reports</Txt>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DownloadReports(records: Omit<ReportRecords, "expenses">) {
  const c = useColors(),
    s = useSalon(),
    today = salonDayKey();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ReportDocument | null>(null);
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
  async function prepare(kind: OwnerReport) {
    const selected = range();
    const data: ReportRecords = records.demo
      ? { ...records, expenses: [] }
      : await loadOwnerReportRecords();
    return {
      selected,
      report: buildOwnerReport(kind, data, selected, s.settings?.business_name || "Lady J Salon & Day Spa"),
    };
  }
  async function view(kind: OwnerReport) {
    if (saving.current) return;
    setError("");
    try {
      saving.current = true;
      setBusy(kind + "View");
      setPreview((await prepare(kind)).report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to prepare report preview.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }
  async function download(kind: OwnerReport, format: "CSV" | "PDF") {
    if (saving.current) return;
    setError("");
    setNotice("");
    try {
      saving.current = true;
      setBusy(kind + format);
      const { selected, report } = await prepare(kind);
      const filename = `lady-j-${kind.toLowerCase().replace(/[^a-z]+/g, "-")}-${records.demo ? "sample-" : ""}${selected.from}-to-${selected.to}.${format.toLowerCase()}`;
      if (format === "CSV") await exportCsv(filename, ownerReportCsv(report));
      else {
        const { ownerReportPdf } = await import("@/lib/salon/ownerReportPdf");
        await exportReportPdf(
          filename,
          await ownerReportPdf(report),
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
    <View style={{ gap: 10 }}>
      <OwnerText size={26} bold>
        Business Reports
      </OwnerText>
      <OwnerText size={14} muted>
        {records.demo ? "Sample data" : "Private owner reports · Live records"}
      </OwnerText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
        <View style={{ gap: 0 }}>
          <DateField label="From Date" value={from} onChange={setFrom} />
          <DateField label="To Date" value={to} onChange={setTo} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
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
          <OwnerText size={14}>Preparing your report</OwnerText>
        </View>
      )}
      {ownerReports.map((kind) => (
        <Card key={kind} style={{ gap: 7, paddingHorizontal: 12, paddingVertical: 9 }}>
          <OwnerText size={18} bold>
            {kind}
          </OwnerText>
          <Button
            accessibilityLabel={`View ${kind}`}
            disabled={!!busy}
            onPress={() => void view(kind)}
            style={{ minHeight: 42, borderRadius: 10, backgroundColor: c.brandAccentFill, borderWidth: 1, borderColor: c.brandAccentFill }}
          >
            <ButtonLabel size={16} color="#FFFFFF">View Report</ButtonLabel>
          </Button>
          <View style={{ flexDirection: "row", alignItems: "stretch", gap: 10 }}>
            {(["PDF", "CSV"] as const).map((format) => (
              <Button
                key={format}
                accessibilityLabel={`Download ${kind} ${format}`}
                disabled={!!busy}
                onPress={() => void download(kind, format)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 42,
                  height: "auto",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#111111",
                  borderWidth: 1,
                  borderColor: "#111111",
                }}
              >
                <ButtonLabel
                  size={15}
                  color="#FFFFFF"
                >
                  Download {format}
                </ButtonLabel>
              </Button>
            ))}
          </View>
          {kind === "Staff Performance" && (
            <OwnerText size={12} muted>
              No staff assignments are recorded. This report shows unassigned salon totals.
            </OwnerText>
          )}
          {kind === "Inventory" && (
            <OwnerText size={12} muted>
              Current stock, with paid-order activity for the selected dates.
            </OwnerText>
          )}
          {kind === "Expenses & Profit" && (
            <OwnerText size={12} muted>
              Cash received minus recorded expenses. Accounting profit requires complete costs.
            </OwnerText>
          )}
        </Card>
      ))}
      <VendorSpendingPanel />
      {!!preview && <ReportViewer report={preview} onClose={() => setPreview(null)} />}
    </View>
  );
}
