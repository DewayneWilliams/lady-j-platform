import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { db, check, asRows } from "@/lib/salon/client";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { Expense } from "@/lib/salon/ownerAssistant";
import { Appointment, Purchase, Transaction, money } from "@/lib/salon/types";
import { revenueLines, salonDate } from "@/lib/salon/revenueReport";
import { exportCsv } from "@/lib/salon/csvExport";
import { DateField } from "../DateFields";
import { Card, Chip, ErrorBox, Field } from "../ui";
import { OwnerButton, OwnerStat, OwnerText, OwnerTitle } from "./OwnerUI";
const categories = ["Supplies", "Rent", "Utilities", "Staff", "Equipment", "Other"];
const csvCell = (value: unknown) =>
  '"' +
  String(value)
    .replace(/^(\s*[=+\-@]|[\t\r\n])/, (match) => "'" + match)
    .replace(/"/g, '""') +
  '"';
export default function ExpensesPanel({
  demo,
  transactions,
  appointments,
  purchases,
}: {
  demo: boolean;
  transactions: Transaction[];
  appointments: Appointment[];
  purchases: Purchase[];
}) {
  const today = salonDate(new Date().toISOString());
  const demoExpenses: Expense[] = [
    ["Supplies", "Esther event styling supplies", 780, "DEMO-ESTHER"],
    ["Equipment", "Solomon workstation maintenance", 450, "DEMO-SOLOMON"],
    ["Utilities", "Noah water service", 325, "DEMO-NOAH"],
    ["Staff", "Ruth training session", 600, "DEMO-RUTH"],
    ["Rent", "Bethany studio allocation", 2400, "DEMO-BETHANY"],
    ["Other", "David music licensing sample", 175, "DEMO-DAVID"],
  ].map(([expenseCategory, expenseDescription, expenseAmount, expenseReference], index) => ({
    id: `demo-expense-${index + 1}`,
    spent_on: `${today.slice(0, 8)}${String(Math.max(1, Number(today.slice(8, 10)) - index)).padStart(2, "0")}`,
    category: String(expenseCategory),
    description: String(expenseDescription),
    amount: Number(expenseAmount),
    reference: String(expenseReference),
  }));
  const [month, setMonth] = useState(today.slice(0, 7)),
    [expenses, setExpenses] = useState<Expense[]>(demo ? demoExpenses : []),
    [date, setDate] = useState(today),
    [category, setCategory] = useState("Supplies"),
    [description, setDescription] = useState(""),
    [amount, setAmount] = useState(""),
    [reference, setReference] = useState(""),
    [adding, setAdding] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [confirm, setConfirm] = useState(""),
    [page, setPage] = useState(0);
  const first = month + "-01";
  const d = new Date(first + "T12:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  const next = d.toISOString().slice(0, 10);
  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    setError("");
    try {
      const rows: Expense[] = [];
      for (let offset = 0; ; offset += 1000) {
        const part = asRows<Expense>(
          check(
            await db()
              .from("lj_expenses")
              .select("*")
              .gte("spent_on", first)
              .lt("spent_on", next)
              .order("spent_on", { ascending: false })
              .order("id")
              .range(offset, offset + 999),
          ),
          "Expenses",
        );
        rows.push(...part);
        if (part.length < 1000) break;
      }
      setExpenses(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [demo, first, next]);
  useEffect(() => {
    void load();
    setPage(0);
  }, [load]);
  useForegroundRefresh(load, !demo);
  const rows = expenses.filter((e) => e.spent_on >= first && e.spent_on < next);
  const spentCents = rows.reduce((sum, e) => sum + Math.round(Number(e.amount) * 100), 0);
  const receivedCents = revenueLines(transactions, appointments, purchases)
    .filter((line) => line.date >= first && line.date < next)
    .reduce((sum, line) => sum + line.cents, 0);
  const save = async () => {
    if (
      !description.trim() ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      Number(amount) <= 0 ||
      Number(amount) > 9999999999.99 ||
      date > today
    ) {
      setError(
        "Enter a description, an amount greater than zero with up to two decimal places, and a date up to today.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const entry = {
        spent_on: date,
        category,
        description: description.trim().slice(0, 300),
        amount: Number(amount),
        reference: reference.trim().slice(0, 150),
      };
      if (demo) setExpenses((old) => [{ ...entry, id: "sample-" + Date.now() }, ...old]);
      else {
        check(await db().from("lj_expenses").insert(entry));
        await load();
      }
      setMonth(date.slice(0, 7));
      setAdding(false);
      setDescription("");
      setAmount("");
      setReference("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this expense.");
    } finally {
      setBusy(false);
    }
  };
  const move = (delta: number) => {
    const value = new Date(first + "T12:00Z");
    value.setUTCMonth(value.getUTCMonth() + delta);
    setMonth(value.toISOString().slice(0, 7));
  };
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    current = Math.min(page, pages - 1);
  return (
    <View style={{ gap: 20 }}>
      <OwnerTitle
        title="Expenses & cash overview"
        description={
          demo
            ? "Monthly expenses"
            : "Keep everyday salon spending alongside your recorded receipts."
        }
        action={
          <OwnerButton
            label={adding ? "Close form" : "Add expense"}
            icon="Plus"
            onPress={() => setAdding(!adding)}
          />
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <OwnerButton label="Previous month" secondary onPress={() => move(-1)} />
        <OwnerText bold>
          {new Date(first + "T12:00Z").toLocaleDateString("en-TT", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </OwnerText>
        <OwnerButton
          label="Next month"
          secondary
          disabled={month >= today.slice(0, 7)}
          onPress={() => move(1)}
        />
      </View>
      {!!error && <ErrorBox message={error} retry={() => void load()} />}
      {adding && (
        <Card style={{ gap: 14 }}>
          <DateField label="Date paid" value={date} onChange={setDate} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categories.map((value) => (
              <Chip
                key={value}
                label={value}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
          <Field label="What did you pay for?" value={description} onChangeText={setDescription} />
          <Field
            label="Amount Paid"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Field
            label="Receipt reference (optional)"
            value={reference}
            onChangeText={setReference}
          />
          <OwnerButton
            label={busy ? "Saving" : "Save expense"}
            disabled={busy}
            onPress={() => void save()}
          />
        </Card>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        <OwnerStat
          label="Net receipts"
          value={money(receivedCents / 100)}
          icon="Wallet"
          style={{ flex: 1, minWidth: 220 }}
        />
        <OwnerStat
          label="Expenses recorded"
          value={money(spentCents / 100)}
          icon="Receipt"
          style={{ flex: 1, minWidth: 220 }}
        />
        <OwnerStat
          label="Cash after recorded expenses"
          value={money((receivedCents - spentCents) / 100)}
          icon="ChartNoAxesCombined"
          style={{ flex: 1, minWidth: 220 }}
        />
      </View>
      <OwnerText size={17} muted>
        This is a cash overview, not an accounting profit figure. It includes recorded receipts,
        refunds and expenses only; taxes, unpaid bills and inventory valuation are not calculated.
      </OwnerText>
      <OwnerButton
        label="Download expenses CSV"
        secondary
        icon="Download"
        disabled={loading || busy}
        onPress={() => {
          setBusy(true);
          const csv =
            "\uFEFF" +
            [
              [
                "Data",
                "Date paid",
                "Category",
                "Description",
                "Amount TTD",
                "Reference",
                "Entry ID",
              ],
              ...rows.map((e) => [
                demo ? "Sample data" : "Live records",
                e.spent_on,
                e.category,
                e.description,
                e.amount,
                e.reference,
                e.id,
              ]),
            ]
              .map((row) => row.map(csvCell).join(","))
              .join("\r\n");
          void exportCsv("lady-j-" + (demo ? "sample-" : "") + "expenses-" + month + ".csv", csv)
            .catch(() => setError("Unable to export the expenses. Please try again."))
            .finally(() => setBusy(false));
        }}
      />
      {loading ? (
        <OwnerText muted>Loading expenses</OwnerText>
      ) : !rows.length ? (
        <Card>
          <OwnerText muted>
            No expenses recorded for this month. Add payments as you make them to keep this overview
            useful.
          </OwnerText>
        </Card>
      ) : (
        rows.slice(current * 20, current * 20 + 20).map((entry) => (
          <Card key={entry.id} style={{ gap: 10 }}>
            <OwnerText bold>{entry.description}</OwnerText>
            <OwnerText>
              {money(entry.amount)} · {entry.category}
            </OwnerText>
            <OwnerText size={17} muted>
              {entry.spent_on}
              {entry.reference ? " · " + entry.reference : ""}
            </OwnerText>
            <OwnerButton
              label={confirm === entry.id ? "Confirm removal" : "Remove incorrect entry"}
              secondary
              disabled={busy}
              onPress={() => {
                if (confirm !== entry.id) {
                  setConfirm(entry.id);
                  return;
                }
                setBusy(true);
                setError("");
                void (async () => {
                  try {
                    if (demo) setExpenses((old) => old.filter((e) => e.id !== entry.id));
                    else {
                      check(await db().from("lj_expenses").delete().eq("id", entry.id));
                      await load();
                    }
                    setConfirm("");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to remove this entry.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            />
            {confirm === entry.id && (
              <OwnerButton label="Keep entry" secondary onPress={() => setConfirm("")} />
            )}
          </Card>
        ))
      )}
      {pages > 1 && (
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <OwnerButton
            label="Previous"
            secondary
            disabled={current === 0}
            onPress={() => setPage(current - 1)}
          />
          <OwnerText>
            Page {current + 1} of {pages}
          </OwnerText>
          <OwnerButton
            label="Next"
            secondary
            disabled={current + 1 >= pages}
            onPress={() => setPage(current + 1)}
          />
        </View>
      )}
    </View>
  );
}
