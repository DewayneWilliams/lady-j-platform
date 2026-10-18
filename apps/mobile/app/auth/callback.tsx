import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { Txt, Action, useColors } from "@/components/salon/ui";
import { useNav } from "@/components/salon/Shell";
export default function AuthCallback() {
  const c = useColors(),
    go = useNav(),
    [waiting, setWaiting] = useState(true);
  useEffect(() => {
    maybeCompleteAuthSession();
    const timer = setTimeout(() => setWaiting(false), 12000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: "Secure sign-in" }} />
      <View
        style={{ flex: 1, padding: 28, justifyContent: "center", alignItems: "center", gap: 22 }}
      >
        {waiting && <ActivityIndicator color={c.primary} />}
        <Txt size={24} bold>
          {waiting ? "Completing secure sign-in…" : "Return to your sign-in window"}
        </Txt>
        <Txt style={{ textAlign: "center" }}>
          Your account is opened only after the sign-in response is verified. If the original window
          was closed, please start again.
        </Txt>
        {!waiting && <Action label="Back to sign-in" onPress={() => go("login")} />}
      </View>
    </SafeAreaView>
  );
}
