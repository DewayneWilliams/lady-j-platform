import { db, check } from "./client";
import { openAuthSessionAsync } from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { sessionStorage } from "./sessionStorage";
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
    "consultation",
  ];
  const [candidate, query = ""] = (next || "account").split("?");
  const page = allowed.includes(candidate) ? candidate : "account",
    search = new URLSearchParams(query),
    params: Record<string, string> = {};
  const id = search.get("id"),
    kind = search.get("kind"),
    referral = search.get("ref"),
    gift = search.get("gift");
  if (id && id.length < 100) params.id = id;
  if (kind === "product" || kind === "workshop") params.kind = kind;
  if (page === "account" && referral && /^[A-Z0-9-]{4,40}$/i.test(referral)) params.ref = referral;
  if (page === "account" && gift && /^LJ-[A-Z0-9-]{6,40}$/i.test(gift)) params.gift = gift;
  return { page, params };
}

const pendingDestinationKey = "lady-j-auth-destination-v1";
export async function rememberAuthDestination(next?: string) {
  await sessionStorage.setItem(pendingDestinationKey, next || "account");
}
export async function consumeAuthDestination() {
  const value = await sessionStorage.getItem(pendingDestinationKey);
  await sessionStorage.removeItem(pendingDestinationKey);
  return authDestination(value || undefined);
}

function configuredScheme() {
  const configured = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(configured) ? configured[0] : configured;
  if (!scheme || !/^[a-z][a-z0-9+.-]*$/i.test(scheme))
    throw new Error("Secure sign-in is not configured for this app build.");
  return scheme;
}

export function oauthRedirectUrl() {
  if (Platform.OS === "web") {
    if (typeof globalThis.location === "undefined")
      throw new Error("Secure sign-in must be started in the app.");
    return globalThis.location.origin + "/auth/callback";
  }

  // Do not use Linking.createURL here. In a shared preview container it creates an
  // exp:// launcher URL, which can reopen the launcher as "App Not Found". iOS
  // ASWebAuthenticationSession captures this stable callback and returns it to the
  // same presenting Preview app; published builds own the configured scheme.
  return `${configuredScheme()}://auth/callback`;
}

export async function completeOAuthCallback(callbackUrl: string) {
  const callback = new URL(callbackUrl);
  const error =
    callback.searchParams.get("error_description") || callback.searchParams.get("error");
  if (error) throw new Error(error);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("The sign-in response could not be verified. Please try again.");
  const data = check(await db().auth.exchangeCodeForSession(code));
  if (!data.session || !data.user)
    throw new Error("Sign-in has not been confirmed. Please try again.");
  return data;
}

export async function signOutCurrentDevice() {
  const client = db();
  const result = await client.auth.signOut();
  if (!result.error) return;

  // A network/server failure must not leave a session usable on this device.
  const local = await client.auth.signOut({ scope: "local" });
  if (local.error) throw new Error(result.error.message);
}

export async function socialSignIn(provider: SocialProvider, marketing: boolean) {
  const redirectTo = oauthRedirectUrl();
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
  const data = await completeOAuthCallback(result.url);
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
