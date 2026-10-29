import DevelopmentModeSelector from "./DevelopmentModeSelector";
import StatusNotice from "./StatusNotice";
import { useBottomNavigationSpacing } from "./BottomNavigation";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  View,
  ScrollView,
  Platform,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import HeaderLanguageSelector from "./HeaderLanguageSelector";
import { clientNavigationCopy } from "@/lib/salon/clientLanguage";
import { useTheme } from "@/theming/ThemeProvider";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { developmentDemoSelector } from "@/lib/salon/testMode";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { Txt, ButtonLabel, useColors, shared, LinkText, ErrorBox } from "./ui";
import FloatingBag from "./FloatingBag";
import SubtleShimmer from "./SubtleShimmer";
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
    else if (page === "owner") {
      if (developmentDemoSelector) router.navigate("/owner");
      else router.push("/owner");
    }
    else router.push({ pathname: "/[page]", params: { page, ...params } });
  };
}
export function Brand({
  onGold = false,
  compact = false,
  interactive = true,
}: {
  onGold?: boolean;
  compact?: boolean;
  interactive?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const go = useNav();
  const reducedMotion = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const animate = (value: number) => {
    if (reducedMotion !== false || Platform.OS !== "web") {
      motion.setValue(0);
      return;
    }
    Animated.spring(motion, {
      toValue: value,
      speed: 24,
      bounciness: 7,
      useNativeDriver: false,
    }).start();
  };
  const wordmark = (
    <>
      <Txt
        serif
        size={
          compact ? Number.parseFloat(theme.typography.headerBrand?.fontSize || "24") : undefined
        }
        maxFontSizeMultiplier={1}
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
        maxFontSizeMultiplier={1}
        color={onGold ? c.headerInk : c.mutedForeground}
        style={{ letterSpacing: 0.1, marginTop: 2 }}
      >
        Salon & Day Spa
      </Txt>
    </>
  );
  const style = { flexShrink: compact ? 0 : 1, width: compact ? 84 : undefined };
  return interactive ? (
    <Animated.View
      style={{
        transform: [
          {
            scale: motion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.055],
            }),
          },
          {
            rotate: motion.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "-1.5deg"],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lady J home"
        onPress={() => go("home")}
        onHoverIn={() => animate(1)}
        onHoverOut={() => animate(0)}
        style={style}
      >
        {wordmark}
      </Pressable>
    </Animated.View>
  ) : (
    <View style={style}>{wordmark}</View>
  );
}

function HeaderActionButton({
  label,
  onPress,
  compact,
  alternate,
}: {
  label: string;
  onPress: () => void;
  compact: boolean;
  alternate: boolean;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const animate = (value: number) => {
    if (reducedMotion !== false || Platform.OS !== "web") {
      motion.setValue(0);
      return;
    }
    Animated.spring(motion, {
      toValue: value,
      speed: 26,
      bounciness: 5,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      style={{
        flexGrow: compact ? 1 : 0,
        flexShrink: compact ? 1 : 0,
        flexBasis: "auto",
        minWidth: 0,
        maxWidth: "100%",
        width: 202,
        transform: [
          {
            scale: motion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.045],
            }),
          },
        ],
      }}
    >
      <Button
        accessibilityLabel={label}
        onPress={onPress}
        onHoverIn={() => animate(1)}
        onHoverOut={() => animate(0)}
        style={{
          width: "100%",
          backgroundColor: alternate ? "#000000" : c.primary,
          borderRadius: 14,
          overflow: "hidden",
          minHeight: 44,
          height: "auto",
          paddingHorizontal: compact ? 7 : 12,
          paddingVertical: 8,
        }}
      >
        <SubtleShimmer interval={alternate ? 8000 : 6500} travelDistance={280} />
        <ButtonLabel
          singleLine
          maxFontSizeMultiplier={1}
          size={compact ? 11 : 20}
          color={alternate ? "#FFFFFF" : c.primaryForeground}
        >
          {label}
        </ButtonLabel>
      </Button>
    </Animated.View>
  );
}

export default function Shell({
  children,
  wide = false,
  footer = false,
  scrollRevision,
  scrollToEndRevision,
  bottomBar,
  headerAction,
  contentTopPadding,
  className,
}: {
  children?: React.ReactNode;
  wide?: boolean;
  footer?: boolean;
  scrollRevision?: string | number;
  scrollToEndRevision?: string | number;
  bottomBar?: React.ReactNode;
  headerAction?: { label: string; onPress: () => void };
  contentTopPadding?: number;
  className?: string;
}) {
  const c = useColors(),
    { width } = useWindowDimensions(),
    go = useNav();
  const s = useSalon();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollRevision !== undefined) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [scrollRevision]);
  useEffect(() => {
    if (scrollToEndRevision !== undefined) scroll.current?.scrollToEnd({ animated: true });
  }, [scrollToEndRevision]);
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
          paddingHorizontal: compact ? 12 : 28,
          paddingVertical: compact ? 8 : 11,
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
          <HeaderActionButton
            label={headerAction?.label || copy.booking}
            onPress={
              headerAction?.onPress ||
              (() =>
                go(
                  s.session || s.testMode ? "booking" : "register",
                  s.session || s.testMode ? {} : { next: "booking" },
                ))
            }
            compact={compact}
            alternate={Boolean(headerAction)}
          />
        </View>
      </View>
      <DevelopmentModeSelector />
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          scrollEventThrottle={16}
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
            minHeight: "auto",
            backgroundColor: c.background,
            height: "auto",
            flexDirection: "column",
          }}
          contentContainerStyle={{ paddingBottom: navigationSpacing + 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className={className}
            style={[
              shared.responsive,
              {
                maxWidth: wide ? 1280 : 1200,
                paddingHorizontal: desktop ? 24 : 16,
                paddingTop: contentTopPadding ?? (desktop ? 18 : 12),
                height: "auto",
                justifyContent: "flex-start",
                flexDirection: "column",
                maxHeight: "auto",
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
                paddingHorizontal: desktop ? 28 : 16,
                paddingVertical: 9,
                marginTop: 8,
                paddingTop: 12,
              }}
            >
              <View
                style={[
                  shared.responsive,
                  {
                    alignItems: "center",
                    gap: 9,
                    minHeight: 72,
                    paddingTop: 8,
                  },
                ]}
              >
                <View
                  style={{
                    alignItems: "center",
                    gap: 3,
                    width: 184,
                    height: 115,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Icon name="Clock3" size={14} color={c.brandAccent} />
                    <Txt size={11} bold color={c.brandAccent} style={{ letterSpacing: 0.8 }}>
                      OPENING HOURS
                    </Txt>
                  </View>
                  <Txt size={15} bold style={{ marginTop: 5 }}>
                    Tuesday – Saturday
                  </Txt>
                  <Txt size={15}>10:00 AM – 6:00 PM</Txt>
                  <Txt size={12} color={c.mutedForeground} className={"text-base"}>
                    Sunday & Monday · Closed
                  </Txt>
                </View>
                <View
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    height: 1,
                    backgroundColor: c.border,
                    marginVertical: 4,
                  }}
                />
                <View
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                >
                  <LinkText onPress={() => go("terms")}>Terms of Service</LinkText>
                  <Txt size={12} color={c.mutedForeground}>
                    ·
                  </Txt>
                  <LinkText onPress={() => go("privacy")}>Privacy Policy</LinkText>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
        {bottomBar}
        <FloatingBag />
      </View>
      {!!s.notice && <StatusNotice message={s.notice} onDismiss={() => s.notify("")} />}
    </SafeAreaView>
  );
}
