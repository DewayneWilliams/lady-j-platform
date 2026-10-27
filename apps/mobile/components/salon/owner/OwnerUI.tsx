import React from "react";
import { View, ViewStyle, ActivityIndicator } from "react-native";
import { Button } from "@/components/ui/button";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { Txt, ButtonLabel, Card, controlTestId, safeControlLabel, useColors } from "../ui";
export function OwnerText({
  children,
  size = 20,
  muted = false,
  bold = false,
  centered = bold && size >= 24,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  bold?: boolean;
  centered?: boolean;
}) {
  const c = useColors();
  return (
    <Txt
      size={size}
      bold={bold}
      color={muted ? c.mutedForeground : c.foreground}
      className={"text-base"}
      style={centered ? { alignSelf: "stretch", textAlign: "center" } : undefined}
    >
      {children}
    </Txt>
  );
}
export function OwnerButton({
  label: labelProp,
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
  label?: string;
  onPress?: () => void;
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
  const label = safeControlLabel(labelProp, "Owner action");
  const unavailable = disabled || busy || !onPress;
  const color = payment
    ? c.paymentPaidBadgeForeground
    : unavailable
      ? c.mutedForeground
      : destructive
        ? c.attentionBorder
        : secondary
          ? c.foreground
          : c.primaryForeground;
  return (
    <Button
      accessibilityLabel={label}
      testID={id || controlTestId("owner-action", label, "owner-action")}
      onPress={onPress}
      disabled={unavailable}
      variant={secondary || destructive ? "outline" : "default"}
      style={{
        minHeight: 46,
        alignSelf: fill ? "stretch" : centered ? "center" : "flex-start",
        width: fill ? "100%" : undefined,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        flexGrow: fill ? 1 : undefined,
        alignItems: "center",
        justifyContent: "center",
        height: "auto",
        borderRadius: 10,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: 8,
        gap: 8,
        flexDirection: "row",
        backgroundColor: payment
          ? c.paymentPaidBadge
          : unavailable
            ? c.muted
            : secondary || destructive
              ? c.card
              : accent
                ? c.brandAccentFill
                : c.brandAccentFill,
        borderWidth: 1,
        borderColor: payment
          ? c.paymentPaidBadge
          : unavailable
            ? c.border
            : destructive
              ? c.attentionBorder
              : secondary
                ? c.border
                : accent
                  ? c.brandAccentFill
                  : c.brandAccentFill,
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
  const centered = !action;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: centered ? "center" : "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <View style={{ flex: centered ? undefined : 1, minWidth: 120, width: centered ? "100%" : undefined }}>
        <OwnerText size={28} bold centered={centered}>
          {title}
        </OwnerText>
        {description && <OwnerText muted centered={centered}>{description}</OwnerText>}
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
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: 22 }}>
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
  compact = false,
  valueSingleLine = false,
}: {
  label: string;
  value: string;
  note?: string;
  icon: IconName;
  style?: ViewStyle;
  compact?: boolean;
  valueSingleLine?: boolean;
}) {
  const c = useColors();
  return (
    <Card style={{ padding: compact ? 7 : 14, gap: compact ? 3 : 7, ...style }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <OwnerText size={compact ? 14 : 20} muted>
          {label}
        </OwnerText>
        <Icon name={icon} size={compact ? 18 : 22} color={c.warning} />
      </View>
      <Txt
        size={compact ? 22 : 30}
        bold
        numberOfLines={valueSingleLine ? 1 : undefined}
        adjustsFontSizeToFit={valueSingleLine}
        minimumFontScale={valueSingleLine ? 0.7 : undefined}
      >
        {value}
      </Txt>
      {note && <OwnerText muted>{note}</OwnerText>}
    </Card>
  );
}
