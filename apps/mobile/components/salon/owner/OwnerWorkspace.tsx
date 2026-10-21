import { BottomNavigation } from "../BottomNavigation";
import React from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "../Shell";
import { Txt, ButtonLabel, useColors } from "../ui";
import { OwnerButton } from "./OwnerUI";
const tabs = [
  { name: "Today", icon: "Gem" as const },
  { name: "Calendar", icon: "CalendarRange" as const },
  { name: "Clients", icon: "UsersRound" as const },
  { name: "Business", icon: "BriefcaseBusiness" as const },
  { name: "Maria", icon: "AudioLines" as const },
];
export default function OwnerWorkspace({
  tab,
  onTab,
  demo,
  onSalon,
  onAdd,
  onAction,
  children,
}: {
  tab: string;
  onTab: (name: string) => void;
  demo: boolean;
  onSalon: () => void;
  onAdd: () => void;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const c = useColors(),
    { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const navItem = (n: (typeof tabs)[number]) => {
    const active = n.name === tab;
    return (
      <Pressable
        key={n.name}
        accessibilityRole="tab"
        accessibilityLabel={n.name}
        accessibilityState={{ selected: active }}
        aria-selected={active}
        onPress={() => onTab(n.name)}
        style={({ pressed }) => ({
          minHeight: desktop ? 56 : 78,
          flexBasis: desktop ? undefined : 0,
          flexShrink: desktop ? undefined : 1,
          minWidth: 0,
          flexGrow: desktop ? undefined : 1,
          flexDirection: desktop ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: desktop ? 14 : 4,
          paddingHorizontal: desktop ? 12 : 0,
          paddingVertical: 12,
          borderRadius: desktop ? 12 : 0,
          backgroundColor: desktop && active ? c.goldSurface : "transparent",
          opacity: pressed ? 0.98 : 1,
        })}
      >
        <Icon
          name={n.icon}
          size={desktop ? 27 : 32}
          strokeWidth={active ? 2.3 : 1.8}
          color={desktop ? (active ? c.warning : c.mutedForeground) : c.tertiaryForeground}
        />
        <ButtonLabel
          size={desktop ? 20 : 18}
          style={desktop ? undefined : { width: "100%", textAlign: "center" }}
          color={desktop ? c.foreground : c.tertiaryForeground}
        >
          {n.name}
        </ButtonLabel>
        {desktop && n.name === "Maria" && (
          <View
            style={{
              marginLeft: "auto",
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: c.primary,
            }}
          />
        )}
      </Pressable>
    );
  };
  return (
    <SafeAreaView
      onStartShouldSetResponderCapture={() => {
        onAction();
        return false;
      }}
      style={{ flex: 1, minHeight: 0, backgroundColor: c.headerGold }}
      edges={{ top: "additive", left: "additive", right: "additive", bottom: "off" }}
    >
      <View style={{ flex: 1, minHeight: 0, flexDirection: "row" }}>
        {desktop && (
          <View
            style={{
              width: 246,
              borderRightWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
              paddingHorizontal: 21,
              paddingTop: 28,
              paddingBottom: 24,
            }}
          >
            <Brand />
            <Txt size={16} color={c.warning} style={{ marginTop: 23, marginBottom: 26 }}>
              Owner workspace
            </Txt>
            <View accessibilityLabel="Owner navigation" style={{ gap: 7 }}>
              {tabs.map(navItem)}
            </View>
            <View style={{ marginTop: 28 }}>
              <OwnerButton label="Appointment" icon="Plus" onPress={onAdd} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 20, gap: 9 }}>
              <Icon name="ShieldCheck" size={24} color={c.warning} />
              <Txt size={18} bold>
                Just for the owner
              </Txt>
              <Txt size={16} color={c.mutedForeground}>
                Private records. Personal care.
              </Txt>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
          <View
            style={{
              height: desktop ? 86 : 79,
              paddingHorizontal: desktop ? 32 : 20,
              backgroundColor: c.headerGold,
              borderBottomWidth: 1,
              borderColor: c.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {desktop ? (
              <View>
                <Txt size={22} bold color={c.headerInk}>
                  {tab === "Today" ? "Today’s appointments" : tab}
                </Txt>
                <Txt size={16} color={c.headerInk}>
                  Lady J Salon & Day Spa
                </Txt>
              </View>
            ) : (
              <Brand onGold />
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <ThemeToggle color={c.headerInk} />
              {desktop ? (
                <OwnerButton
                  label={demo ? "Client View" : "View salon"}
                  secondary
                  onPress={onSalon}
                />
              ) : (
                <Pressable
                  accessibilityLabel={demo ? "Open Client View" : "View salon"}
                  accessibilityRole="button"
                  onPress={onSalon}
                  style={{
                    minWidth: 92,
                    height: 48,
                    paddingHorizontal: 7,
                    flexDirection: "row",
                    gap: 5,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="ArrowUpRight" size={18} color={c.headerInk} />
                  <Txt size={11} bold color={c.headerInk}>
                    {demo ? "Client View" : "Salon"}
                  </Txt>
                </Pressable>
              )}
            </View>
          </View>
          {demo && (
            <View
              style={{
                backgroundColor: c.goldSurface,
                paddingHorizontal: desktop ? 32 : 20,
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderColor: c.goldBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="Sparkles" size={15} color={c.warning} />
              <Txt size={12} color={c.warning} style={{ flex: 1 }}>
                Sample data
              </Txt>
            </View>
          )}
          <BottomNavigation
            items={tabs.map((n) => ({ key: n.name, label: n.name, icon: n.icon }))}
            selectedKey={tab}
            onSelect={onTab}
          >
            {children}
          </BottomNavigation>
        </View>
      </View>
    </SafeAreaView>
  );
}
