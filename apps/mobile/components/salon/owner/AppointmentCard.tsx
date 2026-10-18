import { activityColor } from "@/lib/salon/calendarActivity";
import CalendarActivityDot from "./CalendarActivityDot";
import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Appointment, Transaction, money, timeLabel } from "@/lib/salon/types";
import { appointmentDuration } from "@/lib/salon/ownerPrep";
import { appointmentPayment } from "@/lib/salon/appointmentPayment";
import { Card, Txt, useColors } from "../ui";
import { OwnerStatus, OwnerText } from "./OwnerUI";
export default function AppointmentCard({
  appointment: a,
  name,
  transactions,
  expanded,
  onToggle,
  children,
}: {
  appointment: Appointment;
  name: string;
  transactions: Transaction[];
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  const payment = appointmentPayment(a, transactions);
  const calendarColor = activityColor(a);
  const paymentColor =
    payment.state === "paid"
      ? c.paymentPaid
      : payment.state === "deposit"
        ? c.paymentDeposit
        : c.paymentPending;
  return (
    <Card style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
      <View
        testID={"appointment-" + a.id}
        style={{
          borderLeftWidth: 7,
          borderColor: a.kind === "block" ? c.mutedForeground : paymentColor,
          padding: 20,
          gap: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Txt size={18} style={{ flex: 1, minWidth: 0 }}>
            {timeLabel(a.starts_at).replace(/\s/g, "").toLowerCase()}–
            {timeLabel(a.ends_at).replace(/\s/g, "").toLowerCase()}
          </Txt>
          <Txt size={18} bold style={{ maxWidth: "43%", textAlign: "right" }}>
            {appointmentDuration(a.starts_at, a.ends_at)}
          </Txt>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {a.kind === "appointment" &&
            (payment.state === "paid" ? (
              <View
                style={{
                  backgroundColor: c.paymentPaidBadge,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  alignSelf: "flex-start",
                }}
              >
                <Txt size={18} bold color={c.paymentPaidBadgeForeground}>
                  {payment.label}
                </Txt>
              </View>
            ) : (
              <Txt
                size={18}
                bold
                color={payment.state === "deposit" ? c.paymentDepositForeground : paymentColor}
              >
                {payment.label}
              </Txt>
            ))}
          <OwnerStatus status={a.kind === "block" ? "block" : a.status} />
        </View>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: c.goldSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {a.kind === "block" ? (
              <Icon name="CalendarX2" size={22} color={c.warning} />
            ) : (
              <Txt size={18} bold color={c.warning}>
                {name
                  .split(" ")
                  .map((v) => v[0])
                  .slice(0, 2)
                  .join("")}
              </Txt>
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!!calendarColor && <CalendarActivityDot type={calendarColor} size={8} />}
              <View style={{ flex: 1 }}>
                <OwnerText size={24} bold>
                  {a.kind === "block" ? "Private time" : name}
                </OwnerText>
              </View>
            </View>
            <OwnerText muted>
              {a.services?.map((v) => v.name).join(" + ") || a.note || "Time reserved for you"}
            </OwnerText>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          <View style={{ width: "100%", gap: 10 }}>
            {a.kind === "appointment" &&
              (
                [
                  ["Total", money(a.total)],
                  ["Deposit Paid", money(payment.depositReceived)],
                  ["Balance Due", money(payment.remaining)],
                ] as const
              ).map(([label, amount]) => (
                <View
                  key={label}
                  style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
                >
                  <OwnerText muted={label !== "Balance Due"}>{label}</OwnerText>
                  <Txt
                    size={20}
                    bold={label === "Balance Due"}
                    color={
                      label === "Balance Due"
                        ? payment.state === "deposit"
                          ? c.paymentDepositForeground
                          : paymentColor
                        : c.foreground
                    }
                    style={{ textAlign: "right", flexShrink: 1 }}
                  >
                    {amount}
                  </Txt>
                </View>
              ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${expanded ? "Close" : "Manage"} ${name}`}
            onPress={onToggle}
            style={{
              minWidth: 56,
              minHeight: 56,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 10,
              backgroundColor: c.muted,
              alignSelf: "flex-end",
              marginLeft: "auto",
            }}
          >
            <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={23} color={c.foreground} />
          </Pressable>
        </View>
        {expanded && (
          <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 18, gap: 12 }}>
            {children}
          </View>
        )}
      </View>
    </Card>
  );
}

export function AppointmentLegend() {
  const c = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Appointment status legend: green means paid in full, yellow means confirmed, red means pending"
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingBottom: 16,
      }}
    >
      {[
        { label: "Paid in full", color: c.paymentPaid },
        { label: "Confirmed", color: c.paymentDeposit },
        { label: "Pending", color: c.paymentPending },
      ].map(({ label, color }) => (
        <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Txt size={14} lines={1}>
            {label}
          </Txt>
        </View>
      ))}
    </ScrollView>
  );
}
