import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Image,
  ImageStyle,
} from "react-native";
import { useTheme } from "@/theming/ThemeProvider";
import { Button } from "@/components/ui/button";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { fonts } from "@/lib/salon/design";
import { catalogPhotoSource } from "@/lib/salon/images";
export function useColors() {
  return useTheme().theme.colors;
}
export function Txt({
  children,
  size,
  color,
  style,
  serif = false,
  bold = false,
  lines,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  serif?: boolean;
  bold?: boolean;
  lines?: number;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const typography = serif ? theme.typography.h2 : theme.typography.body;
  const fontSize = size ?? Number.parseFloat(typography?.fontSize || "16");
  const fontFamily = serif
    ? typography?.fontFamily || fonts.display
    : bold
      ? theme.typography.button?.fontFamily || fonts.bold
      : typography?.fontFamily || fonts.body;
  return (
    <Text
      numberOfLines={lines}
      style={[
        {
          fontFamily,
          fontSize,
          lineHeight: fontSize * (serif ? 1.25 : 1.5),
          letterSpacing: serif ? -0.6 : 0,
          color: color || c.foreground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Heading({
  children,
  sub,
  action,
}: {
  children: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 22,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt serif>{children}</Txt>
        {sub && (
          <Txt color={undefined} style={{ marginTop: 6, opacity: 0.65 }}>
            {sub}
          </Txt>
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
  prominent = false,
  icon,
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  gold?: boolean;
  prominent?: boolean;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const contentColor = secondary ? c.foreground : gold ? c.tertiaryForeground : c.primaryForeground;
  return (
    <Button
      variant={secondary ? "outline" : "default"}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        {
          minHeight: prominent ? 60 : 50,
          borderRadius: 11,
          paddingHorizontal: 22,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-start",
          opacity: disabled ? 0.5 : 1,
        },
        gold && !secondary
          ? { backgroundColor: c.tertiary, borderColor: c.tertiary, borderWidth: 1 }
          : undefined,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          <Txt size={prominent ? 16 : 14} bold color={contentColor}>
            {label}
          </Txt>
          {icon && <Icon name={icon} size={prominent ? 20 : 17} color={contentColor} />}
        </>
      )}
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
        opacity: pressed ? 0.5 : 1,
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
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Txt size={14} bold color={c.secondaryForeground}>
        {children}
      </Txt>
    </Pressable>
  );
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 16,
          padding: 22,
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
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: gold ? c.muted : c.secondary,
      }}
    >
      <Txt size={11} bold color={gold ? c.warning : c.secondaryForeground}>
        {children}
      </Txt>
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
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
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
        paddingHorizontal: 19,
        minHeight: 44,
        paddingVertical: 11,
        borderRadius: 24,
        backgroundColor: selected ? c.foreground : c.card,
        borderWidth: 1,
        borderColor: selected ? c.foreground : c.border,
      }}
    >
      <Txt size={13} color={selected ? c.background : c.foreground}>
        {label}
      </Txt>
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
        paddingVertical: 9,
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
      <Txt size={14} style={{ flex: 1 }}>
        {label}
      </Txt>
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
