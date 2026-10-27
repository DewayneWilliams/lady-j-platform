import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Appointment, Transaction, dateLabel, money, timeLabel } from "@/lib/salon/types";
import { formatDuration } from "@/lib/salon/duration";
import { Card, Txt, useColors } from "../ui";
import { OwnerStatus, OwnerText } from "./OwnerUI";

export default function ClientPurchaseHistory({
  customerId,
  clientId,
  appointments,
  transactions,
}: {
  customerId: string;
  clientId?: string;
  appointments: Appointment[];
  transactions: Transaction[];
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const entries = appointments
    .filter((v) => {
      const received = transactions
        .filter(
          (transaction) => transaction.appointment_id === v.id && transaction.status === "verified",
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      return (
        (v.customer_id === customerId || (!!clientId && v.client_id === clientId)) &&
        v.kind !== "block" &&
        v.status === "completed" &&
        new Date(v.starts_at).getTime() < Date.now() &&
        Number(v.total) > 0 &&
        received >= Number(v.total)
      );
    })
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id));
  const visibleEntries = showAll ? entries : entries.slice(0, 2);

  return (
    <View style={{ gap: 7, marginTop: 4, marginBottom: 4 }}>
      <View
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <OwnerText size={24} bold>
          Service History
        </OwnerText>
        {entries.length > 2 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAll((value) => !value)}
            style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: "center" }}
          >
            <OwnerText size={16} bold>
              {showAll ? "Show Recent" : "View All"}
            </OwnerText>
          </Pressable>
        )}
      </View>
      {entries.length === 0 && <OwnerText muted>No services recorded.</OwnerText>}
      {visibleEntries.map((entry) => {
        const open = expanded === entry.id;
        const service = (Array.isArray(entry.services) ? entry.services : [])
          .map((item) => String(item?.name ?? "Service"))
          .join(", ");
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
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                minHeight: 46,
              }}
            >
              <Txt
                size={16}
                color={c.foreground}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flex: 1 }}
              >
                {dateLabel(entry.starts_at)} · {service}
              </Txt>
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
