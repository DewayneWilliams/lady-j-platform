import { ThemeProvider, useTheme } from "@/theming/ThemeProvider";
import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { PortalHost } from "@rn-primitives/portal";
import { WebPortalContext } from "@/components/WebPortalContext";

export const ownerEditorPortal = "owner-editor";
/** Keep dropdowns within the native modal and its web accessibility boundary. */
export default function OwnerEditorPortal({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [container, setContainer] = useState<View | null>(null);
  return (
    <WebPortalContext.Provider value={{ container: container as unknown as HTMLElement | null }}>
      <ThemeProvider key={theme.name} initialThemeName={theme.name} themes={[theme]}>
        <View style={styles.root}>
          {children}
          {Platform.OS === "web" ? (
            <View ref={setContainer} style={styles.host} />
          ) : (
            <PortalHost name={ownerEditorPortal} />
          )}
        </View>
      </ThemeProvider>
    </WebPortalContext.Provider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  host: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" },
});
