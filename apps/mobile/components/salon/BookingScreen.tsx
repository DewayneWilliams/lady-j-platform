import { PlayfairDisplay_400Regular, useFonts } from "@expo-google-fonts/dev";
import CalendarPicker from "./CalendarPicker";
export { default as CalendarPicker } from "./CalendarPicker";
import { useCalendarRealtime } from "@/lib/salon/useCalendarRealtime";
import { formatDuration, serviceDurationLabel } from "@/lib/salon/duration";
import { useLocalSearchParams } from "expo-router";
import { validReportDate } from "@/lib/salon/revenueReport";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { shouldShowVipIcon, vipRequiresApproval } from "@/lib/salon/vipAccess";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { useTheme } from "@/theming/ThemeProvider";
import { emptyGiftsReferrals, myGiftsReferrals } from "@/lib/salon/gifts";
import ServiceAgreement, { type GuestAgreementDraft } from "./ServiceAgreement";
import ServiceCategories from "./ServiceCategories";
import CompletionCelebration from "./owner/CompletionCelebration";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as Clipboard from "expo-clipboard";
import { Image } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import PromoCode from "./PromoCode";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { db, check, asRows } from "@/lib/salon/client";
import { money, dateLabel, timeLabel, servicePriceLabel, type Service } from "@/lib/salon/types";
import { catalogPhotoSource } from "@/lib/salon/images";
import Shell, { useNav } from "./Shell";
import { Search } from "./CatalogScreens";
import FavoriteButton from "./FavoriteButton";
import {
  Txt,
  ButtonLabel,
  Action,
  Photo,
  Tag,
  LinkText,
  Card,
  Chip,
  Field,
  ErrorBox,
  useColors,
  shared,
} from "./ui";
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const requestUuid = () =>
  globalThis.crypto?.randomUUID?.() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 3) | 8).toString(16);
  });
async function receiptBytes(asset: ImagePicker.ImagePickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();
  if (!asset.base64) throw new Error("Choose the receipt again before confirming.");
  return Uint8Array.from(atob(asset.base64), (char) => char.charCodeAt(0)).buffer;
}
type AvailableSlot = { starts_at: string; is_vip: boolean; vip_percentage: 20 | 30 | null };

