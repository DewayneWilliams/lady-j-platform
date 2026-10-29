import { db, check } from "./client";
import { openAuthSessionAsync } from "expo-web-browser";
import Constants from "expo-constants";
import { Platform, Linking } from "react-native";
import { sessionStorage } from "./sessionStorage";
import { devOwnerCredentials, isDevOwnerEmail } from "./testMode";
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
  if (page === "checkout" && search.get("source") === "bag") params.source = "bag";
  if (page === "account" && referral && /^[A-Z0-9-]{4,40}$/i.test(referral)) params.ref = referral;
  if (page === "account" && gift && /^LJ-[A-Z0-9-]{6,40}$/i.test(gift)) params.gift = gift;
  return { page, params };
}

const realSessionKey = "lady-j-real-account-session-v1";
// Keep the real account separate when the Development selector opens the test owner.
export async function beginAccountAccess() {
  const current = check(await db().auth.getSession()).session;
  if (!isDevOwnerEmail(current?.user.email)) return;
  const saved = await sessionStorage.getItem(realSessionKey);
  if (saved) {
    try {
      const tokens = JSON.parse(saved);
      check(await db().auth.setSession(tokens));
      return;
    } catch { await sessionStorage.removeItem(realSessionKey); }
  }
  const result = await db().auth.signOut({ scope: "local" });
  if (result.error) throw new Error(result.error.message);
}

const pendingMarketingKey = "lady-j-auth-marketing-v1";
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
  const configured = Constants.expoConfig?.extra?.authCallbackScheme || Constants.expoConfig?.scheme;
  const candidates = Array.isArray(configured) ? configured : [configured];
  const scheme = candidates.find(value => value && !["exp", "exps", "draftbit", "com.draftbit.livepreview"].includes(value));
  if (!scheme || !/^[a-z][a-z0-9+.-]*$/i.test(scheme))
    throw new Error("Google sign-in needs a build with Lady J’s own app scheme. Use the web preview or a build from Publishing; this shared mobile preview cannot receive the account callback.");
  return scheme;
}

export function oauthRedirectUrl() {
  if (Platform.OS === "web") {
    if (typeof globalThis.location === "undefined")
      throw new Error("Secure sign-in must be started in the app.");
    return globalThis.location.origin + "/auth/callback";
  }

  // Keep the salon scheme when a shared preview overrides the native launcher schemes.
  // iOS authentication sessions capture this callback; Android needs an installed handler.
  return `${configuredScheme()}://auth/callback`;
}

const exchanges = new Map<string, ReturnType<typeof exchangeCallback>>();
export function completeOAuthCallback(callbackUrl: string) {
  const pending = exchanges.get(callbackUrl);
  if (pending) return pending;
  if (exchanges.size >= 8) exchanges.delete(exchanges.keys().next().value!);
  const exchange = exchangeCallback(callbackUrl);
  exchanges.set(callbackUrl, exchange);
  return exchange;
}
async function exchangeCallback(callbackUrl: string) {
  const callback = new URL(callbackUrl);
  const error =
    callback.searchParams.get("error_description") || callback.searchParams.get("error");
  if (error) throw new Error(error);
  const tokenHash = callback.searchParams.get("token_hash");
  const type = callback.searchParams.get("type");
  if (tokenHash && (type === "email" || type === "signup" || type === "recovery")) {
    const data = check(await db().auth.verifyOtp({ token_hash: tokenHash, type }));
    if (!data.session || !data.user) throw new Error("The email link could not be verified.");
    return data;
  }
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("The sign-in response could not be verified. Please try again.");
  const data = check(await db().auth.exchangeCodeForSession(code));
  if (!data.session || !data.user)
    throw new Error("Sign-in has not been confirmed. Please try again.");
  const marketing = await sessionStorage.getItem(pendingMarketingKey);
  await sessionStorage.removeItem(pendingMarketingKey);
  if (marketing === "true") check(await db().from("lj_profiles").update({ marketing_consent: true }).eq("id", data.session.user.id).select("id").single());
  return data;
}

export async function signOutCurrentDevice() {
  exchanges.clear();
  await sessionStorage.removeItem(realSessionKey);
  const client = db();
  const result = await client.auth.signOut();
  if (!result.error) return;

  // A network/server failure must not leave a session usable on this device.
  const local = await client.auth.signOut({ scope: "local" });
  if (local.error) throw new Error(result.error.message);
}

export async function socialSignIn(provider: SocialProvider, marketing: boolean) {
  await sessionStorage.setItem(pendingMarketingKey, String(marketing));
  const redirectTo = oauthRedirectUrl();
  const runtimeSchemes = Constants.expoConfig?.scheme;
  const sharedPreview = (Array.isArray(runtimeSchemes) ? runtimeSchemes : [runtimeSchemes]).some(value => value === "exp" || value === "draftbit" || value === "com.draftbit.livepreview");
  if (Platform.OS === "android" && sharedPreview && !(await Linking.canOpenURL(redirectTo)))
    throw new Error("Google sign-in requires a Lady J build from Publishing on this Android device. The shared preview does not own Lady J’s callback. You can also sign in in the web preview.");
  const { url } = check(
    await db().auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    }),
  );
  if (!url) throw new Error("This sign-in provider is not configured yet. Please use email.");
  if (Platform.OS === "web") {
    // Full-page PKCE avoids browser popup blocking after the async provider request.
    globalThis.location.assign(url);
    return null;
  }
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
        .eq("id", data.session!.user.id)
        .select("id")
        .single(),
    );
  return data.session;
}

/** Development builds only: signs in the separate Development Test Owner account. */
export async function signInDevelopmentOwner() {
  const credentials = devOwnerCredentials();
  if (!credentials) throw new Error("Development owner testing is not enabled in this build.");
  const current = check(await db().auth.getSession()).session;
  if (current && !isDevOwnerEmail(current.user.email))
    await sessionStorage.setItem(realSessionKey, JSON.stringify({
      access_token: current.access_token, refresh_token: current.refresh_token,
    }));
  const data = check(await db().auth.signInWithPassword(credentials));
  if (!data.session) throw new Error("The Development Test Owner could not be signed in.");
  return data.session;
}
