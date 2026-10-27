import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ViewStyle,
  TextStyle,
  type TextProps,
  type ViewProps,
  Image,
  ImageStyle,
} from "react-native";
import { useTheme } from "@/theming/ThemeProvider";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { fonts, fieldLabel } from "@/lib/salon/design";
import { catalogPhotoSource } from "@/lib/salon/images";
export function useColors() {
  return useTheme().theme.colors;
}
export function safeControlLabel(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
export function controlTestId(prefix: string, value: unknown, fallback: string) {
  const label = safeControlLabel(value, fallback);
  return `${prefix}-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}
function visibleText(value: React.ReactNode): React.ReactNode {
  if (typeof value === "string") return value.replace(/\s*·\s*Demo\b/gi, "");
  return Array.isArray(value) ? value.map(visibleText) : value;
}
export function Txt({
  children,
  size,
  color,
  style,
  serif = false,
  bold = false,
  onTextLayout,
  ...textProps
}: Omit<TextProps, "style"> & {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  serif?: boolean;
  bold?: boolean;
  onTextLayout?: TextProps["onTextLayout"];
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const typography = serif ? theme.typography.h2 : theme.typography.body;
  const fontSize = size ?? Number.parseFloat(typography?.fontSize || "16");
  const fontFamily = serif
    ? typography?.fontFamily || fonts.display
    : bold
      ? fonts.bold
      : typography?.fontFamily || fonts.body;
  return (
    <Text
      {...textProps}
      onTextLayout={onTextLayout}
      style={[
        {
          fontFamily,
          fontSize,
          lineHeight: fontSize * (serif ? 1.25 : 1.5),
          letterSpacing: serif ? -0.6 : 0,
          color: color || c.foreground,
          flexShrink: 1,
          minWidth: 0,
        },
        style,
      ]}
    >
      {visibleText(children)}
    </Text>
  );
}
/** Shared action typography: wraps at the available width without shrinking the font. */
export function ButtonLabel({
  children,
  size = 18,
  color,
  style,
  onTextLayout,
  singleLine = false,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  onTextLayout?: TextProps["onTextLayout"];
  singleLine?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Txt
      size={size}
      bold
      color={color}
      onTextLayout={onTextLayout}
      numberOfLines={singleLine ? 1 : undefined}
      ellipsizeMode={singleLine ? "clip" : undefined}
      adjustsFontSizeToFit={singleLine}
      minimumFontScale={singleLine ? 0.72 : undefined}
      style={{
        fontFamily: theme.typography.button?.fontFamily || fonts.action,
        lineHeight: size * 1.25,
        includeFontPadding: true,
        ...style,
        justifyContent: "space-around",
        flexDirection: "column",
      }}
    >
      {children}
    </Txt>
  );
}
export function Heading({
  children,
  sub,
  action,
  compact = false,
  singleLine = false,
}: {
  children: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
  compact?: boolean;
  singleLine?: boolean;
}) {
  const { theme } = useTheme();
  const headingSize = Number.parseFloat(theme.typography.h1?.fontSize || "43");
  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        marginBottom: compact ? 6 : 16,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flex: 1,
          minWidth: 0,
          gap: sub ? 5 : 0,
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Txt
          serif
          size={compact ? Math.min(headingSize, 28) : headingSize}
          numberOfLines={singleLine ? 1 : undefined}
          adjustsFontSizeToFit={singleLine}
          minimumFontScale={singleLine ? 0.72 : undefined}
          className={
            "text-sm w-80 mr-0 2xl:mr-40 lg:text-center lg:justify-center lg:flex-col lg:w-64 lg:pt-20 text-center pt-4"
          }
        >
          {children}
        </Txt>
        {!!sub && (
          <Txt color={theme.colors.mutedForeground} className={"pb-8"}>
            {sub}
          </Txt>
        )}
      </View>
      {action}
    </View>
  );
}
export function Action({
  label: labelProp,
  onPress,
  secondary = false,
  gold = false,
  inverted = false,
  prominent = false,
  icon,
  iconColor,
  disabled = false,
  busy = false,
  shimmer = false,
  shimmerInterval = 9000,
  style,
  id,
  contentColor: contentColorOverride,
}: {
  label?: string;
  onPress?: () => void;
  secondary?: boolean;
  gold?: boolean;
  inverted?: boolean;
  prominent?: boolean;
  icon?: IconName;
  iconColor?: string;
  disabled?: boolean;
  busy?: boolean;
  shimmer?: boolean;
  shimmerInterval?: number;
  style?: ViewStyle;
  id?: string;
  contentColor?: string;
}) {
  const c = useColors();
  const label = safeControlLabel(labelProp, "Action");
  const unavailable = disabled || busy || !onPress;
  const contentColor =
    contentColorOverride ||
    (unavailable
      ? c.mutedForeground
      : secondary
        ? c.foreground
        : inverted
          ? c.background
          : gold
            ? c.primaryForeground
            : c.primaryForeground);
  return null;
}
export function IconButton({
  name,
  onPress,
  label: labelProp,
}: {
  name?: IconName;
  onPress?: () => void;
  label?: string;
}) {
  const c = useColors();
  const label = safeControlLabel(labelProp, "Icon action");
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={name || "Circle"} color={c.foreground} size={21} />
    </Pressable>
  );
}
export function LinkText({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 44,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ButtonLabel color={c.secondaryForeground}>{children}</ButtonLabel>
    </Pressable>
  );
}
export function Card({
  children,
  style,
  ...viewProps
}: Omit<ViewProps, "children" | "style"> & { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View
      {...viewProps}
      style={[
        {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 11,
          height: "auto",
          minHeight: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Tag({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  const c = useColors();
  return null;
}
export function Field({
  label: labelProp,
  value: valueProp,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType = "default",
  large = false,
}: {
  label?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
  large?: boolean;
}) {
  const c = useColors();
  const label = safeControlLabel(labelProp, "Field");
  const value = typeof valueProp === "string" ? valueProp : "";
  return (
    <View style={{ gap: 4, marginBottom: 10 }}>
      <Txt size={large ? 20 : 14} bold>
        {fieldLabel(label)}
      </Txt>
      <TextInput
        accessibilityLabel={fieldLabel(label)}
        testID={controlTestId("field", label, "field")}
        value={value}
        onChangeText={onChangeText}
        editable={Boolean(onChangeText)}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" || secureTextEntry ? "none" : "sentences"}
        style={{
          fontFamily: fonts.body,
          fontSize: large ? 20 : 16,
          paddingHorizontal: 13,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          color: c.foreground,
          backgroundColor: c.background,
          minHeight: large ? 50 : 44,
          ...(multiline ? { minHeight: 88, textAlignVertical: "top" } : {}),
        }}
      />
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        minHeight: 44,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: selected ? c.foreground : c.card,
        borderWidth: 1,
        borderColor: selected ? c.foreground : c.border,
      }}
    >
      <ButtonLabel color={selected ? c.background : c.foreground}>{label}</ButtonLabel>
    </Pressable>
  );
}
export function Check({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        minHeight: 44,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 23,
          height: 23,
          borderWidth: 1,
          borderColor: checked ? c.primary : c.mutedForeground,
          borderRadius: 6,
          backgroundColor: checked ? c.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Icon name="Check" size={16} color={c.primaryForeground} />}
      </View>
      <ButtonLabel style={{ flex: 1, textAlign: "left" }}>{label}</ButtonLabel>
    </Pressable>
  );
}
export function Photo({ name, style }: { name: string; style?: ImageStyle }) {
  return (
    <Image
      source={catalogPhotoSource(name)}
      resizeMode="cover"
      style={[{ width: "100%", height: 220 }, style]}
    />
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card
      style={{
        paddingVertical: 30,
        alignItems: "center",
        gap: 10,
        flexDirection: "column",
      }}
    >
      <Txt serif size={26} style={{ textAlign: "center" }}>
        {title}
      </Txt>
      <Txt style={{ textAlign: "center", maxWidth: 440, opacity: 0.7 }}>{body}</Txt>
      {action}
    </Card>
  );
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  const c = useColors();
  return null;
}
export const shared = {
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  section: { marginBottom: 22 },
  center: { alignItems: "center", justifyContent: "center" },
  responsive: { width: "100%", maxWidth: 1200, alignSelf: "center" },
} satisfies Record<string, ViewStyle>;
