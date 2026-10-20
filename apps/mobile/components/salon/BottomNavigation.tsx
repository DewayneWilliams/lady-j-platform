import AudioWaveIcon from "./AudioWaveIcon";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
  type BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon, { type IconName } from "@/lib/icons/LucideIcon";
import { Txt, useColors } from "./ui";

type NavigationItem = { key: string; label: string; icon: IconName };
type Tabs = Record<string, undefined>;
const Tab = createBottomTabNavigator<Tabs>();

// The navigator reserves its own bar height. This is extra breathing room in content.
export function useBottomNavigationSpacing(_owner = false) {
  const { bottom } = useSafeAreaInsets();
  return 24 + bottom;
}

export function useGoldTabOptions(): BottomTabNavigationOptions {
  const c = useColors();
  const { bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarLabelPosition: "below-icon",
    tabBarActiveTintColor: c.headerInk,
    tabBarInactiveTintColor: c.headerInk,
    tabBarStyle: {
      backgroundColor: c.headerGold,
      borderTopWidth: 0,
      elevation: 0,
      height: 76 + bottom,
      paddingTop: 8,
      paddingBottom: Math.max(8, bottom),
    },
    tabBarItemStyle: { flex: 1, flexBasis: 0, minWidth: 0, minHeight: 44, paddingHorizontal: 1 },
    sceneStyle: { backgroundColor: c.background },
    animation: "none",
  };
}

function NavigationSymbol({ name, color }: { name: IconName; color: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {name === "AudioLines" ? (
        <AudioWaveIcon color={color} />
      ) : (
        <Icon name={name} size={24} strokeWidth={2.8} color={color} />
      )}
    </View>
  );
}
export function goldTabItem(item: NavigationItem): BottomTabNavigationOptions {
  return {
    title: item.label,
    tabBarAccessibilityLabel: item.label,
    tabBarIcon: ({ color }) => <NavigationSymbol name={item.icon} color={color} />,
    tabBarLabel: ({ color }) => (
      <Txt
        size={12}
        color={color}
        bold
        style={{
          textAlign: "center",
          width: "100%",
          minWidth: item.label.length * 8,
          letterSpacing: -0.8,
          marginTop: 3,
        }}
      >
        {item.label}
      </Txt>
    ),
  };
}

/** Real bottom-tab screens share the existing owner state and editors. */
export function BottomNavigation({
  items,
  selectedKey,
  onSelect,
  children,
}: {
  items: readonly NavigationItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  children: React.ReactNode;
}) {
  const options = useGoldTabOptions();
  const navigation = useRef<BottomTabNavigationProp<Tabs> | null>(null);
  const focusedKey = useRef(selectedKey);
  useEffect(() => {
    if (selectedKey !== focusedKey.current && items.some((item) => item.key === selectedKey))
      navigation.current?.navigate(selectedKey);
  }, [selectedKey, items]);
  return (
    <Tab.Navigator initialRouteName={selectedKey} screenOptions={options}>
      {items.map((item) => (
        <Tab.Screen
          key={item.key}
          name={item.key}
          options={goldTabItem(item)}
          listeners={({ navigation: screenNavigation, route }) => ({
            focus: () => {
              navigation.current = screenNavigation;
              focusedKey.current = route.name;
              if (selectedKey !== route.name) onSelect(route.name);
            },
            tabPress: () => {
              if (focusedKey.current === item.key) onSelect(item.key);
            },
          })}
        >
          {() => (
            <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              {selectedKey === item.key ? children : null}
            </View>
          )}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}
