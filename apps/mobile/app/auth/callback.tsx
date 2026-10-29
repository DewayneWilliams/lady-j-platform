import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { Txt, Action, useColors } from "@/components/salon/ui";
import { beginAccountAccess, completeOAuthCallback, consumeAuthDestination, oauthRedirectUrl } from "@/lib/salon/auth";
export default function AuthCallback() {
  const c = useColors(),
    router = useRouter(),
    params = useGlobalSearchParams<{ code?: string; error?: string; error_description?: string; token_hash?: string; type?: string; next?: string }>(),
    [waiting, setWaiting] = useState(true),
    [error, setError] = useState(""),
    attempted = useRef("");
  useEffect(() => {
    if (Platform.OS === "web" && globalThis.window?.opener) {
      maybeCompleteAuthSession();
      const timer = setTimeout(() => setWaiting(false), 12000);
      return () => clearTimeout(timer);
    }
    const search = new URLSearchParams();
    for (const key of ["code", "error", "error_description", "token_hash", "type", "next"] as const) {
      const value = params[key];
      if (typeof value === "string") search.set(key, value);
    }
    const callbackUrl = Platform.OS === "web" ? globalThis.location.href : oauthRedirectUrl() + "?" + search.toString();
    if (attempted.current === callbackUrl) return;
    attempted.current = callbackUrl;
    void beginAccountAccess().then(() => completeOAuthCallback(callbackUrl))
      .then(async () => {
        const destination = params.next === "reset-password" || params.type === "recovery"
          ? { page: "reset-password", params: {} }
          : await consumeAuthDestination();
        router.replace({
          pathname: "/[page]",
          params: { page: destination.page, ...destination.params },
        });
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Sign-in could not be completed.");
        setWaiting(false);
      });
  }, [params.code, params.error, params.error_description, params.token_hash, params.type, params.next, router]);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: "Secure sign-in" }} />
      <View style={styles.content}>
        {waiting && <ActivityIndicator color={c.primary} />}
        <Txt size={24} bold>
          {waiting
            ? "Completing secure sign-in"
            : error
              ? "Sign-in could not be completed"
              : "Return to your sign-in window"}
        </Txt>
        <Txt style={styles.message}>
          {error ||
            "Your account is opened only after the sign-in response is verified. If the original window was closed, please start again."}
        </Txt>
        {!waiting && (
          <Action accountAccess
            label="Back to sign-in"
            onPress={() => router.replace("/login")}
            style={styles.action}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 22,
  },
  message: { textAlign: "center" },
  action: { alignSelf: "center" },
});
