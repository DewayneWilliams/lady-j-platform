import React, { createContext, useContext } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSalon } from "@/lib/salon/SalonProvider";
import { developmentDemoSelector, devOwnerAutoSignIn } from "@/lib/salon/testMode";
import { Txt, useColors } from "./ui";
export const DevelopmentModeDismissContext = createContext<(() => void) | null>(null);

// Original development strip, also available above full-screen media workflows.
export default function DevelopmentModeSelector({ owner, onSwitch }: { owner?: boolean; onSwitch?: () => void }) {
  const s = useSalon();
  const c = useColors();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const dismissMedia = useContext(DevelopmentModeDismissContext);
  const ownerMode = owner ?? pathname.startsWith("/owner");
  if (!developmentDemoSelector) return null;
  return (
    <View
      accessibilityLabel="Development test mode"
      style={{ backgroundColor: c.goldSurface, borderBottomWidth: 1, borderColor: c.goldBorder,
        paddingHorizontal: width < 760 ? 12 : 40, paddingVertical: 6, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 8, minHeight: 36 }}
    >
      <Txt size={12} bold color={c.warning}>DEMO · {ownerMode ? "OWNER" : "CLIENT"} MODE</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ownerMode ? "Open Client View" : "Open Owner Dashboard test view"}
        onPress={() => {
          (dismissMedia ?? onSwitch)?.();
          if (ownerMode) {
            if (devOwnerAutoSignIn && s.authReady && !s.devOwner)
              void s.signInDevOwner().catch(error => s.notify(error instanceof Error ? error.message : "Development sign-in failed."));
            router.navigate("/home"); return;
          }
          s.setDemoOwner(true);
          if (devOwnerAutoSignIn && s.authReady && !s.devOwner) {
            void s.signInDevOwner().catch((error) =>
              s.notify(error instanceof Error ? error.message : "Development sign-in failed."),
            );
          }
          router.navigate("/owner");
        }}
        style={{ paddingHorizontal: 10, paddingVertical: 5 }}
      >
        <Txt size={12} bold color={c.brandAccent}>{ownerMode ? "CLIENT" : "OWNER"} MODE</Txt>
      </Pressable>
    </View>
  );
}
