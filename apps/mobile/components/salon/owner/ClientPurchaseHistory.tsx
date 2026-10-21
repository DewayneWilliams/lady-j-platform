import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Appointment, Transaction, dateLabel, money, timeLabel } from "@/lib/salon/types";
import { formatDuration } from "@/lib/salon/duration";
import { Card, useColors } from "../ui";
import { OwnerStatus, OwnerText } from "./OwnerUI";

export default function ClientPurchaseHistory({
  customerId,
  appointments,
  transactions,
}: {
  customerId: string;
  appointments: Appointment[];
  transactions: Transaction[];
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = appointments
    .filter((v) => v.customer_id === customerId && v.kind !== "block")
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id));

  return (
    <View style={{ gap: 12, marginTop: 12, marginBottom: 12 }}>
      <OwnerText size={24} bold>
        Service History
      </OwnerText>
      {entries.length === 0 && <OwnerText muted>No services recorded.</OwnerText>}
      {entries.map((entry) => {
        const open = expanded === entry.id;
        const service = entry.services.map((item) => item.name).join(", ");
        const payments = transactions.filter(
          (transaction) => transaction.appointment_id === entry.id,
        );
        const received = payments
          .filter((transaction) => transaction.status === "verified")
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        return (
          <Card key={entry.id} style={{ padding: 0, gap: 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${dateLabel(entry.starts_at)}: ${service}`}
              accessibilityState={{ expanded: open }}
              aria-expanded={open}
              onPress={() => setExpanded(open ? null : entry.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 58,
              }}
            >
              <OwnerText size={16} muted>
                {dateLabel(entry.starts_at)}
              </OwnerText>
              <View style={{ flex: 1, minWidth: 0 }}>
                <OwnerText size={16} bold>
                  {service}
                </OwnerText>
              </View>
              <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color={c.foreground} />
            </Pressable>
            {open && (
              <View style={{ padding: 16, gap: 12, borderTopWidth: 1, borderColor: c.border }}>
                <OwnerText size={16}>
                  {dateLabel(entry.starts_at, { year: "numeric" })} · {timeLabel(entry.starts_at)}
                </OwnerText>
                <OwnerText size={16}>{service}</OwnerText>
                <OwnerText size={16}>Deposit Required: {money(entry.deposit)}</OwnerText>
                <OwnerText size={16}>
                  Remaining Balance: {money(Math.max(0, entry.total - received))}
                </OwnerText>
                {payments.map((payment) => (
                  <OwnerText key={payment.id} size={16} muted>
                    {payment.method === "bank" ? "Bank transfer" : payment.method} ·{" "}
                    {payment.status} · Reference {payment.reference || "not supplied"}
                  </OwnerText>
                ))}
                <OwnerText size={16}>
                  {formatDuration(
                    (new Date(entry.ends_at).getTime() - new Date(entry.starts_at).getTime()) /
                      60000,
                  )}
                </OwnerText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <OwnerStatus status={entry.status} />
                  <OwnerText size={18} bold>
                    {money(entry.total)}
                  </OwnerText>
                </View>
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}
