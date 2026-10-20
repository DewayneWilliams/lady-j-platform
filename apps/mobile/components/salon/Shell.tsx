import StatusNotice from "./StatusNotice";
import { useBottomNavigationSpacing } from "./BottomNavigation";
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { salonIdentity } from "@/lib/salon/identity";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import HeaderLanguageSelector from "./HeaderLanguageSelector";
import { clientNavigationCopy } from "@/lib/salon/clientLanguage";
import { useTheme } from "@/theming/ThemeProvider";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Txt, ButtonLabel, useColors, shared, LinkText, ErrorBox } from "./ui";
export function useNav() {
  const router = useRouter();
  return (page: string, params: Record<string, string> = {}) => {
    const tabs: Record<
      string,
      "/home" | "/services" | "/boutique" | "/workshops" | "/contact" | "/account"
    > = {
      home: "/home",
      services: "/services",
      boutique: "/boutique",
      workshops: "/workshops",
      contact: "/contact",
      account: "/account",
    };
    if (tabs[page]) router.navigate({ pathname: tabs[page], params });
    else if (page === "owner") router.push("/owner");
    else router.push({ pathname: "/[page]", params: { page, ...params } });
  };
}
export function Brand({
  onGold = false,
  compact = false,
}: {
  onGold?: boolean;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const go = useNav();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lady J home"
      onPress={() => go("home")}
      style={{ flexShrink: compact ? 0 : 1, width: compact ? 84 : undefined }}
    >
      <Txt
        serif
        size={
          compact ? Number.parseFloat(theme.typography.headerBrand?.fontSize || "24") : undefined
        }
        color={onGold ? c.headerInk : c.brandAccent}
        style={{
          fontFamily: theme.typography.headerBrand?.fontFamily,
          lineHeight: compact ? 32 : 40,
          letterSpacing: -0.3,
        }}
      >
        Lady J
      </Txt>
      <Txt
        size={Number.parseFloat(
          (compact
            ? theme.typography.headerCaption?.fontSize
            : theme.typography.caption?.fontSize) || "14",
        )}
        color={onGold ? c.headerInk : c.mutedForeground}
        style={{ letterSpacing: 0.1, marginTop: 2 }}
      >
        Salon & Day Spa
      </Txt>
    </Pressable>
  );
}
export default function Shell({
  children,
  wide = false,
  footer = true,
  scrollRevision,
}: {
  children: React.ReactNode;
  wide?: boolean;
  footer?: boolean;
  scrollRevision?: string | number;
}) {
  const c = useColors(),
    { width } = useWindowDimensions(),
    go = useNav();
  const s = useSalon();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollRevision !== undefined) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [scrollRevision]);
  const navigationSpacing = useBottomNavigationSpacing();
  const [refreshing, setRefreshing] = useState(false);
  const reload = async () => {
    setRefreshing(true);
    try {
      await Promise.all([s.refresh(), s.refreshPrivate()]);
    } finally {
      setRefreshing(false);
    }
  };
  const desktop = width >= 1100;
  const compact = width < 760;
  const copy = clientNavigationCopy[s.clientLanguage];

  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: 0, backgroundColor: c.headerGold }}
      edges={{ top: "additive", left: "additive", right: "additive", bottom: "off" }}
    >
      <View
        style={{
          backgroundColor: c.headerGold,
          paddingHorizontal: compact ? 12 : 40,
          paddingVertical: compact ? 12 : 20,
          flexShrink: 0,
        }}
      >
        <View
          accessibilityLabel="Salon header"
          style={[
            shared.responsive,
            {
              maxWidth: 1280,
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "center",
              gap: compact ? 3 : 20,
              minWidth: 0,
            },
          ]}
        >
          <View style={{ marginRight: "auto", flexShrink: 0 }}>
            <Brand onGold compact={compact} />
          </View>
          <HeaderLanguageSelector compact={compact} />
          <ThemeToggle color={c.headerInk} label={copy.theme} />
          <Button
            accessibilityLabel={copy.booking}
            onPress={() =>
              go(s.session ? "booking" : "register", s.session ? {} : { next: "booking" })
            }
            style={{
              backgroundColor: c.primary,
              borderRadius: 14,
              minHeight: 48,
              height: "auto",
              paddingHorizontal: compact ? 7 : 12,
              paddingVertical: 12,
              flexGrow: compact ? 1 : 0,
              flexShrink: compact ? 1 : 0,
              flexBasis: "auto",
              minWidth: 0,
              maxWidth: "100%",
            }}
          >
            <ButtonLabel size={compact ? 11 : 20} color={c.primaryForeground}>
              {copy.booking}
            </ButtonLabel>
          </Button>
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void reload()}
              tintColor={c.brandAccent}
            />
          }
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            minHeight: 0,
            backgroundColor: c.background,
          }}
          contentContainerStyle={{ paddingBottom: navigationSpacing + 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              shared.responsive,
              {
                maxWidth: wide ? 1280 : 1200,
                paddingHorizontal: desktop ? 32 : 20,
                paddingTop: desktop ? 32 : 24,
              },
            ]}
          >
            {!!s.error && (
              <ErrorBox
                message={`We couldn’t load the salon catalog. ${s.error}`}
                retry={() => void s.refresh()}
              />
            )}
            {s.loading && s.services.length === 0 ? (
              <View style={{ padding: 60 }}>
                <ActivityIndicator color={c.brandAccent} />
                <Txt style={{ textAlign: "center", marginTop: 15 }}>
                  Preparing your Lady J experience
                </Txt>
              </View>
            ) : (
              children
            )}
          </View>
          {footer && (
            <View
              style={{
                borderTopWidth: 1,
                borderColor: c.border,
                paddingHorizontal: desktop ? 40 : 20,
                paddingVertical: 34,
                marginTop: 32,
              }}
            >
              <View
                style={[
                  shared.responsive,
                  {
                    flexDirection: desktop ? "row" : "column",
                    justifyContent: "space-between",
                    gap: 25,
                  },
                ]}
              >
                <View>
                  <Brand />
                  <Txt size={12} color={c.mutedForeground} style={{ marginTop: 15 }}>
                    Exceptional care. Effortless beauty.
                  </Txt>
                  <View style={{ flexDirection: "row", gap: 9, maxWidth: 320, marginTop: 16 }}>
                    <Icon name="MapPin" size={19} color={c.warning} />
                    <Txt size={15} style={{ flex: 1 }}>
                      {s.settings?.address || salonIdentity.address}
                    </Txt>
                  </View>
                  <Txt size={13} color={c.mutedForeground} style={{ marginTop: 10 }}>
                    Tuesday–Saturday · 10 AM–6 PM
                  </Txt>
                </View>
                <View style={{ flexDirection: "row", gap: desktop ? 40 : 28, flexWrap: "wrap" }}>
                  <View>
                    {["About", "Contact", "Gallery", "Promotions"].map((v) => (
                      <LinkText key={v} onPress={() => go(v.toLowerCase())}>
                        {v}
                      </LinkText>
                    ))}
                  </View>
                  <View>
                    {["Booking policies", "Privacy", "Terms"].map((v) => (
                      <LinkText
                        key={v}
                        onPress={() => go(v === "Booking policies" ? "policies" : v.toLowerCase())}
                      >
                        {v}
                      </LinkText>
                    ))}
                    <LinkText onPress={() => go("owner-login")}>Owner access</LinkText>
                  </View>
                  <View>
                    <Txt size={12} style={{ opacity: 0.7, marginBottom: 8 }}>
                      Your appearance
                    </Txt>
                    <ThemeToggle />
                    <Txt size={11} color={c.mutedForeground} style={{ marginTop: 12 }}>
                      Sample data
                    </Txt>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      {!!s.notice && <StatusNotice message={s.notice} onDismiss={() => s.notify("")} />}
    </SafeAreaView>
  );
}
