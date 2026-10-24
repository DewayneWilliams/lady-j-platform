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
  ActivityIndicator,
  Image,
  ImageStyle,
  ScrollView,
} from "react-native";
import { useTheme } from "@/theming/ThemeProvider";
import { Button } from "@/components/ui/button";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { fonts, fieldLabel } from "@/lib/salon/design";
import { catalogPhotoSource } from "@/lib/salon/images";
import SubtleShimmer from "./SubtleShimmer";
export function useColors() {
  return useTheme().theme.colors;
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
        textAlign: "center",
        includeFontPadding: true,
        ...style,
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: compact ? 8 : 22,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: sub ? 5 : 0 }}>
        <ScrollView>
          <Txt
            serif
            size={headingSize}
            accessibilityRole="header"
            numberOfLines={singleLine ? 1 : undefined}
            adjustsFontSizeToFit={singleLine}
            minimumFontScale={singleLine ? 0.62 : undefined}
            style={{ lineHeight: headingSize * 1.16 }}
          >
            {children}
          </Txt>
        </ScrollView>
        {!!sub && (
          <ScrollView>
            <Txt color={theme.colors.mutedForeground}>{sub}</Txt>
          </ScrollView>
        )}
      </View>
      {action}
    </View>
  );
}
export function Action({
  label,
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
}: {
  label: string;
  onPress: () => void;
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
}) {
  const c = useColors();
  const contentColor =
    disabled || busy
      ? c.mutedForeground
      : secondary
        ? c.foreground
        : inverted
          ? c.background
          : gold
            ? c.tertiaryForeground
            : c.primaryForeground;
  return (
    <Button
      accessibilityLabel={label}
      testID={
        id ||
        `action-${label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`
      }
      variant={secondary ? "outline" : "default"}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        {
          minHeight: prominent ? 56 : 52,
          borderRadius: 11,
          paddingHorizontal: 12,
          paddingVertical: prominent ? 14 : 12,
          height: "auto",
          maxWidth: "100%",
          minWidth: 0,
          flexShrink: 1,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          overflow: "hidden",
          opacity: 1,
        },
        gold && !secondary
          ? { backgroundColor: c.tertiary, borderColor: c.tertiary, borderWidth: 1 }
          : undefined,
        inverted && !secondary
          ? { backgroundColor: c.foreground, borderColor: c.foreground, borderWidth: 1 }
          : undefined,
        style,
        (disabled || busy) && { backgroundColor: c.muted, borderColor: c.border, borderWidth: 1 },
      ]}
      className={"lg:items-center lg:justify-center"}
    >
      {shimmer && !disabled && !busy && (
        <SubtleShimmer interval={shimmerInterval} travelDistance={620} borderRadius={11} />
      )}
      {busy && <ActivityIndicator color={contentColor} />}
      <ButtonLabel size={prominent ? 22 : secondary ? 18 : 20} color={contentColor}>
        {label}
      </ButtonLabel>
      {!busy && icon && <Icon name={icon} size={22} color={iconColor || contentColor} />}
    </Button>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={name} color={c.foreground} size={21} />
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
        minHeight: 48,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        paddingHorizontal: 10,
        paddingVertical: 12,
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
          borderRadius: 16,
          padding: 18,
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
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 6,
        maxWidth: "100%",
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 1,
        backgroundColor: gold ? c.muted : c.secondary,
      }}
    >
      <ButtonLabel color={gold ? c.warning : c.secondaryForeground}>{children}</ButtonLabel>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType = "default",
  large = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
  large?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8, marginBottom: 17 }}>
      <Txt size={large ? 20 : 14} bold>
        {fieldLabel(label)}
      </Txt>
      <TextInput
        accessibilityLabel={fieldLabel(label)}
        testID={`field-${label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" || secureTextEntry ? "none" : "sentences"}
        style={{
          fontFamily: fonts.body,
          fontSize: large ? 20 : 16,
          padding: 15,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          color: c.foreground,
          backgroundColor: c.background,
          minHeight: large ? 58 : 52,
          ...(multiline ? { minHeight: 100, textAlignVertical: "top" } : {}),
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
        minHeight: 48,
        maxWidth: "100%",
        minWidth: 0,
        flexShrink: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
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
        minHeight: 48,
        paddingVertical: 12,
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
    <Card style={{ paddingVertical: 40, alignItems: "center", gap: 12 }}>
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
  return (
    <Card style={{ borderColor: c.destructive, marginBottom: 16 }}>
      <Txt color={c.destructive}>{message}</Txt>
      {retry && <LinkText onPress={retry}>Try again</LinkText>}
    </Card>
  );
}
export const shared = {
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { marginBottom: 42 },
  center: { alignItems: "center", justifyContent: "center" },
  responsive: { width: "100%", maxWidth: 1200, alignSelf: "center" },
} satisfies Record<string, ViewStyle>;
