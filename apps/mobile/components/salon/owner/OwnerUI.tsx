import React from "react";
import { View, ViewStyle, ActivityIndicator } from "react-native";
import { Button } from "@/components/ui/button";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { Txt, ButtonLabel, Card, useColors } from "../ui";
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
    <Txt
      size={size}
      bold={bold}
      color={muted ? c.mutedForeground : c.foreground}
      className={"text-sm"}
    >
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
  accent = false,
  compact = false,
  fill = false,
  centered = false,
  busy = false,
  payment = false,
  id,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  accent?: boolean;
  compact?: boolean;
  fill?: boolean;
  centered?: boolean;
  busy?: boolean;
  payment?: boolean;
  id?: string;
}) {
  const c = useColors();
  const color = payment
    ? c.paymentPaidBadgeForeground
    : disabled || busy
      ? c.mutedForeground
      : destructive
        ? c.attentionBorder
        : secondary
          ? c.foreground
          : c.tertiaryForeground;
  return (
    <Button
      accessibilityLabel={label}
      testID={
        id ||
        `owner-action-${label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`
      }
      onPress={onPress}
      disabled={disabled || busy}
      variant={secondary || destructive ? "outline" : "default"}
      style={{
        minHeight: 58,
        alignSelf: fill ? "stretch" : centered ? "center" : "flex-start",
        width: fill ? "100%" : undefined,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        flexGrow: fill ? 1 : undefined,
        alignItems: "center",
        justifyContent: "center",
        height: "auto",
        borderRadius: 12,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: 12,
        gap: 10,
        flexDirection: "row",
        backgroundColor: payment
          ? c.paymentPaidBadge
          : disabled || busy
            ? c.muted
            : secondary || destructive
              ? c.card
              : accent
                ? c.brandAccentFill
                : c.tertiary,
        borderWidth: 1,
        borderColor: payment
          ? c.paymentPaidBadge
          : disabled || busy
            ? c.border
            : destructive
              ? c.attentionBorder
              : secondary
                ? c.border
                : accent
                  ? c.brandAccentFill
                  : c.tertiary,
      }}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        icon && <Icon name={icon} size={21} color={color} />
      )}
      <ButtonLabel
        singleLine
        size={compact && (secondary || destructive) ? 18 : 20}
        color={color}
        style={{ flexShrink: 1, textAlign: "center" }}
      >
        {label}
      </ButtonLabel>
    </Button>
  );
}
export function OwnerStatus({ status }: { status: string }) {
  const c = useColors();
  const good = ["confirmed", "verified", "paid", "completed", "fulfilled", "converted"].includes(
      status,
    ),
    bad = ["cancelled", "no_show", "refunded"].includes(status);
  const label: Record<string, string> = {
    pending: "Payment Pending",
    confirmed: "Confirmed",
    verified: "Verified",
    paid: "Paid",
    completed: "Service Complete",
    no_show: "No-Show",
    processing: "Processing",
    ready: "Ready for Pickup",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
    block: "Time Blocked",
    refund_due: "Refund Due",
    refunded: "Refunded",
    retained: "Retained",
    new: "New",
    contacted: "Contacted",
    scheduled: "Scheduled",
    converted: "Converted to Booking",
  };
  return (
    <View
      style={{
        alignSelf: "flex-start",
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        borderRadius: status === "pending" ? 999 : 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor:
          status === "pending"
            ? c.paymentPendingBadge
            : good
              ? c.muted
              : bad
                ? c.secondary
                : c.goldSurface,
      }}
    >
      <ButtonLabel
        color={
          status === "confirmed"
            ? c.paymentDepositForeground
            : status === "pending"
              ? c.primaryForeground
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
      </ButtonLabel>
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
