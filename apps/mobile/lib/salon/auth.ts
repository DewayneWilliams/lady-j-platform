import { db, check } from "./client";
import { openAuthSessionAsync } from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
export type SocialProvider = "google" | "facebook" | "apple";
export type AuthProviders = Record<SocialProvider, boolean>;
export async function availableAuthProviders(): Promise<AuthProviders> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL,
    key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Account sign-in is not configured.");
  // Public Supabase Auth discovery endpoint; no verified Draftbit endpoint is configured.
  const response = await fetch(url + "/auth/v1/settings", { headers: { apikey: key } });
  if (!response.ok)
    throw new Error("Sign-in options could not be loaded. Email sign-in is still available.");
  const settings = (await response.json()) as { external?: Record<string, boolean> };
  return {
    google: settings.external?.google === true,
    facebook: settings.external?.facebook === true,
    apple: settings.external?.apple === true,
  };
}
export function authDestination(next?: string) {
  const allowed = [
    "account",
    "booking",
    "services",
    "workshops",
    "boutique",
    "bag",
    "checkout",
    "profile",
    "appointments",
    "my-workshops",
    "orders",
    "payments",
    "product",
    "workshop",
  ];
  const [candidate, query = ""] = (next || "account").split("?");
  const page = allowed.includes(candidate) ? candidate : "account",
    search = new URLSearchParams(query),
    params: Record<string, string> = {};
  const id = search.get("id"),
    kind = search.get("kind");
  if (id && id.length < 100) params.id = id;
  if (kind === "product" || kind === "workshop") params.kind = kind;
  return { page, params };
}
export async function socialSignIn(provider: SocialProvider, marketing: boolean) {
  const redirectTo =
    Platform.OS === "web"
      ? globalThis.location.origin + "/auth/callback"
      : Linking.createURL("auth/callback");
  const { url } = check(
    await db().auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    }),
  );
  if (!url) throw new Error("This sign-in provider is not configured yet. Please use email.");
  const result = await openAuthSessionAsync(url, redirectTo);
  if (result.type !== "success")
    throw new Error("Sign-in was cancelled. Your account was not changed.");
  const callback = new URL(result.url),
    code = callback.searchParams.get("code"),
    error = callback.searchParams.get("error_description");
  if (error) throw new Error(error);
  if (!code) throw new Error("The sign-in response could not be verified. Please try again.");
  const data = check(await db().auth.exchangeCodeForSession(code));
  if (!data.session || !data.user)
    throw new Error("Sign-in has not been confirmed. Please try again.");
  // Unchecked opt-in never subscribes new users or withdraws an existing preference on login.
  if (marketing)
    check(
      await db()
        .from("lj_profiles")
        .update({ marketing_consent: true })
        .eq("id", data.user.id)
        .select("id")
        .single(),
    );
  return data.session;
}
