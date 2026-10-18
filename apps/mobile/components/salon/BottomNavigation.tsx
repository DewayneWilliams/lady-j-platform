import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Icon, { type IconName } from "@/lib/icons/LucideIcon";
import { useTheme } from "@/theming/ThemeProvider";

type NavigationItem = { key: string; label: string; icon: IconName };
const BAR_HEIGHT = 72;
const BAR_MARGIN = 10;

// Space belongs inside scrolling content so the page can pass beneath the glass.
export function useBottomNavigationSpacing(owner = false) {
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return owner && width >= 1100 ? 0 : BAR_HEIGHT + BAR_MARGIN * 2 + bottom;
}

export function BottomNavigation({
  items,
  selectedKey,
  onSelect,
  accessibilityLabel,
  blurTarget,
}: {
  items: readonly NavigationItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  accessibilityLabel: string;
  blurTarget: React.RefObject<View | null>;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const typography = theme.typography.navigationLabel;
  const { width } = useWindowDimensions();
  const dense = items.length > 5;
  const compact = dense && width < 360;
  const labelSize =
    dense && width < 430 ? (compact ? 9 : 10) : parseFloat(typography?.fontSize || "11");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (mounted) setReduceTransparency(value);
      })
      .catch(() => {
        /* Retain the default material if the setting is unavailable. */
      });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") setKeyboardVisible(false);
    });
    return () => {
      state.remove();
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardVisible) return null;

  return (
    <SafeAreaView
      edges={{ top: "off", left: "off", right: "off", bottom: "additive" }}
      style={[styles.overlay, compact && styles.compactOverlay]}
    >
      <View style={[styles.shadow, { shadowColor: c.navigationGlassShadow }]}>
        <View style={[styles.capsule, { borderColor: c.navigationGlassBorder }]}>
          {!reduceTransparency && (
            <BlurView
              blurTarget={Platform.OS === "android" ? blurTarget : undefined}
              blurMethod={Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined}
              intensity={65}
              tint={theme.name === "dark" ? "dark" : "light"}
              style={styles.material}
            />
          )}
          <View
            style={[
              styles.material,
              { backgroundColor: reduceTransparency ? c.card : c.navigationGlass },
            ]}
          />
          <View
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="tablist"
            style={[styles.row, compact && styles.compactRow]}
          >
            {items.map((item) => {
              const selected = item.key === selectedKey;
              const color = selected ? c.navigationGlassActive : c.navigationGlassForeground;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  aria-selected={selected}
                  onPress={() => onSelect(item.key)}
                  style={({ pressed }) => [
                    styles.tab,
                    {
                      backgroundColor:
                        selected || pressed ? c.navigationGlassSelected : "transparent",
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={26}
                    strokeWidth={selected ? 2 : 1.65}
                    color={color}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    maxFontSizeMultiplier={1.2}
                    style={[
                      styles.label,
                      {
                        color,
                        fontFamily: selected
                          ? theme.typography.button?.fontFamily
                          : typography?.fontFamily,
                        fontSize: labelSize,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: BAR_MARGIN,
    paddingBottom: BAR_MARGIN,
    pointerEvents: "box-none",
    zIndex: 10,
  },
  compactOverlay: { paddingHorizontal: 6 },
  compactRow: { padding: 4, gap: 0 },
  shadow: {
    width: "100%",
    maxWidth: 740,
    alignSelf: "center",
    borderRadius: 32,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  capsule: { height: BAR_HEIGHT, borderRadius: 32, borderWidth: 1, overflow: "hidden" },
  material: { ...StyleSheet.absoluteFillObject, pointerEvents: "none" },
  row: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexWrap: "nowrap",
    padding: 5,
    gap: 2,
  },
  tab: {
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 26,
  },
  label: {
    width: "100%",
    textAlign: "center",
    lineHeight: 16,
    includeFontPadding: false,
    flexShrink: 0,
  },
});
