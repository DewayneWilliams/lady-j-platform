import { BlurTargetView } from "expo-blur";
import { BottomNavigation, useBottomNavigationSpacing } from "./BottomNavigation";
import React, { useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { salonIdentity } from "@/lib/salon/identity";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import HeaderLanguageSelector from "./HeaderLanguageSelector";
import { clientNavigationCopy } from "@/lib/salon/clientLanguage";
import { useTheme } from "@/theming/ThemeProvider";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Txt, useColors, shared, LinkText, ErrorBox } from "./ui";
export function useNav() {
  const router = useRouter();
  return (page: string, params: Record<string, string> = {}) => {
    if (page === "home") router.push("/home");
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
        lines={1}
        color={onGold ? c.headerInk : c.primary}
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
        lines={1}
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
}: {
  children: React.ReactNode;
  wide?: boolean;
  footer?: boolean;
}) {
  const c = useColors(),
    { width } = useWindowDimensions(),
    go = useNav(),
    path = usePathname();
  const s = useSalon();
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  const blurTarget = useRef<View>(null);
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
  const { theme } = useTheme();
  const copy = clientNavigationCopy[s.clientLanguage];
  const nav = [
    { name: copy.home, page: "home", icon: "HouseHeart" as const },
    { name: copy.services, page: "services", icon: "Scissors" as const },
    { name: copy.products, page: "boutique", icon: "ShoppingBasket" as const },
    { name: copy.workshops, page: "workshops", icon: "BookOpenCheck" as const },
    { name: copy.contact, page: "contact", icon: "MessagesSquare" as const },
    { name: copy.account, page: "account", icon: "CircleUserRound" as const },
  ];

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
              gap: compact ? 4 : 20,
              minWidth: 0,
            },
          ]}
        >
          <View style={{ marginRight: compact ? 0 : "auto", flexShrink: 0 }}>
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
              minHeight: compact ? 52 : 56,
              height: "auto",
              paddingHorizontal: compact ? 8 : 20,
              paddingVertical: 8,
              flexGrow: compact ? 1 : 0,
              flexShrink: compact ? 1 : 0,
              flexBasis: compact ? 0 : "auto",
              minWidth: 0,
              maxWidth: compact ? 248 : undefined,
            }}
          >
            <Txt
              size={Number.parseFloat(
                (compact
                  ? theme.typography.headerButton?.fontSize
                  : theme.typography.button?.fontSize) || "16",
              )}
              bold
              color={c.primaryForeground}
              style={{ flexShrink: 1, textAlign: "center", lineHeight: compact ? 18 : 24 }}
            >
              {copy.booking}
            </Txt>
          </Button>
        </View>
      </View>
      <BlurTargetView ref={blurTarget} style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void reload()}
              tintColor={c.primary}
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
                <ActivityIndicator color={c.primary} />
                <Txt style={{ textAlign: "center", marginTop: 15 }}>
                  Preparing your Lady J experience…
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
                  <Txt size={12} style={{ opacity: 0.6, marginTop: 15 }}>
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
                    <Txt size={11} style={{ opacity: 0.6, marginTop: 12 }}>
                      Catalog & prices: demo data
                    </Txt>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </BlurTargetView>
      <BottomNavigation
        blurTarget={blurTarget}
        accessibilityLabel="Customer navigation"
        items={nav.map((n) => ({ key: n.page, label: n.name, icon: n.icon }))}
        selectedKey={(() => {
          const page = path.slice(1);
          if (["product", "bag", "checkout"].includes(page)) return "boutique";
          if (page === "workshop") return "workshops";
          if (
            [
              "login",
              "register",
              "profile",
              "appointments",
              "orders",
              "payments",
              "agreements",
              "my-workshops",
            ].includes(page)
          )
            return "account";
          return page;
        })()}
        onSelect={(page) => {
          if (path === "/" + page) {
            scroll.current?.scrollTo({ y: 0, animated: true });
            void reload();
          } else if (page === "home") router.navigate("/home");
          else router.navigate({ pathname: "/[page]", params: { page } });
        }}
      />
      {!!s.notice && (
        <Pressable
          onPress={() => s.notify("")}
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            bottom: navigationSpacing + 8,
            left: 20,
            right: 20,
            maxWidth: 600,
            alignSelf: "center",
            backgroundColor: c.foreground,
            padding: 18,
            borderRadius: 12,
            shadowOpacity: 0.12,
            shadowRadius: 16,
          }}
        >
          <Txt color={c.background} size={14}>
            {s.notice}
          </Txt>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
