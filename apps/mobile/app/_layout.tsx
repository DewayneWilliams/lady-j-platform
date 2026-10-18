import "@/global.css";
import "@/appearance-polyfill";

import {
  Theme as NavigationTheme,
  ThemeProvider as NavigationThemeProvider,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform, View } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { SalonProvider } from "@/lib/salon/SalonProvider";
import { ThemeProvider, useTheme } from "@/theming/ThemeProvider";
import darkTheme from "@/theming/themes/dark";
import lightTheme from "@/theming/themes/light";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { PlayfairDisplay_500Medium } from "@expo-google-fonts/playfair-display/500Medium";
import { PortalHost } from "@rn-primitives/portal";
import { WebPortalContext } from "@/components/WebPortalContext";
import * as SplashScreen from "expo-splash-screen";
import DeviceViewport from "@/components/salon/DeviceViewport";

SplashScreen.preventAutoHideAsync();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

function RootContent() {
  const hasMounted = React.useRef(false);
  const [portalContainer, setPortalContainer] = React.useState<View | null>(null);
  const { isDarkColorScheme } = useColorScheme();
  const { theme, setTheme } = useTheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  const [fontsLoaded, fontError] = useFonts({
    LadyJDisplay: require("@/assets/fonts/CormorantGaramond.ttf"),
    PlayfairDisplay_500Medium,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isLoadingFonts = !fontsLoaded && !fontError;

  const navigationTheme: NavigationTheme = React.useMemo(() => {
    const navigationThemeBase = isDarkColorScheme ? NavigationDarkTheme : NavigationDefaultTheme;
    const baseColors = navigationThemeBase.colors;
    return {
      ...navigationThemeBase,
      colors: {
        ...baseColors,
        background: theme.colors.background ?? baseColors.background,
        border: theme.colors.border ?? baseColors.border,
        card: theme.colors.card ?? baseColors.card,
        notification: theme.colors.destructive ?? baseColors.notification,
        primary: theme.colors.primary ?? baseColors.primary,
        text: theme.colors.foreground ?? baseColors.text,
      },
    };
  }, [theme, isDarkColorScheme]);

  React.useEffect(() => {
    if (isDarkColorScheme && theme.name !== "dark") {
      setTheme("dark");
    }
    if (!isDarkColorScheme && theme.name !== "light") {
      setTheme("light");
    }
  }, [isDarkColorScheme]);

  React.useEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      // Adds the background color to the html element to prevent white background on overscroll.
      // eslint-disable-next-line no-undef
      document.documentElement.classList.add("bg-background");
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  React.useEffect(() => {
    if (!isLoadingFonts) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingFonts]);

  if (!isColorSchemeLoaded || isLoadingFonts) {
    return null;
  }

  return (
    <WebPortalContext.Provider
      value={{ container: portalContainer as unknown as HTMLElement | null }}
    >
      <>
        <NavigationThemeProvider value={navigationTheme}>
          <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
          <SalonProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ title: "Lady J" }} />
              <Stack.Screen name="home" options={{ title: "Lady J Salon & Day Spa" }} />
              <Stack.Screen name="[page]" options={{ title: "Lady J" }} />
              <Stack.Screen name="owner" options={{ title: "Owner workspace" }} />
            </Stack>
          </SalonProvider>
          {
            // View used as a portal container on web
            <View
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
              }}
              ref={setPortalContainer}
            />
          }
          {
            // PortalHost used as a portal container on native
            <PortalHost />
          }
        </NavigationThemeProvider>
      </>
    </WebPortalContext.Provider>
  );
}

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ThemeProvider
      initialThemeName={isDarkColorScheme ? "dark" : "light"}
      themes={[lightTheme, darkTheme]}
    >
      <DeviceViewport>
        <RootContent />
      </DeviceViewport>
    </ThemeProvider>
  );
}
