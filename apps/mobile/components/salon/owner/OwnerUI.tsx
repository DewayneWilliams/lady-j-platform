import React from "react";
import { View, ViewStyle } from "react-native";
import { Button } from "@/components/ui/button";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { Txt, Card, useColors } from "../ui";
export function OwnerText({
  children,
  size = 20,
  muted = false,
  bold = false,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  bold?: boolean;
}) {
  const c = useColors();
  return (
    <Txt size={size} bold={bold} color={muted ? c.mutedForeground : c.foreground}>
      {children}
    </Txt>
  );
}
export function OwnerButton({
  label,
  onPress,
  icon,
  secondary = false,
  destructive = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const color = destructive ? c.attentionBorder : secondary ? c.foreground : c.tertiaryForeground;
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      variant={secondary || destructive ? "outline" : "default"}
      style={{
        minHeight: 58,
        alignSelf: "flex-start",
        maxWidth: "100%",
        height: "auto",
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 12,
        gap: 10,
        flexDirection: "row",
        backgroundColor: secondary || destructive ? c.card : c.tertiary,
        borderWidth: 1,
        borderColor: destructive ? c.attentionBorder : secondary ? c.border : c.tertiary,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon && <Icon name={icon} size={21} color={color} />}
      <Txt size={20} bold color={color} style={{ flexShrink: 1, textAlign: "center" }}>
        {label}
      </Txt>
    </Button>
  );
}
export function OwnerStatus({ status }: { status: string }) {
  const c = useColors();
  const good = ["confirmed", "verified", "paid", "completed", "fulfilled"].includes(status),
    bad = ["cancelled", "no_show", "refunded"].includes(status);
  const label: Record<string, string> = {
    pending: "Payment pending",
    confirmed: "Confirmed",
    verified: "Verified",
    paid: "Paid",
    completed: "Service complete",
    no_show: "No-show",
    processing: "Processing",
    ready: "Ready for pickup",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
    block: "Time blocked",
    refund_due: "Refund due",
    refunded: "Refunded",
    retained: "Retained",
  };
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: good ? c.muted : bad ? c.secondary : c.goldSurface,
      }}
    >
      <Txt
        size={18}
        color={
          status === "confirmed"
            ? c.paymentDepositForeground
            : status === "pending"
              ? c.paymentPending
              : status === "paid"
                ? c.paymentPaid
                : good
                  ? c.success
                  : bad
                    ? c.destructive
                    : c.warning
        }
      >
        {label[status] || status}
      </Txt>
    </View>
  );
}
export function OwnerTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
      }}
    >
      <View style={{ flex: 1, minWidth: 120 }}>
        <OwnerText size={28} bold>
          {title}
        </OwnerText>
        {description && <OwnerText muted>{description}</OwnerText>}
      </View>
      {action}
    </View>
  );
}
export function OwnerEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const c = useColors();
  return (
    <Card style={{ alignItems: "center", gap: 14, paddingVertical: 32 }}>
      <Icon name="CalendarHeart" size={32} color={c.warning} />
      <OwnerText size={24} bold>
        {title}
      </OwnerText>
      <OwnerText muted>{body}</OwnerText>
      {action}
    </Card>
  );
}
export function OwnerStat({
  label,
  value,
  note,
  icon,
  style,
}: {
  label: string;
  value: string;
  note?: string;
  icon: IconName;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <Card style={{ padding: 20, gap: 9, ...style }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <OwnerText muted>{label}</OwnerText>
        <Icon name={icon} size={22} color={c.warning} />
      </View>
      <OwnerText size={30} bold>
        {value}
      </OwnerText>
      {note && <OwnerText muted>{note}</OwnerText>}
    </Card>
  );
}