function BookingSummaryBar({
  selected,
  duration,
  total,
  totalLabel,
  updating,
  step,
  nextLabel,
  nextDisabled,
  width,
  onBack,
  onNext,
}: {
  selected: Service[];
  duration: number;
  total: number;
  totalLabel?: string;
  updating: boolean;
  step: number;
  nextLabel: string;
  nextDisabled: boolean;
  width: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const summaryMotion = useRef(new Animated.Value(1)).current;
  const selectionKey = `${selected.map((service) => service.id).join(",")}:${duration}:${total}:${totalLabel || ""}`;
  const compact = width < 560;
  const hasBack = step > 1;

  useEffect(() => {
    if (reducedMotion !== false) {
      summaryMotion.setValue(1);
      return;
    }
    summaryMotion.setValue(0.985);
    Animated.spring(summaryMotion, {
      toValue: 1,
      speed: 22,
      bounciness: 5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [reducedMotion, selectionKey, summaryMotion]);

  const thumbnailBorder = c.card || c.background || "#FFFFFF";
  const metric = (
    icon: "Clock3" | "Tag",
    label: string,
    value: string,
    key: string,
  ) => (
    <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0, flexShrink: 1 }}>
      <Icon name={icon} size={15} color={c.brandAccent} />
      <View style={{ minWidth: 0 }}>
        <Txt size={10} color={c.mutedForeground} numberOfLines={1} maxFontSizeMultiplier={1}>
          {label}
        </Txt>
        <Txt
          size={13}
          bold
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          maxFontSizeMultiplier={1}
        >
          {value}
        </Txt>
      </View>
    </View>
  );

  return (
    <View
      accessibilityLabel="Booking totals and navigation"
      style={{ flexShrink: 0, backgroundColor: c.background, paddingHorizontal: width > 700 ? 24 : 10, paddingTop: 8, paddingBottom: 10 }}
    >
      <Animated.View
        style={{
          width: "100%",
          maxWidth: 840,
          alignSelf: "center",
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.card,
          paddingHorizontal: compact ? 10 : 12,
          paddingVertical: 10,
          gap: compact ? 10 : 8,
          transform: [{ scale: summaryMotion }],
          ...(Platform.OS === "web"
            ? ({ boxShadow: "0 5px 18px rgba(0, 0, 0, 0.12)" } as object)
            : {
                shadowColor: "#000000",
                shadowOpacity: 0.12,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }),
        }}
      >
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            alignItems: compact ? "stretch" : "center",
            gap: compact ? 10 : 12,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: compact ? 10 : 12,
            }}
          >
            <View style={{ minWidth: selected.length ? 68 : 38, height: 36, flexDirection: "row", alignItems: "center" }}>
              {selected.slice(0, 4).map((service, index) => (
                <Image
                  key={service.id}
                  source={catalogPhotoSource(service.image)}
                  resizeMode="cover"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: thumbnailBorder,
                    marginLeft: index ? -12 : 0,
                  }}
                />
              ))}
              {!selected.length && (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    backgroundColor: c.brandAccentSurface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="Sparkles" size={17} color={c.brandAccent} />
                </View>
              )}
              {selected.length > 4 && (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    marginLeft: -8,
                    backgroundColor: c.brandAccent,
                    borderWidth: 2,
                    borderColor: thumbnailBorder,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt size={10} bold color={c.primaryForeground}>
                    +{selected.length - 4}
                  </Txt>
                </View>
              )}
            </View>
            <View style={{ minWidth: 0, flexShrink: 1 }}>
              <Txt size={10} color={c.mutedForeground} numberOfLines={1} maxFontSizeMultiplier={1}>
                Your selection
              </Txt>
              <Txt size={13} bold numberOfLines={1} maxFontSizeMultiplier={1}>
                {selected.length} service{selected.length === 1 ? "" : "s"}
              </Txt>
            </View>
            <View style={{ width: 1, height: 28, backgroundColor: c.border }} />
            {metric("Clock3", "Duration", formatDuration(duration), "duration")}
            <View style={{ width: 1, height: 28, backgroundColor: c.border }} />
            {metric("Tag", "Estimated total", updating ? "Updating…" : totalLabel || money(total), "total")}
          </View>

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              accessibilityState={{ disabled: !hasBack }}
              disabled={!hasBack}
              onPress={onBack}
              style={({ pressed }) => ({
                minHeight: 42,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 4,
                opacity: !hasBack ? 0.42 : pressed ? 0.8 : 1,
              })}
            >
              <Icon name="ArrowLeft" size={15} color={c.foreground} />
              <Txt size={13} bold numberOfLines={1} maxFontSizeMultiplier={1}>Back</Txt>
            </Pressable>
            {step < 3 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={nextLabel}
                accessibilityState={{ disabled: nextDisabled }}
                disabled={nextDisabled}
                onPress={onNext}
                style={({ pressed }) => ({
                  minHeight: 42,
                  flex: 1,
                  minWidth: compact ? 0 : 132,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: c.brandAccent,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  opacity: nextDisabled ? 0.45 : pressed ? 0.86 : 1,
                })}
              >
                <Txt
                  size={13}
                  bold
                  color={c.primaryForeground}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  maxFontSizeMultiplier={1}
                >
                  {nextLabel}
                </Txt>
                <Icon name="ArrowRight" size={16} color={c.primaryForeground} />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TimeSlotButton({
  label,
  vip,
  dayOfWeek,
  time,
  percentage,
  selected,
  disabled,
  reducedMotion,
  onPress,
}: {
  label: string;
  vip: boolean;
  dayOfWeek: number;
  time: string;
  percentage: 20 | 30 | null;
  selected: boolean;
  disabled: boolean;
  reducedMotion: boolean | null;
  onPress: () => void;
}) {
  const showVipIcon = shouldShowVipIcon(dayOfWeek, time);
  const { theme } = useTheme();
  const c = theme.colors;
  // Presentation is deliberately derived from the same start-time predicate as the
  // crown. Pricing and availability must never change a card into a VIP card.
  const vipCard = showVipIcon;
  const regularBackground = theme.name === "light" ? "#FFFFFF" : "#151515";
  const regularInk = theme.name === "light" ? "#000000" : "#FFFFFF";
  const vipInk = theme.name === "light" ? "#000000" : c.vipForeground || c.foreground;
  const motion = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);
  const animateTo = useCallback(
    (value: number, duration = 180) => {
      if (disabled || reducedMotion !== false) return;
      Animated.timing(motion, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    },
    [disabled, motion, reducedMotion],
  );
  return (
    <Animated.View
      style={{
        transform:
          reducedMotion === false
            ? [
                {
                  translateY: motion.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0, 0, -2],
                  }),
                },
                {
                  scale: motion.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0.97, 1, 1.02],
                  }),
                },
              ]
            : undefined,
      }}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`${label}${showVipIcon ? ", VIP time" : vip ? `, ${percentage} percent surcharge applies` : ""}${disabled ? ", unavailable" : ""}`}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        hitSlop={6}
        onPress={onPress}
        onHoverIn={() => {
          hovered.current = true;
          animateTo(1);
        }}
        onHoverOut={() => {
          hovered.current = false;
          animateTo(0);
        }}
        onPressIn={() => animateTo(-1, 100)}
        onPressOut={() => animateTo(hovered.current ? 1 : 0, 180)}
        style={{
          height: 46,
          paddingHorizontal: 2,
          paddingVertical: 3,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: vipCard ? c.headerGold : regularBackground,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.goldBorder : vipCard ? c.goldBorder : c.border,
          opacity: 1,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <Txt
            size={12}
            bold
            color={vipCard ? vipInk : regularInk}
            style={{ textAlign: "center", lineHeight: 16 }}
          >
            {label}
          </Txt>
          {showVipIcon && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Icon name="Crown" size={12} color={vipInk} />
              <Txt size={9} bold color={vipInk} style={{ lineHeight: 11 }}>
                VIP
              </Txt>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
export function PaymentChoice({
  method,
  setMethod,
  deposit,
  reference = "",
  setReference = () => undefined,
  paymentDate = "",
  setPaymentDate = () => undefined,
  receipt = null,
  chooseReceipt = () => undefined,
  fullTotal,
  paymentSelection = "full",
  setPaymentSelection = () => undefined,
  allowDeposit = true,
  onDemoCardReady = () => undefined,
  collectReceipt = true,
}: {
  method: string;
  setMethod: (v: string) => void;
  deposit?: number;
  reference?: string;
  setReference?: (v: string) => void;
  paymentDate?: string;
  setPaymentDate?: (v: string) => void;
  receipt?: ImagePicker.ImagePickerAsset | null;
  chooseReceipt?: (source: "camera" | "library") => void;
  fullTotal?: number;
  paymentSelection?: "full" | "deposit";
  setPaymentSelection?: (value: "full" | "deposit") => void;
  allowDeposit?: boolean;
  onDemoCardReady?: (ready: boolean) => void;
  collectReceipt?: boolean;
}) {
  const c = useColors(),
    s = useSalon();
  const [expanded, setExpanded] = useState(true),
    [demoNumber, setDemoNumber] = useState(""),
    [demoExpiry, setDemoExpiry] = useState(""),
    [demoCvc, setDemoCvc] = useState("");
  const demoDigits = demoNumber.replace(/\D/g, "");
  const demoDeclined = demoDigits === "4000000000000002";
  const demoReady =
    demoDigits === "4242424242424242" &&
    /^\d{2}\/\d{2}$/.test(demoExpiry) &&
    /^\d{3,4}$/.test(demoCvc);
  useEffect(
    () => onDemoCardReady(method === "card" && demoReady),
    [demoReady, method, onDemoCardReady],
  );
  const details = [
    ["Bank", s.settings?.bank_name || "First Citizens Bank"],
    ["Account Name", s.settings?.bank_account_name || "LADY J SALON AND DAY SPA"],
    ["Account Type", s.settings?.bank_account_type || "Savings"],
    ["Account Number", s.settings?.bank_account_number || "3201297"],
    ["Currency", s.settings?.bank_currency || "TTD"],
  ];
  return (
    <View style={{ gap: 13 }}>
      {[
        {
          id: "bank",
          icon: "Landmark" as const,
          title: "Bank Wire Transfer",
          desc: "Recommended · Pending owner verification",
        },
        {
          id: "card",
          icon: "CreditCard" as const,
          title: "Demo Credit Card",
          desc: s.testMode
            ? "Test payment only · No real charge"
            : "Available in Development Test Mode only",
        },
      ].map((v) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{
            checked: method === v.id,
            disabled: v.id === "card" && !s.testMode,
          }}
          key={v.id}
          disabled={v.id === "card" && !s.testMode}
          onPress={() => setMethod(v.id)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor:
              v.id === "card" && !s.testMode
                ? c.muted
                : method === v.id
                  ? c.brandAccentSurface
                  : c.card,
            borderWidth: method === v.id ? 2 : 1,
            borderColor: method === v.id ? c.primary : c.border,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Icon name={v.icon} size={23} color={c.secondaryForeground} />
          <View style={{ flex: 1 }}>
            <ButtonLabel>{v.title}</ButtonLabel>
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 3 }}>
              {v.desc}
            </Txt>
          </View>
          <Icon
            name={method === v.id ? "CircleCheck" : "Circle"}
            size={21}
            color={method === v.id ? c.brandAccent : c.mutedForeground}
          />
        </Pressable>
      ))}
      {method === "bank" && (
        <Card
          style={{
            backgroundColor: c.goldSurface,
            borderColor: c.goldBorder,
            padding: 16,
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View style={{ flex: 1 }}>
              <Txt bold>
                {deposit == null
                  ? "Bank transfer instructions"
                  : `Transfer ${money(paymentSelection === "full" ? fullTotal || deposit : deposit)} today`}
              </Txt>
              <Txt size={12} color={c.mutedForeground}>
                Secure bank details
              </Txt>
            </View>
            <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={20} color={c.brandAccent} />
          </Pressable>
          {expanded && (
            <View style={{ gap: 10 }}>
              {deposit != null && fullTotal != null && allowDeposit && (
                <View style={{ gap: 10 }}>
                  {[
                    {
                      id: "full" as const,
                      title: "Bank Transfer — Pay in Full (100%)",
                      headline:
                        "Complete your payment today for a seamless, fully paid salon experience.",
                      body: "No remaining balance at your appointment.",
                      amount: fullTotal,
                    },
                    {
                      id: "deposit" as const,
                      title: "Bank Transfer — Secure Your Appointment (50% Deposit)",
                      headline: "Reserve your appointment with just 50% today.",
                      body: `Pay the remaining balance when your service is complete. Remaining balance: ${money(fullTotal - deposit)}`,
                      amount: deposit,
                    },
                  ].map((option) => {
                    const selected = paymentSelection === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setPaymentSelection(option.id)}
                        style={{
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? c.brandAccent : c.goldBorder,
                          backgroundColor: selected ? c.brandAccentSurface : c.card,
                          borderRadius: 12,
                          padding: 14,
                          gap: 4,
                        }}
                      >
                        <Txt bold>{option.title}</Txt>
                        <Txt size={13} bold color={c.brandAccent}>
                          {option.headline}
                        </Txt>
                        <Txt size={12} color={c.mutedForeground}>
                          {option.body}
                        </Txt>
                        <Txt size={16} bold>
                          Pay {money(option.amount)} Today
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {details.map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 18,
                    borderTopWidth: label === "Bank" ? 0 : 1,
                    borderColor: c.goldBorder,
                    paddingTop: label === "Bank" ? 0 : 9,
                  }}
                >
                  <Txt size={13} color={c.mutedForeground}>
                    {label}
                  </Txt>
                  <Txt size={14} bold style={{ textAlign: "right", flex: 1 }}>
                    {value}
                  </Txt>
                </View>
              ))}
              <Action
                label="Copy Account Number"
                secondary
                icon="Copy"
                onPress={() =>
                  void Clipboard.setStringAsync(details[3][1]).then(() =>
                    s.notify("Account number copied."),
                  )
                }
                style={{ alignSelf: "stretch" }}
              />
              {!!s.settings?.bank_instructions && (
                <Txt size={13}>{s.settings.bank_instructions}</Txt>
              )}
              <Txt size={12} color={c.mutedForeground}>
                Uploading proof does not verify payment. Your deposit stays Pending Verification
                until authorized salon staff confirms the funds in the bank account.
              </Txt>
              {deposit != null && (
                <>
                  <Field
                    label="Transaction Reference Number"
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Enter the bank reference"
                  />
                  {collectReceipt && (
                    <>
                      <Field
                        label="Payment Date"
                        value={paymentDate}
                        onChangeText={setPaymentDate}
                        placeholder="YYYY-MM-DD"
                      />
                      <Txt bold>Upload Proof of Payment</Txt>
                      <Txt size={12} color={c.mutedForeground}>
                        Upload your bank transfer proof here.
                      </Txt>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        <Action
                          label="Take Photo"
                          secondary
                          icon="Camera"
                          onPress={() => chooseReceipt("camera")}
                        />
                        <Action
                          label={receipt ? "Change Photo" : "Photo Library"}
                          secondary
                          icon="Upload"
                          onPress={() => chooseReceipt("library")}
                        />
                      </View>
                      {!!receipt && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Image
                            source={{ uri: receipt.uri }}
                            accessibilityLabel="Selected payment proof preview"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              backgroundColor: c.muted,
                            }}
                          />
                          <Txt size={13} color={c.success} style={{ flex: 1 }}>
                            Selected: {receipt.fileName || "Payment receipt image"}
                          </Txt>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </Card>
      )}
      {method === "card" && s.testMode && (
        <Card style={{ gap: 12, borderColor: c.brandAccent }}>
          <View style={{ gap: 3 }}>
            <Tag>Demo payment · No real transaction</Tag>
            <Txt bold size={17}>
              Test card details
            </Txt>
            <Txt size={12} color={c.mutedForeground}>
              These values stay on this screen and are never saved. Use 4242 4242 4242 4242 for
              success or 4000 0000 0000 0002 to simulate a decline.
            </Txt>
          </View>
          {deposit != null && fullTotal != null && allowDeposit && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  ["full", `Pay 100% · TTD ${money(fullTotal)}`],
                  ["deposit", `Pay 50% · TTD ${money(deposit)}`],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  label={label}
                  selected={paymentSelection === id}
                  onPress={() => setPaymentSelection(id)}
                />
              ))}
            </View>
          )}
          {!allowDeposit && fullTotal != null && (
            <Txt bold color={c.brandAccent}>
              Full payment required · TTD {money(fullTotal)}
            </Txt>
          )}
          <Field
            label="Demo Card Number"
            value={demoNumber}
            onChangeText={setDemoNumber}
            keyboardType="numeric"
            placeholder="4242 4242 4242 4242"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Expiry"
                value={demoExpiry}
                onChangeText={setDemoExpiry}
                placeholder="12/30"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Demo CVC"
                value={demoCvc}
                onChangeText={setDemoCvc}
                keyboardType="numeric"
                placeholder="123"
              />
            </View>
          </View>
          {demoDeclined && <ErrorBox message="Demo decline simulated. Try the 4242 test number." />}
          {demoReady && (
            <Txt bold color={c.success}>
              Demo card is ready for a simulated payment.
            </Txt>
          )}
        </Card>
      )}
    </View>
  );
}
export default function BookingScreen() {
  const s = useSalon(),
    c = useColors(),
    go = useNav(),
    { width } = useWindowDimensions();
  const reducedMotion = useReducedMotionPreference();
  const { date: requestedDate, id: requestedServiceId } = useLocalSearchParams<{
    date?: string;
    id?: string;
  }>();
  const initialDate =
    typeof requestedDate === "string" &&
    validReportDate(requestedDate) &&
    requestedDate >= todayKey()
      ? requestedDate
      : todayKey();
  const [step, setStep] = useState(1),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [date, setDate] = useState(initialDate),
    [time, setTime] = useState(""),
    [slots, setSlots] = useState<AvailableSlot[]>([]),
    [slotLoading, setSlotLoading] = useState(false),
    [error, setError] = useState(""),
    [method, setMethod] = useState("bank"),
    [demoCardReady, setDemoCardReady] = useState(false),
    [paymentSelection, setPaymentSelection] = useState<"full" | "deposit">("full"),
    [reference, setReference] = useState(""),
    [vipReason, setVipReason] = useState(""),
    [vipDraft, setVipDraft] = useState<AvailableSlot | null>(null),
    [vipReasonChoice, setVipReasonChoice] = useState(""),
    [vipDetails, setVipDetails] = useState(""),
    [paymentDate, setPaymentDate] = useState(todayKey()),
    [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [policy, setPolicy] = useState(false),
    [agreementId, setAgreementId] = useState(""),
    [agreementSubmittedRevision, setAgreementSubmittedRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(""),
    [celebrationRevision, setCelebrationRevision] = useState(0),
    [photo, setPhoto] = useState(""),
    [guestName, setGuestName] = useState(""),
    [guestEmail, setGuestEmail] = useState(""),
    [guestPhone, setGuestPhone] = useState(""),
    [guestAgreement, setGuestAgreement] = useState<GuestAgreementDraft | null>(null),
    [gifts, setGifts] = useState(emptyGiftsReferrals),
    [giftCode, setGiftCode] = useState(""),
    [giftAmount, setGiftAmount] = useState("0"),
    [referralAmount, setReferralAmount] = useState("0");
  const bookingRequestKey = useRef(requestUuid());
  const handleAgreementReady = useCallback((id: string) => {
    setAgreementId(id);
    setPolicy(Boolean(id));
    if (id) setAgreementSubmittedRevision(Date.now());
  }, []);
  const selected = s.services.filter((v) => s.selected.includes(v.id));
  const pricing = useDiscountQuote(
    "service",
    selected.map((v) => ({ id: v.id, quantity: 1 })),
  );
  const serviceSubtotal = Number(
      pricing.quote?.subtotal ?? selected.reduce((n, v) => n + Number(v.price), 0),
    ),
    duration = selected.reduce((n, v) => n + v.duration, 0),
    selectedSlot = slots.find((slot) => slot.starts_at === time),
    vipPercentage = selectedSlot?.is_vip ? selectedSlot.vip_percentage || 0 : 0,
    vipPremium = Math.round(serviceSubtotal * vipPercentage) / 100,
    total = serviceSubtotal + vipPremium,
    deposit = Math.round(total * 50) / 100;
  const isVip = !!selectedSlot?.is_vip;
  const selectedWeekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const selectedClosedDay = selectedWeekday === 0 || selectedWeekday === 1;
  const displayedSlots = useMemo(() => {
    const availableByMinute = new Map<number, AvailableSlot>();
    slots.forEach((slot) => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Port_of_Spain",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date(slot.starts_at));
      const minute =
        (Number(parts.find((part) => part.type === "hour")?.value || 0) % 24) * 60 +
        Number(parts.find((part) => part.type === "minute")?.value || 0);
      availableByMinute.set(minute, slot);
    });
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    // The published VIP window begins at 6 AM. Keep the grid at four equal cells per row.
    return Array.from({ length: 64 }, (_, index) => {
      const minute = 360 + index * 15;
      const weekend = day === 0 || day === 1;
      const available = availableByMinute.get(minute);
      const windowVip = weekend || minute < 600 || minute >= 1095;
      const vip = available?.is_vip ?? windowVip;
      const windowPercentage: 20 | 30 | null = !windowVip ? null : weekend ? 30 : 20;
      const percentage = available?.vip_percentage ?? windowPercentage;
      return { minute, vip, percentage, available, disabled: !available };
    });
  }, [date, slots]);
  const customApproval = selected.some((service) => service.requires_owner_approval);
  const requiresApproval =
    customApproval || (!!selectedSlot && isVip && vipRequiresApproval(selectedSlot.starts_at));
  const selectedPaymentAmount = paymentSelection === "full" ? total : deposit;
  const giftAvailable = Math.max(
    0,
    Number(gifts.received.find((card) => card.code === giftCode)?.balance || 0),
  );
  const requestedGift = Math.max(0, Math.min(Number(giftAmount) || 0, giftAvailable));
  const requestedReferral = Math.max(
    0,
    Math.min(Number(referralAmount) || 0, Number(gifts.referral_available) || 0),
  );
  const creditCovered = Math.min(selectedPaymentAmount, requestedGift + requestedReferral);
  const paymentDue = Math.max(0, selectedPaymentAmount - creditCovered);
  const fullyCovered = selectedPaymentAmount > 0 && paymentDue === 0;
  const noPaymentRequired = selected.length > 0 && pricing.ready && total === 0;
  const agreementReady = Boolean(agreementId);
  const submitDisabled =
    !agreementReady ||
    !policy ||
    !pricing.ready ||
    (requiresApproval && !customApproval && vipReason.trim().length < 8) ||
    (requiresApproval && !s.session && !s.testMode) ||
    (!requiresApproval &&
      !noPaymentRequired &&
      !s.testMode &&
      ((paymentDue > 0 && method !== "bank") ||
        !s.session ||
        (paymentDue > 0 &&
          (reference.trim().length < 3 ||
            !validReportDate(paymentDate) ||
            paymentDate > todayKey() ||
            !receipt)))) ||
    (!s.session && !s.testMode && (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()));
  const finalSubmitDisabled =
    submitDisabled ||
    (s.testMode && !requiresApproval && !noPaymentRequired && method === "card" && !demoCardReady);
  const slotGeneration = useRef(0);
  const changeDate = useCallback(
    (nextDate: string) => {
      if (nextDate === date) return;

      // Invalidate the previous date before the new slot components render.
      slotGeneration.current += 1;
      setTime("");
      setSlots([]);
      setSlotLoading(false);
      setVipDraft(null);
      setVipReason("");
      setVipReasonChoice("");
      setVipDetails("");
      setAgreementId("");
      setError("");
      setDate(nextDate);
    },
    [date],
  );
  useEffect(() => {
    if (step !== 3 || !s.session || noPaymentRequired) return;
    void myGiftsReferrals()
      .then(setGifts)
      .catch(() => setGifts(emptyGiftsReferrals));
  }, [noPaymentRequired, s.session, step]);
  const refreshSlots = useCallback(async () => {
    if (!s.authReady || step !== 2 || !duration) return;
    const generation = ++slotGeneration.current;
    setSlotLoading(true);
    setError("");
    try {
      const data = asRows<AvailableSlot>(
        check(await db().rpc("lj_available_v2", { p_date: date, p_duration: duration })),
        "Available times",
      );
      if (generation !== slotGeneration.current) return;
      const next = data;
      setSlots(next);
      setTime((previous) => (next.some((slot) => slot.starts_at === previous) ? previous : ""));
    } catch (e) {
      if (generation === slotGeneration.current) {
        setSlots([]);
        setTime("");
        setError(
          e instanceof Error ? e.message : "Unable to check availability. Please try again.",
        );
      }
    } finally {
      if (generation === slotGeneration.current) setSlotLoading(false);
    }
  }, [s.authReady, step, duration, date]);
  useEffect(() => {
    setTime("");
    setSlots([]);
    setVipDraft(null);
    setVipReason("");
    setVipReasonChoice("");
    setVipDetails("");
    void refreshSlots();
    return () => {
      slotGeneration.current += 1;
    };
  }, [refreshSlots]);
  useForegroundRefresh(refreshSlots, step === 2 && s.authReady);
  useCalendarRealtime(refreshSlots, step === 2 && s.authReady);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  async function choosePhoto() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!r.canceled) setPhoto(r.assets?.[0]?.uri || "");
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to open your photos.");
    }
  }
  async function chooseReceipt(source: "camera" | "library") {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("Camera permission is required to photograph your proof of payment.");
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw new Error("Photo library permission is required to select your proof of payment.");
      }
      const options = {
        mediaTypes: ["images"] as ImagePicker.MediaType[],
        quality: 0.85,
        base64: true,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      let asset = result.assets?.[0];
      if (!asset) return;
      if (/hei[cf]/i.test(asset.mimeType || asset.fileName || "")) {
        const converted = await manipulateAsync(asset.uri, [], {
          compress: 0.85,
          format: SaveFormat.JPEG,
          base64: true,
        });
        asset = {
          ...asset,
          uri: converted.uri,
          base64: converted.base64 || null,
          mimeType: "image/jpeg",
          fileName: (asset.fileName || "payment-proof").replace(/\.hei[cf]$/i, ".jpg"),
        };
      }
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024)
        throw new Error("Choose a proof image smaller than 8 MB.");
      setReceipt(asset);
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to choose the proof of payment.");
    }
  }
  async function submit() {
    setError("");
    if (!policy || !time || !agreementReady || !pricing.ready) return;
    if (s.testMode) {
      if (!requiresApproval && !noPaymentRequired && method === "card" && !demoCardReady) {
        setError("Enter the successful demo card details before continuing.");
        return;
      }
      setDone("demo");
      setCelebrationRevision(1);
      return;
    }
    setBusy(true);
    let receiptPath: string | null = null;
    try {
      if (!requiresApproval && !noPaymentRequired && paymentDue > 0 && (!s.session || !receipt))
        throw new Error("Sign in and add your bank transfer proof before confirming.");
      if (!requiresApproval && !noPaymentRequired && s.session) {
        if (giftCode && requestedGift > 0) {
          check(await db().rpc("lj_claim_gift_card", { p_code: giftCode }));
        }
        check(
          await db().rpc("lj_reserve_checkout_credits", {
            p_request_key: bookingRequestKey.current,
            p_gift_code: giftCode || null,
            p_gift_amount: requestedGift,
            p_referral_amount: requestedReferral,
          }),
        );
      }
      if (!requiresApproval && !noPaymentRequired && paymentDue > 0 && s.session && receipt) {
        const mime = receipt.mimeType || "image/jpeg";
        const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        receiptPath = `${s.session.user.id}/${bookingRequestKey.current}/receipt.${extension}`;
        check(
          await db()
            .storage.from("lj-payment-receipts")
            .upload(receiptPath, await receiptBytes(receipt), { contentType: mime, upsert: true }),
        );
      }
      let id: unknown;
      if (s.session && customApproval) {
        id = check(
          await db().rpc("lj_request_custom_service", {
            p_services: selected.map((v) => v.id),
            p_start: time,
            p_policy: policy,
            p_code: pricing.code,
            p_agreement: agreementId,
            p_request_key: bookingRequestKey.current,
            p_payment_selection: paymentSelection,
          }),
        );
      } else if (s.session && requiresApproval) {
        id = check(
          await db().rpc("lj_request_vip", {
            p_services: selected.map((v) => v.id),
            p_start: time,
            p_policy: policy,
            p_code: pricing.code,
            p_agreement: agreementId,
            p_request_key: bookingRequestKey.current,
            p_payment_selection: paymentSelection,
            p_reason: vipReason.trim(),
          }),
        );
      } else if (s.session) {
        id = check(
          await db().rpc("lj_book_checkout_v2", {
            p_services: selected.map((v) => v.id),
            p_start: time,
            p_reference: reference,
            p_policy: policy,
            p_code: pricing.code,
            p_agreement: agreementId,
            p_payment_date: noPaymentRequired ? null : paymentDate,
            p_receipt_path: receiptPath,
            p_receipt_filename: receipt?.fileName || null,
            p_receipt_mime: receipt?.mimeType || (receipt ? "image/jpeg" : null),
            p_request_key: bookingRequestKey.current,
            p_payment_selection: paymentSelection,
          }),
        );
      } else {
        id = check(
          await db().rpc("lj_guest_book", {
            p_name: guestName.trim(),
            p_email: guestEmail.trim(),
            p_phone: guestPhone.trim(),
            p_services: selected.map((v) => v.id),
            p_start: time,
            p_reference: reference,
            p_policy: policy,
            p_code: pricing.code,
            p_signature: guestAgreement?.signature || [],
            p_version: guestAgreement?.version || "",
          }),
        );
      }
      setDone(String(id));
      if (noPaymentRequired && !requiresApproval) {
        setCelebrationRevision(1);
      }
      if (s.session) await s.refreshPrivate();
    } catch (e) {
      if (receiptPath) {
        await db()
          .storage.from("lj-payment-receipts")
          .remove([receiptPath])
          .catch(() => undefined);
      }
      setError(e instanceof Error ? e.message : "We couldn’t save your request. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const barDisabled =
    step === 1
      ? !selected.length || selected.length > 10
      : step === 2
        ? !time || slotLoading
        : finalSubmitDisabled;
  const barLabel =
    step === 1
      ? "Next Step"
      : step === 2
        ? noPaymentRequired
          ? "Confirm"
          : "Payment"
        : "Confirm My Appointment →";
  const bookingBar = (
    <BookingSummaryBar
      selected={selected}
      duration={duration}
      total={total}
      totalLabel={customApproval ? "Custom price" : undefined}
      updating={pricing.busy}
      step={step}
      nextLabel={barLabel}
      nextDisabled={barDisabled}
      width={width}
      onBack={() => {
        if (step <= 1) return;
        setStep(step - 1);
        setError("");
      }}
      onNext={() => {
        if (step === 1) setStep(2);
        else if (step === 2) setStep(3);
      }}
    />
  );
  const agreementSection =
    s.testMode ? (
      <>
        <Tag>Development Test Mode · Local agreement only</Tag>
        <ServiceAgreement
          services={selected.map((v) => v.id)}
          onReady={handleAgreementReady}
          guest
          guestName={guestName || "Demo Client"}
          onGuestReady={setGuestAgreement}
        />
      </>
    ) : s.session ||
      (noPaymentRequired && guestName.trim() && guestEmail.trim() && guestPhone.trim()) ? (
      <ServiceAgreement
        services={selected.map((v) => v.id)}
        onReady={handleAgreementReady}
        noPaymentRequired={noPaymentRequired}
        guest={!s.session}
        guestName={guestName}
        onGuestReady={setGuestAgreement}
      />
    ) : null;
  if (done)
    return (
      <Shell>
        {celebrationRevision > 0 && (
          <CompletionCelebration
            onStart={() => undefined}
            onDone={() => setCelebrationRevision(0)}
          />
        )}
        <View style={{ maxWidth: 640, alignSelf: "center", width: "100%", paddingVertical: 35 }}>
          <Card style={{ alignItems: "center", padding: 35, gap: 18 }}>
            <Icon
              name={done === "demo" || noPaymentRequired ? "CalendarCheck" : "Clock3"}
              size={42}
              color={c.brandAccent}
            />
            <Tag>
              {done === "demo"
                ? "Demo complete · No appointment created"
                : requiresApproval
                  ? customApproval
                    ? "Custom pricing request saved"
                    : "VIP request saved · Pending owner approval"
                  : noPaymentRequired
                    ? "Appointment confirmed"
                    : "Request saved · Payment pending"}
            </Tag>
            <Txt serif size={34} style={{ textAlign: "center" }}>
              {done === "demo"
                ? "Your booking preview is complete."
                : requiresApproval
                  ? customApproval
                    ? "Management is preparing your custom price."
                    : "Your VIP Access request is pending approval."
                  : noPaymentRequired
                    ? "Congratulations! Your Transformation Has Been Booked!"
                    : "Your booking is pending verification."}
            </Txt>
            <Txt style={{ textAlign: "center" }}>
              {selected.map((v) => v.name).join(" + ")}
              {`\n`}
              {dateLabel(time)} at {timeLabel(time)}
            </Txt>
            <Txt size={14} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {done === "demo"
                ? "This was a local demonstration. No appointment, agreement, payment, or private customer record was created."
                : requiresApproval
                  ? customApproval
                    ? "No payment was collected. Management will confirm the final duration and price before payment."
                    : "No payment was collected. The salon must approve this VIP time before you complete payment."
                  : noPaymentRequired
                    ? "Your appointment is confirmed. No payment or deposit is required."
                    : "Your transfer proof was saved securely. The appointment remains pending until the owner verifies funds received; uploaded proof is not a verified payment."}
            </Txt>
            {s.session ? (
              <Action label="View my appointments" onPress={() => go("appointments")} />
            ) : (
              <Action label="Return home" onPress={() => go("home")} />
            )}
            <LinkText onPress={() => go("home")}>Return home</LinkText>
          </Card>
        </View>
      </Shell>
    );
  return (
    <Shell
      footer={false}
      bottomBar={bookingBar}
      scrollRevision={step}
      scrollToEndRevision={agreementSubmittedRevision || undefined}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: 3, now: step }}
        accessibilityLabel={`Step ${step} of 3 — ${["Choose Your Service", "Choose Your Date & Time", "Payment"][step - 1]}`}
      >
        <View style={{ alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Txt
            serif
            size={width < 390 ? 24 : 28}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={{
              width: "100%",
              textAlign: "center",
              fontFamily: "PlayfairDisplay_400Regular",
            }}
          >
            Book Your Moment!
          </Txt>
          <Txt size={14} color={c.mutedForeground} style={{ width: "100%", textAlign: "center" }}>
            {`Step ${step} of 3 — ${["Choose Your Service", "Choose Your Date & Time", "Payment"][step - 1]}`}
          </Txt>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: width > 600 ? 30 : 2,
          marginVertical: 10,
          marginBottom: 30,
        }}
      >
        {["Your service", "Date & time", "Secure appointment"].map((v, i) => (
          <Pressable
            key={v}
            disabled={i + 1 > step}
            onPress={() => {
              setStep(i + 1);
              setError("");
            }}
            style={{
              flex: 1,
              flexDirection: "column",
              minWidth: 0,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: width < 600 ? 0 : 8,
              paddingVertical: 12,
              gap: 9,
              borderBottomWidth: 2,
              borderColor: step === i + 1 ? c.primary : c.border,
            }}
          >
            <View
              style={{
                minWidth: 32,
                minHeight: 32,
                borderRadius: 14,
                backgroundColor: step === i + 1 ? c.primary : c.muted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ButtonLabel color={step === i + 1 ? c.primaryForeground : c.mutedForeground}>
                {i + 1}
              </ButtonLabel>
            </View>
            <ButtonLabel
              singleLine
              size={width < 600 ? 10 : 16}
              style={{ width: "100%", textAlign: "center" }}
            >
              {v}
            </ButtonLabel>
          </Pressable>
        ))}
      </View>
      {!!error && <ErrorBox message={error} />}
      {step === 1 && (
        <View style={{ flexDirection: width > 900 ? "row" : "column", gap: 28 }}>
          <View style={{ flex: 1 }}>
            <Search value={query} onChange={setQuery} placeholder="Find your service" />
            <ServiceCategories booking value={category} onChange={setCategory} />
            {s.services
              .filter(
                (v) =>
                  v.bookable !== false &&
                  (category === "All" || v.category === category) &&
                  String(v?.name ?? "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((v) => (
                <View
                  key={v.id}
                  style={{
                    height: 82,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: s.selected.includes(v.id) ? c.primary : c.border,
                    borderRadius: 12,
                    marginBottom: 12,
                    backgroundColor: c.card,
                  }}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.selected.includes(v.id) }}
                    onPress={() =>
                      s.setSelected((old) =>
                        old.includes(v.id) ? old.filter((id) => id !== v.id) : [...old, v.id],
                      )
                    }
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      height: 82,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingRight: 42,
                      opacity: pressed ? 0.86 : 1,
                    })}
                  >
                    <Photo name={v.image} style={{ width: 72, height: 82, borderRadius: 10 }} />
                    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                      <Txt
                        bold
                        size={16}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        maxFontSizeMultiplier={1}
                      >
                        {v.name}
                      </Txt>
                      <Txt
                        size={12}
                        color={c.mutedForeground}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1}
                      >
                        {v.description}
                      </Txt>
                      <Txt size={12} numberOfLines={1} maxFontSizeMultiplier={1}>
                        {serviceDurationLabel(v)} · {servicePriceLabel(v)}
                      </Txt>
                    </View>
                    <Icon
                      name={s.selected.includes(v.id) ? "CircleCheck" : "CirclePlus"}
                      size={22}
                      color={s.selected.includes(v.id) ? c.brandAccent : c.mutedForeground}
                      style={{ position: "absolute", right: 8, top: 7 }}
                    />
                  </Pressable>
                  <View style={{ position: "absolute", right: 4, bottom: 4 }}>
                    <FavoriteButton compact kind="service" itemId={v.id} />
                  </View>
                </View>
              ))}
          </View>
          <View style={{ width: width > 900 ? 315 : "100%", gap: 20, alignItems: "center" }}>
            <Card style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
              <Txt serif size={24}>
                Your inspiration
              </Txt>
              <Txt size={13} color={c.mutedForeground} style={{ marginVertical: 13 }}>
                Have a look in mind? Choose a photo to explore a matching service.
              </Txt>
              {!!photo && (
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", height: 180, borderRadius: 12, marginBottom: 12 }}
                />
              )}
              <Action
                label={photo ? "Change photo" : "Choose inspiration photo"}
                icon="ImagePlus"
                iconColor={c.brandAccent}
                secondary
                onPress={() => void choosePhoto()}
                style={{ alignSelf: "center" }}
              />
              {!!photo && (
                <View style={{ gap: 10, marginTop: 15 }}>
                  <Tag>Photo suggestions are not connected</Tag>
                  <Txt size={13}>
                    This photo stays on your device. AI analysis is not connected. Our sample
                    suggestion is a signature silk press; your stylist must confirm suitability and
                    the final quote.
                  </Txt>
                  <LinkText
                    onPress={() => {
                      const v = s.services.find((v) => v.name === "Signature silk press");
                      if (v) s.setSelected((old) => (old.includes(v.id) ? old : [...old, v.id]));
                    }}
                  >
                    Add suggested service
                  </LinkText>
                </View>
              )}
            </Card>
          </View>
        </View>
      )}
      {step === 2 && (
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: width > 800 ? 20 : 10 }}>
          <Card style={{ flex: width > 800 ? 1 : undefined, paddingBottom: 8 }}>
            {!!s.settings?.max_daily_bookings_per_client && null}
            <CalendarPicker allowVipDays roundedSelection value={date} onChange={changeDate} />
            <Txt size={12} color={c.mutedForeground} style={{ marginTop: 8, textAlign: "center" }}>
              {"Tuesday–Saturday, 10 AM–6 PM regular hours · Daily VIP access · "}
              {`\n`}Up to 6 months ahead · Trinidad time (GMT−4)
            </Txt>
          </Card>
          <Card style={{ flex: width > 800 ? 1 : undefined }}>
            <Txt serif size={27} style={{ textAlign: "center" }}>
              Make time for yourself
            </Txt>
            <Txt
              size={14}
              color={c.mutedForeground}
              style={{ marginVertical: 6, textAlign: "center" }}
            >
              {dateLabel(`${date}T12:00:00Z`)}
            </Txt>
            {slotLoading ? (
              <ActivityIndicator color={c.brandAccent} style={{ margin: 35 }} />
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 }}>
                    {displayedSlots.map(
                      ({ minute, vip, percentage, available, disabled }, index) => {
                        const hour = Math.floor(minute / 60);
                        const minutePart = minute % 60;
                        const label = `${hour % 12 || 12}:${String(minutePart).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
                        const timeValue = `${String(hour).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
                        const selected = !!available && time === available.starts_at;
                        return (
                          <React.Fragment key={`${date}-${timeValue}`}>
                            {index === 16 && (
                              <View
                                style={{
                                  width: "100%",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                  paddingHorizontal: 3,
                                  marginVertical: 13,
                                }}
                              >
                                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                                <View style={{ alignItems: "center" }}>
                                  <Txt size={13} bold>
                                    Regular Hours
                                  </Txt>
                                  <Txt size={11} color={c.mutedForeground}>
                                    10:00 AM – 6:00 PM
                                  </Txt>
                                </View>
                                <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
                              </View>
                            )}
                            {index === 48 && (
                              <View
                                style={{
                                  width: "100%",
                                  height: 1,
                                  backgroundColor: c.border,
                                  marginHorizontal: 3,
                                  marginVertical: 16,
                                }}
                              />
                            )}
                            <View style={{ width: "25%", padding: 3 }}>
                              <TimeSlotButton
                                label={label}
                                vip={vip}
                                dayOfWeek={selectedWeekday}
                                time={timeValue}
                                percentage={percentage}
                                selected={selected}
                                disabled={disabled}
                                reducedMotion={reducedMotion}
                                onPress={() => {
                                  if (!available) return;
                                  if (vip) {
                                    setVipDraft({
                                      ...available,
                                      is_vip: true,
                                      vip_percentage: percentage,
                                    });
                                    setVipReasonChoice("");
                                    setVipDetails("");
                                  } else {
                                    setTime(available.starts_at);
                                    setVipReason("");
                                  }
                                }}
                              />
                            </View>
                          </React.Fragment>
                        );
                      },
                    )}
                  </View>
                  <Card
                    style={{
                      gap: 8,
                      borderColor: c.vipFill,
                      backgroundColor: c.vipSurface,
                      paddingVertical: 16,
                    }}
                  >
                    <Txt serif size={22} color={c.vipText} style={{ textAlign: "center" }}>
                      Request VIP Access
                    </Txt>
                    <Txt color={c.vipText} style={{ textAlign: "center", lineHeight: 22 }}>
                      Enjoy exclusive appointment times designed around your lifestyle.
                    </Txt>
                    <Txt size={13} color={c.mutedForeground} style={{ lineHeight: 20 }}>
                      Regular Business Days (Tuesday–Saturday): Appointments starting before 10 AM
                      or ending after 6 PM have a 20% VIP surcharge.
                    </Txt>
                    <Txt size={13} color={c.mutedForeground} style={{ lineHeight: 20 }}>
                      Closed Days (Sunday & Monday): Approved appointments have a 30% VIP surcharge.
                    </Txt>
                    <Txt size={13} bold color={c.vipText} style={{ textAlign: "center" }}>
                      All VIP appointments require approval.
                    </Txt>
                  </Card>
                </View>
                {isVip && (
                  <Card
                    style={{
                      gap: 6,
                      alignItems: "center",
                      borderColor: c.vipFill,
                      backgroundColor: c.vipSurface,
                    }}
                  >
                    <Txt bold color={c.vipText} style={{ textAlign: "center" }}>
                      VIP Access +{vipPercentage}%
                    </Txt>
                    <Txt style={{ textAlign: "center" }}>
                      Priority time access: {money(vipPremium)}
                    </Txt>
                    <Txt size={18} bold style={{ textAlign: "center" }}>
                      Your total: {money(total)}
                    </Txt>
                    <Txt size={12} color={c.mutedForeground} style={{ textAlign: "center" }}>
                      {requiresApproval
                        ? "Request only · Owner approval required before payment."
                        : "Your extended-hours VIP pricing is included upfront."}
                    </Txt>
                  </Card>
                )}
                <Modal
                  visible={!!vipDraft}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setVipDraft(null)}
                >
                  <Pressable
                    onPress={() => setVipDraft(null)}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(0,0,0,0.46)",
                      justifyContent: "flex-end",
                    }}
                  >
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{
                        backgroundColor: c.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 22,
                        gap: 14,
                      }}
                      style={{
                        backgroundColor: c.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: "90%",
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: c.border,
                          alignSelf: "center",
                        }}
                      />
                      <Txt serif size={29} style={{ textAlign: "center" }}>
                        Request VIP Access
                      </Txt>
                      <Card
                        style={{ gap: 7, backgroundColor: c.vipSurface, borderColor: c.vipFill }}
                      >
                        <Txt bold color={c.vipText}>
                          {selected.map((service) => service.name).join(", ")}
                        </Txt>
                        <Txt>
                          {vipDraft
                            ? `${dateLabel(vipDraft.starts_at)} · ${timeLabel(vipDraft.starts_at)}`
                            : ""}
                        </Txt>
                        <Txt>Base price: {money(serviceSubtotal)}</Txt>
                        <Txt>
                          VIP surcharge: +{vipDraft?.vip_percentage || 0}% ·{" "}
                          {money(
                            Math.round(serviceSubtotal * Number(vipDraft?.vip_percentage || 0)) /
                              100,
                          )}
                        </Txt>
                        <Txt size={18} bold>
                          Estimated total:{" "}
                          {money(
                            serviceSubtotal +
                              Math.round(serviceSubtotal * Number(vipDraft?.vip_percentage || 0)) /
                                100,
                          )}
                        </Txt>
                      </Card>
                      <Txt bold>Required Reason for VIP Appointment</Txt>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[
                          "Work Schedule",
                          "Special Occasion",
                          "Travel",
                          "Personal Convenience",
                          "Other",
                        ].map((reason) => (
                          <Chip
                            key={reason}
                            label={reason}
                            selected={vipReasonChoice === reason}
                            onPress={() => setVipReasonChoice(reason)}
                          />
                        ))}
                      </View>
                      <Field
                        label="Additional Details (optional)"
                        value={vipDetails}
                        onChangeText={setVipDetails}
                        multiline
                        placeholder="Anything helpful for Lady J to consider"
                      />
                      <Action
                        label="Request VIP Access"
                        disabled={!vipReasonChoice}
                        onPress={() => {
                          if (!vipDraft || !vipReasonChoice) return;
                          setTime(vipDraft.starts_at);
                          setVipReason(
                            `Reason: ${vipReasonChoice}${vipDetails.trim() ? ` — ${vipDetails.trim()}` : ""}`.slice(
                              0,
                              300,
                            ),
                          );
                          setVipDraft(null);
                        }}
                        style={{ backgroundColor: c.vipFill, borderColor: c.vipFill }}
                      />
                      <Action label="Cancel" secondary onPress={() => setVipDraft(null)} />
                      <Txt size={12} color={c.mutedForeground} style={{ textAlign: "center" }}>
                        No payment or appointment confirmation happens until Lady J approves your
                        request.
                      </Txt>
                    </ScrollView>
                  </Pressable>
                </Modal>
              </View>
            )}
            {!slotLoading && !slots.length && !error && (
              <View style={{ alignItems: "center", paddingVertical: 24, gap: 4 }}>
                <Txt bold style={{ textAlign: "center" }}>
                  Fully Booked
                </Txt>
                <Txt size={13} color={c.mutedForeground} style={{ textAlign: "center" }}>
                  Choose another date to see available regular and VIP times.
                </Txt>
              </View>
            )}
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <LinkText onPress={() => setStep(1)}>← Change or add more services</LinkText>
            </View>
          </Card>
        </View>
      )}
      {step === 3 && (
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", gap: 14 }}>
          <View style={{ alignItems: "center", paddingHorizontal: 14, marginBottom: 8 }}>
            <Txt serif size={width < 390 ? 29 : 34} style={{ textAlign: "center" }}>
              Your Beautiful Transformation Awaits
            </Txt>
            <Txt color={c.mutedForeground} style={{ textAlign: "center", marginTop: 8 }}>
              You&apos;re one step closer to looking and feeling your best.
            </Txt>
          </View>
          {!s.session && !noPaymentRequired && !s.testMode && (
            <Card style={{ gap: 12, borderColor: c.goldBorder, backgroundColor: c.goldSurface }}>
              <Txt bold>Sign in to complete secure payment</Txt>
              <Txt size={13} color={c.mutedForeground}>
                A private account is required to store your receipt, signed PDF, and payment audit
                trail.
              </Txt>
              <Action
                label="Sign In to Continue"
                onPress={() => go("login", { next: "booking" })}
                style={{ alignSelf: "stretch" }}
              />
            </Card>
          )}
          {!s.session && noPaymentRequired && !s.testMode && (
            <Card style={{ gap: 12 }}>
              <Txt size={19} bold>
                Guest contact details
              </Txt>
              <Field label="Full Name" value={guestName} onChangeText={setGuestName} />
              <Field
                label="Email"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
              />
              <Field
                label="Mobile Number"
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
              />
            </Card>
          )}
          <Card style={{ borderColor: c.goldBorder, padding: 18, gap: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <Txt size={20} bold style={{ flex: 1 }}>
                Your Selected Services
              </Txt>
              <LinkText onPress={() => setStep(1)}>Edit Services</LinkText>
            </View>
            {selected.map((service, index) => (
              <View
                key={service.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 11,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Photo name={service.image} style={{ width: 48, height: 48, borderRadius: 10 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={15} bold numberOfLines={1} ellipsizeMode="tail">
                    {service.name}
                  </Txt>
                  <Txt size={12} color={c.mutedForeground}>
                    {serviceDurationLabel(service)}
                  </Txt>
                </View>
                <Txt size={15} bold style={{ textAlign: "right" }}>
                  {money(
                    pricing.quote?.items.find((item) => item.id === service.id)?.price ??
                      service.price,
                  )}
                </Txt>
              </View>
            ))}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 16,
                backgroundColor: c.brandAccentSurface,
                padding: 13,
                borderRadius: 10,
                marginTop: 8,
              }}
            >
              <Txt bold color={c.brandAccent}>
                {selected.length} service{selected.length === 1 ? "" : "s"}
              </Txt>
              <Txt bold color={c.brandAccent}>
                {money(serviceSubtotal)}
              </Txt>
            </View>
          </Card>
          <Card style={{ padding: 18, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="CalendarDays" size={23} color={c.brandAccent} />
              <Txt size={20} bold style={{ flex: 1 }}>
                Your Appointment
              </Txt>
              <LinkText onPress={() => setStep(2)}>Edit</LinkText>
            </View>
            {[
              ["Date", dateLabel(time)],
              ["Time", timeLabel(time)],
              ["Total Duration", formatDuration(duration)],
              ...(isVip ? [["VIP Access", `+${vipPercentage}% · ${money(vipPremium)}`]] : []),
              ["Total Price", money(total)],
            ].map(([label, value], index) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 18,
                  paddingTop: 10,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Txt size={14} color={c.mutedForeground}>
                  {label}
                </Txt>
                <Txt size={14} bold style={{ textAlign: "right" }}>
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
          {customApproval && (
            <Card style={{ padding: 18, gap: 8, borderColor: c.brandAccent }}>
              <Txt size={18} bold style={{ textAlign: "center" }}>
                Custom pricing review
              </Txt>
              <Txt size={13} color={c.mutedForeground} style={{ textAlign: "center" }}>
                Management will confirm the final detangling duration and price before payment.
              </Txt>
            </Card>
          )}
          {isVip && !customApproval && (
            <Card
              style={{ padding: 18, gap: 8, borderColor: c.vipFill, backgroundColor: c.vipSurface }}
            >
              <Txt size={18} bold color={c.vipText} style={{ textAlign: "center" }}>
                Your VIP request
              </Txt>
              <Field
                label="Why do you need this VIP time?"
                value={vipReason}
                onChangeText={setVipReason}
                multiline
                placeholder="Share a short reason for the owner to review"
              />
              <Txt size={12} color={c.mutedForeground} style={{ textAlign: "center" }}>
                Required · 8–300 characters · Your request stays pending until the owner approves
                it.
              </Txt>
            </Card>
          )}
          <View style={{ gap: 8 }}>
            <Txt size={20} bold>
              Service Agreement
            </Txt>
            {agreementSection}
            {agreementReady && (
              <Txt bold color={c.success}>
                Agreement Submitted ✓
              </Txt>
            )}
          </View>
          {!agreementReady ? (
            <Card style={{ padding: 16 }}>
              <Txt size={13} color={c.mutedForeground}>
                Submit your signed agreement to continue securely to payment.
              </Txt>
            </Card>
          ) : (
            <View style={{ gap: 14 }}>
          {s.session && !requiresApproval && !noPaymentRequired && (
            <>
              <Card style={{ padding: 18, gap: 12, borderColor: c.goldBorder }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="Gift" size={22} color={c.tertiary} />
                  <Txt size={20} bold>
                    Have a Gift Card?
                  </Txt>
                </View>
                {!!gifts.received.filter((card) => card.status === "active" && card.balance > 0)
                  .length && (
                  <View style={{ gap: 8 }}>
                    <Txt size={13} color={c.mutedForeground}>
                      Select a linked card
                    </Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {gifts.received
                        .filter((card) => card.status === "active" && card.balance > 0)
                        .map((card) => (
                          <Chip
                            key={card.id}
                            label={`•••• ${card.code.slice(-4)} · ${money(card.balance)}`}
                            selected={giftCode === card.code}
                            onPress={() => {
                              setGiftCode(card.code);
                              setGiftAmount(String(Math.min(card.balance, selectedPaymentAmount)));
                            }}
                          />
                        ))}
                    </View>
                  </View>
                )}
                <Field
                  label="Gift Card Code"
                  value={giftCode}
                  onChangeText={(value) => {
                    setGiftCode(value.toUpperCase());
                    const linked = gifts.received.find(
                      (card) => card.code.toUpperCase() === value.toUpperCase(),
                    );
                    if (linked)
                      setGiftAmount(String(Math.min(linked.balance, selectedPaymentAmount)));
                  }}
                  placeholder="LJ-XXXXXX-XXXXXX"
                />
                {!!giftCode && giftAvailable === 0 && (
                  <Action
                    label="Validate & Link Gift Card"
                    secondary
                    onPress={() => {
                      setBusy(true);
                      setError("");
                      void Promise.resolve(db().rpc("lj_claim_gift_card", { p_code: giftCode }))
                        .then(check)
                        .then(myGiftsReferrals)
                        .then((next) => {
                          setGifts(next);
                          const card = next.received.find((item) => item.code === giftCode);
                          if (card)
                            setGiftAmount(String(Math.min(card.balance, selectedPaymentAmount)));
                        })
                        .catch((e: unknown) =>
                          setError(
                            e instanceof Error ? e.message : "Unable to validate this gift card.",
                          ),
                        )
                        .finally(() => setBusy(false));
                    }}
                  />
                )}
                <Field
                  label="Amount to Apply"
                  value={giftAmount}
                  onChangeText={setGiftAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Txt size={12} color={c.mutedForeground}>
                  Available on selected card: {money(giftAvailable)} · Partial use is welcome.
                </Txt>
              </Card>
              <Card style={{ padding: 18, gap: 12, borderColor: c.brandAccent }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="UsersRound" size={22} color={c.brandAccent} />
                  <Txt size={20} bold>
                    Apply Referral Credit
                  </Txt>
                </View>
                <Txt>Available: {money(gifts.referral_available)}</Txt>
                <Field
                  label="Amount to Apply"
                  value={referralAmount}
                  onChangeText={setReferralAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Txt size={12} color={c.mutedForeground}>
                  Referral credits are separate from Royalty visit benefits and Gift Cards.
                </Txt>
              </Card>
              {(creditCovered > 0 || fullyCovered) && (
                <Card
                  style={{
                    padding: 16,
                    gap: 5,
                    backgroundColor: c.goldSurface,
                    borderColor: c.goldBorder,
                  }}
                >
                  <Txt bold>
                    {fullyCovered
                      ? "Fully Covered by Gift Card / Referral Credit"
                      : `${money(creditCovered)} applied to today’s payment`}
                  </Txt>
                  <Txt size={13} color={c.mutedForeground}>
                    Remaining payment due now: {money(paymentDue)}
                  </Txt>
                </Card>
              )}
            </>
          )}
          <Card style={{ padding: 18, gap: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="WalletCards" size={23} color={c.brandAccent} />
              <View style={{ flex: 1 }}>
                <Txt size={20} bold>
                  Payment Method
                </Txt>
                <Txt size={13} color={c.mutedForeground}>
                  Choose how you&apos;d like to pay your deposit.
                </Txt>
              </View>
            </View>
            {requiresApproval ? (
              <View style={{ gap: 6 }}>
                <Txt bold color={c.vipText}>
                  {customApproval
                    ? "Payment begins after management confirms your custom price."
                    : "Payment begins after owner approval."}
                </Txt>
                <Txt size={13} color={c.mutedForeground}>
                  No payment is collected with this request. You will be invited to complete your
                  selected payment after approval.
                </Txt>
              </View>
            ) : noPaymentRequired ? (
              <Txt bold>No payment or deposit required.</Txt>
            ) : fullyCovered ? (
              <Txt bold>Fully Covered by Gift Card / Referral Credit</Txt>
            ) : (
              <PaymentChoice
                method={method}
                setMethod={setMethod}
                deposit={Math.max(0, deposit - creditCovered)}
                fullTotal={Math.max(0, total - creditCovered)}
                paymentSelection={paymentSelection}
                setPaymentSelection={setPaymentSelection}
                reference={reference}
                setReference={setReference}
                paymentDate={paymentDate}
                setPaymentDate={setPaymentDate}
                receipt={receipt}
                chooseReceipt={(source) => void chooseReceipt(source)}
                onDemoCardReady={setDemoCardReady}
              />
            )}
          </Card>
          <Card style={{ padding: 18, gap: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon name="Calculator" size={23} color={c.brandAccent} />
              <Txt size={20} bold>
                Payment Summary
              </Txt>
            </View>
            {s.session && !noPaymentRequired && <PromoCode pricing={pricing} />}
            {[
              ["Service Subtotal", money(serviceSubtotal)],
              ...(isVip ? [[`VIP Access (+${vipPercentage}%)`, money(vipPremium)]] : []),
              ["Total Price", money(total)],
              [
                "Selected Payment",
                s.testMode
                  ? money(requiresApproval || noPaymentRequired ? 0 : paymentDue)
                  : money(requiresApproval || noPaymentRequired ? 0 : paymentDue),
              ],
              ...(creditCovered > 0 ? [["Gift & Referral Value", `−${money(creditCovered)}`]] : []),
              [
                "Remaining Balance",
                money(
                  requiresApproval ? total : noPaymentRequired ? 0 : total - selectedPaymentAmount,
                ),
              ],
              [
                "Selected Method",
                s.testMode
                  ? method === "card"
                    ? "Demo Credit Card"
                    : "Bank Wire Transfer (Demo)"
                  : requiresApproval
                    ? customApproval
                      ? "After custom price approval"
                      : "After owner approval"
                    : noPaymentRequired
                      ? "No payment required"
                      : fullyCovered
                        ? "Gift / Referral Credit"
                        : "Bank transfer",
              ],
              [
                "Payment Status",
                s.testMode
                  ? method === "card"
                    ? "Test payment only"
                    : "Demo · Not submitted"
                  : requiresApproval
                    ? customApproval
                      ? "Pending Custom Price"
                      : "Pending Owner Approval"
                    : noPaymentRequired
                      ? "No payment due"
                      : fullyCovered
                        ? "Covered"
                        : "Pending Verification",
              ],
            ].map(([label, value], index) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 18,
                  paddingVertical: 11,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: c.border,
                }}
              >
                <Txt size={14} color={c.mutedForeground}>
                  {label}
                </Txt>
                <Txt
                  size={label === "Selected Payment" ? 17 : 14}
                  bold
                  color={
                    label === "Selected Payment" || label === "Payment Status"
                      ? c.brandAccent
                      : c.foreground
                  }
                  style={{ textAlign: "right", flex: 1 }}
                >
                  {value}
                </Txt>
              </View>
            ))}
          </Card>
            </View>
          )}
          {!!error && <ErrorBox message={error} />}
          <Action
            label={
              s.testMode
                ? "Complete Demo Booking"
                : requiresApproval
                  ? "Request VIP Access"
                  : "Confirm My Appointment →"
            }
            prominent
            disabled={barDisabled}
            busy={busy}
            onPress={() => void submit()}
            style={{
              alignSelf: "stretch",
              width: "100%",
              borderRadius: 14,
              ...(requiresApproval ? { backgroundColor: c.vipFill, borderColor: c.vipFill } : {}),
            }}
          />
        </View>
      )}
      <View style={{ height: 40 }} />
    </Shell>
  );
}
