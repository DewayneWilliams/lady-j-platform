import { BottomNavigation } from "../BottomNavigation";
import React, { useRef } from "react";
import { BlurTargetView } from "expo-blur";
import { View, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "../Shell";
import { Txt, useColors } from "../ui";
import { OwnerButton } from "./OwnerUI";
const tabs = [
  { name: "Today", icon: "CalendarCheck2" as const },
  { name: "Calendar", icon: "CalendarRange" as const },
  { name: "Clients", icon: "ContactRound" as const },
  { name: "Business", icon: "BriefcaseBusiness" as const },
  { name: "Maria", icon: "AudioLines" as const },
];
export default function OwnerWorkspace({
  tab,
  onTab,
  demo,
  onSalon,
  onAdd,
  children,
}: {
  tab: string;
  onTab: (name: string) => void;
  demo: boolean;
  onSalon: () => void;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const c = useColors(),
    { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const blurTarget = useRef<View>(null);
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
          justifyContent: desktop ? "flex-start" : "center",
          gap: desktop ? 14 : 4,
          paddingHorizontal: desktop ? 17 : 0,
          paddingVertical: desktop ? 0 : 6,
          borderRadius: desktop ? 12 : 0,
          backgroundColor: desktop && active ? c.goldSurface : "transparent",
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Icon
          name={n.icon}
          size={desktop ? 27 : 32}
          strokeWidth={active ? 2.3 : 1.8}
          color={desktop ? (active ? c.warning : c.mutedForeground) : c.tertiaryForeground}
        />
        <Txt
          size={desktop ? 20 : 12}
          lines={1}
          style={desktop ? undefined : { width: "100%", textAlign: "center" }}
          bold={active}
          color={desktop ? c.foreground : c.tertiaryForeground}
        >
          {n.name}
        </Txt>
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
                <OwnerButton label="View salon" secondary onPress={onSalon} />
              ) : (
                <Pressable
                  accessibilityLabel="View salon"
                  accessibilityRole="button"
                  onPress={onSalon}
                  style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name="ArrowUpRight" size={23} color={c.headerInk} />
                </Pressable>
              )}
            </View>
          </View>
          {demo && (
            <View
              style={{
                backgroundColor: c.goldSurface,
                paddingHorizontal: desktop ? 32 : 20,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: c.goldBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon name="Sparkles" size={19} color={c.warning} />
              <Txt size={16} color={c.warning} style={{ flex: 1 }}>
                Demo workspace · Fictional records
              </Txt>
            </View>
          )}
          <BlurTargetView
            ref={blurTarget}
            style={{ flex: 1, minHeight: 0, backgroundColor: c.background }}
          >
            {children}
          </BlurTargetView>
          {!desktop && (
            <BottomNavigation
              blurTarget={blurTarget}
              accessibilityLabel="Owner navigation"
              items={tabs.map((n) => ({ key: n.name, label: n.name, icon: n.icon }))}
              selectedKey={tab}
              onSelect={onTab}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
