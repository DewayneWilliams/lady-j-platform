import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useForegroundRefresh } from "./useForegroundRefresh";
import { orderServicesByCategory } from "./categories";
import type { Session } from "@supabase/supabase-js";
import type { ClientLanguage } from "./clientLanguage";
import { supabase, db, check, asRows } from "./client";
import { developmentTestMode, devOwnerAutoSignIn, isDevOwnerEmail } from "./testMode";
import { signInDevelopmentOwner } from "./auth";
import { sessionStorage } from "./sessionStorage";
import { productRows, serviceRows } from "./catalogData";
import { readShoppingBag, restoreBagIds } from "./shoppingBag";
import {
  Service,
  Product,
  Workshop,
  Settings,
  Appointment,
  Purchase,
  Transaction,
  Credit,
  Profile,
  Promotion,
  Favorite,
} from "./types";
import { emptyRewardSummary, RewardSummary } from "./loyalty";
interface SalonState {
  clientLanguage: ClientLanguage;
  setClientLanguage: (language: ClientLanguage) => void;
  services: Service[];
  homeSpecials: Service[];
  products: Product[];
  workshops: Workshop[];
  promotions: Promotion[];
  settings: Settings | null;
  loading: boolean;
  error: string;
  session: Session | null;
  owner: boolean;
  authReady: boolean;
  profile: Profile | null;
  appointments: Appointment[];
  purchases: Purchase[];
  transactions: Transaction[];
  credits: Credit[];
  rewards: RewardSummary;
  favorites: Favorite[];
  toggleFavorite: (kind: Favorite["kind"], itemId: string) => Promise<void>;
  bagReady: boolean;
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  workshopCart: string[];
  setWorkshopCart: React.Dispatch<React.SetStateAction<string[]>>;
  demoOwner: boolean;
  setDemoOwner: (v: boolean) => void;
  testMode: boolean;
  /** Signed in as the Development-only test owner account. */
  devOwner: boolean;
  signInDevOwner: () => Promise<void>;
  exitTestMode: () => void;
  refresh: () => Promise<void>;
  refreshPrivate: () => Promise<void>;
  notice: string;
  notify: (message: string) => void;
}
const Context = createContext<SalonState | null>(null);
// Automatic Development Test Owner sign-in happens once per app launch, so signing out
// stays signed out until the app is reopened.
let devOwnerAutoAttempted = false;
export function SalonProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Service[]>([]),
    [homeSpecials, setHomeSpecials] = useState<Service[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [workshops, setWorkshops] = useState<Workshop[]>([]),
    [promotions, setPromotions] = useState<Promotion[]>([]),
    [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [owner, setOwner] = useState(false),
    [authReady, setAuthReady] = useState(false),
    [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]),
    [purchases, setPurchases] = useState<Purchase[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]),
    [credits, setCredits] = useState<Credit[]>([]),
    [rewards, setRewards] = useState<RewardSummary>(emptyRewardSummary);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({}),
    [selected, setSelected] = useState<string[]>([]),
    [workshopCart, setWorkshopCart] = useState<string[]>([]),
    [bagReady, setBagReady] = useState(false),
    [demoOwner, setDemoOwner] = useState(developmentTestMode),
    [testMode, setTestMode] = useState(developmentTestMode),
    [notice, setNotice] = useState("");
  const [clientLanguage, setClientLanguage] = useState<ClientLanguage>("en");
  const identity = useRef<string | null>(null);
  const customerId = session?.user.id ?? null;
  const signedIn = Boolean(customerId);
  const privateGeneration = useRef(0);
  const catalogGeneration = useRef(0);
  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    let active = true;
    void sessionStorage
      .getItem("lady-j-shopping-bag-v1")
      .then((raw) => {
        if (!active || !raw) return;
        const saved = readShoppingBag(raw);
        // SecureStore is asynchronous. Keep selections made while it was reading.
        setCart((current) => ({ ...saved.products, ...current }));
        setSelected((current) => restoreBagIds(saved.services, current));
        setWorkshopCart((current) => restoreBagIds(saved.workshops, current));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setBagReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!bagReady) return;
    void sessionStorage
      .setItem(
        "lady-j-shopping-bag-v1",
        JSON.stringify({ products: cart, services: selected, workshops: workshopCart }),
      )
      .catch(() => undefined);
  }, [bagReady, cart, selected, workshopCart]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  const refresh = useCallback(async () => {
    const generation = ++catalogGeneration.current;
    setLoading(true);
    setError("");
    try {
      const client = db();
      const results = await Promise.allSettled([
        client.from("lj_public_services").select("*").order("catalog_sort_order"),
        client
          .from(signedIn ? "lj_products" : "lj_public_products")
          .select("*")
          .eq("active", true)
          .order("name"),
        client
          .from(signedIn ? "lj_workshops" : "lj_public_workshops")
          .select("*")
          .eq("active", true)
          .order("starts_at"),
        client
          .from(signedIn ? "lj_settings" : "lj_public_settings")
          .select("*")
          .single(),
        client.from("lj_promotions").select("*").eq("active", true),
        client.from("lj_public_home_specials").select("*").order("name").limit(2),
      ]);
      if (generation !== catalogGeneration.current) return;
      const failures: string[] = [];
      const accept = (index: number, apply: (value: unknown) => void) => {
        try {
          const result = results[index];
          if (result.status === "rejected") throw result.reason;
          apply(check(result.value));
        } catch (reason) {
          failures.push(reason instanceof Error ? reason.message : "Unable to load catalog information.");
        }
      };
      accept(0, (value) => setServices(orderServicesByCategory(serviceRows(value))));
      accept(1, (value) => setProducts(productRows(value)));
      accept(2, (value) => setWorkshops(asRows<Workshop>(value, "Workshops")));
      accept(3, (value) => {
        if (!value || typeof value !== "object") throw new Error("Settings returned an invalid response.");
        const currentSettings = value as Settings;
        setSettings(signedIn ? currentSettings : { ...currentSettings, bank_instructions: "", delivery_fee: 0 });
      });
      accept(4, (value) => setPromotions(asRows<Promotion>(value, "Promotions")));
      accept(5, (value) => setHomeSpecials(serviceRows(value)));
      if (failures.length) throw new Error(failures.join(" "));
    } catch (e) {
      if (generation === catalogGeneration.current) {
        const message = e instanceof Error ? e.message : "Unable to connect. Please try again.";
        setError(message);
        console.warn("[Lady J catalog]", message);
      }
    } finally {
      if (generation === catalogGeneration.current) setLoading(false);
    }
  }, [signedIn, customerId]);
  const refreshPrivate = useCallback(async () => {
    const generation = ++privateGeneration.current;
    if (!customerId) {
      setProfile(null);
      setAppointments([]);
      setPurchases([]);
      setTransactions([]);
      setCredits([]);
      setRewards(emptyRewardSummary);
      setFavorites([]);
      return;
    }
    try {
      const c = db();
      const results = await Promise.all([
        c.rpc("lj_my_profile"),
        c
          .from("lj_calendar")
          .select("*")
          .eq("customer_id", customerId)
          .order("starts_at", { ascending: false }),
        c
          .from("lj_purchases")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        c
          .from("lj_transactions")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        c.from("lj_credits").select("*").eq("customer_id", customerId),
        c.rpc("lj_my_rewards"),
        c.from("lj_favorites").select("*").order("created_at", { ascending: false }),
      ]);
      if (generation !== privateGeneration.current) return;
      setProfile(check(results[0]) as Profile | null);
      setAppointments(asRows<Appointment>(check(results[1]), "Appointments"));
      setPurchases(asRows<Purchase>(check(results[2]), "Purchases"));
      setTransactions(asRows<Transaction>(check(results[3]), "Transactions"));
      setCredits(asRows<Credit>(check(results[4]), "Credits"));
      const rewardValue = check(results[5]);
      setRewards(
        rewardValue && typeof rewardValue === "object"
          ? (rewardValue as RewardSummary)
          : emptyRewardSummary,
      );
      setFavorites(asRows<Favorite>(check(results[6]), "Favorites"));
    } catch (e) {
      if (generation === privateGeneration.current)
        notify(e instanceof Error ? e.message : "Unable to load your account.");
    }
  }, [customerId, notify]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION" && !s && devOwnerAutoSignIn && !devOwnerAutoAttempted) {
        devOwnerAutoAttempted = true;
        // Deferred: Supabase must not be called from inside its own auth callback.
        setTimeout(() => {
          signInDevelopmentOwner().catch((e) => {
            setNotice(
              `Development Test Owner sign-in failed: ${e instanceof Error ? e.message : "unknown error"}`,
            );
            setAuthReady(true);
          });
        }, 0);
        // Keep the app in its loading state until the test owner session arrives.
        return;
      }
      const nextIdentity = s?.user.id ?? null;
      const changed = identity.current !== nextIdentity;
      if (changed) {
        identity.current = nextIdentity;
        privateGeneration.current += 1;
        catalogGeneration.current += 1;
        setProfile(null);
        setAppointments([]);
        setPurchases([]);
        setTransactions([]);
        setCredits([]);
        setRewards(emptyRewardSummary);
        setDemoOwner(developmentTestMode);
        setOwner(false);
        setAuthReady(!s);
        // Services always come from the public view; retain them across auth changes.
        setProducts([]);
        setWorkshops([]);
        setSettings(null);
        setLoading(true);
      }
      if (!s) setAuthReady(true);
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);
  const toggleFavorite = useCallback(
    async (kind: Favorite["kind"], itemId: string) => {
      if (!customerId) {
        if (testMode) {
          setFavorites((current) =>
            current.some((favorite) => favorite.kind === kind && favorite.item_id === itemId)
              ? current.filter(
                  (favorite) => !(favorite.kind === kind && favorite.item_id === itemId),
                )
              : [
                  {
                    id: `demo-${kind}-${itemId}`,
                    kind,
                    item_id: itemId,
                    created_at: new Date().toISOString(),
                  },
                  ...current,
                ],
          );
          return;
        }
        throw new Error("Sign in to save favorites.");
      }
      const existing = favorites.find(
        (favorite) => favorite.kind === kind && favorite.item_id === itemId,
      );
      setFavorites((current) =>
        existing
          ? current.filter((favorite) => favorite.id !== existing.id)
          : [
              {
                id: `optimistic-${kind}-${itemId}`,
                kind,
                item_id: itemId,
                created_at: new Date().toISOString(),
              },
              ...current,
            ],
      );
      try {
        if (existing) check(await db().from("lj_favorites").delete().eq("id", existing.id));
        else
          check(
            await db()
              .from("lj_favorites")
              .insert({ customer_id: customerId, kind, item_id: itemId }),
          );
        await refreshPrivate();
      } catch (reason) {
        setFavorites(favorites);
        throw reason;
      }
    },
    [customerId, favorites, refreshPrivate, testMode],
  );
  useEffect(() => {
    let active = true;
    if (!customerId) return;
    void (async () => {
      if (session) {
        try {
          const r = await db().rpc("lj_is_owner");
          if (active) setOwner(Boolean(check(r)));
        } catch {
          if (active) setOwner(false);
        }
      }
      if (active) setAuthReady(true);
    })();
    void refreshPrivate();
    return () => {
      active = false;
    };
  }, [customerId, refreshPrivate]);
  useEffect(() => {
    if (!supabase || !customerId) return;
    const channel = supabase
      .channel(`lj-account-${customerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lj_profiles", filter: `id=eq.${customerId}` },
        () => void refreshPrivate(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lj_reward_balances",
          filter: `customer_id=eq.${customerId}`,
        },
        () => void refreshPrivate(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lj_favorites",
          filter: `customer_id=eq.${customerId}`,
        },
        () => void refreshPrivate(),
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [customerId, refreshPrivate]);
  useForegroundRefresh(async () => {
    await Promise.all([refresh(), refreshPrivate()]);
  }, authReady);
  useEffect(() => {
    if (!supabase || Platform.OS === "web") return;
    const client = supabase;
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);
  return (
    <Context.Provider
      value={{
        clientLanguage,
        setClientLanguage,
        services,
        homeSpecials,
        products,
        workshops,
        promotions,
        settings,
        loading,
        error,
        session,
        owner,
        authReady,
        profile,
        appointments,
        purchases,
        transactions,
        credits,
        rewards: testMode && !session ? emptyRewardSummary : rewards,
        favorites,
        toggleFavorite,
        bagReady,
        cart,
        setCart,
        selected,
        setSelected,
        workshopCart,
        setWorkshopCart,
        demoOwner,
        setDemoOwner,
        testMode,
        devOwner: isDevOwnerEmail(session?.user.email),
        signInDevOwner: async () => {
          await signInDevelopmentOwner();
        },
        exitTestMode: () => {
          setTestMode(false);
          setDemoOwner(false);
        },
        refresh,
        refreshPrivate,
        notice,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSalon() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("SalonProvider is required");
  return ctx;
}
