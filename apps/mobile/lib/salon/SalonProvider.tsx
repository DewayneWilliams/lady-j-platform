import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useForegroundRefresh } from "./useForegroundRefresh";
import { orderServicesByCategory } from "./categories";
import type { Session } from "@supabase/supabase-js";
import type { ClientLanguage } from "./clientLanguage";
import { supabase, db, check } from "./client";
import { developmentTestMode } from "./testMode";
import { sessionStorage } from "./sessionStorage";
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
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  workshopCart: string[];
  setWorkshopCart: React.Dispatch<React.SetStateAction<string[]>>;
  demoOwner: boolean;
  setDemoOwner: (v: boolean) => void;
  testMode: boolean;
  exitTestMode: () => void;
  refresh: () => Promise<void>;
  refreshPrivate: () => Promise<void>;
  notice: string;
  notify: (message: string) => void;
}
const Context = createContext<SalonState | null>(null);
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
        const saved = JSON.parse(raw) as {
          products?: Record<string, number>;
          services?: string[];
          workshops?: string[];
        };
        if (saved.products && typeof saved.products === "object") {
          const products = Object.fromEntries(
            Object.entries(saved.products).filter(
              ([id, quantity]) => Boolean(id) && Number.isInteger(quantity) && quantity > 0,
            ),
          );
          setCart(products);
        }
        if (Array.isArray(saved.services))
          setSelected([...new Set(saved.services.filter(Boolean))].slice(0, 10));
        if (Array.isArray(saved.workshops))
          setWorkshopCart([...new Set(saved.workshops.filter(Boolean))]);
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
      const results = await Promise.all([
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
      setServices(orderServicesByCategory(check(results[0]) as Service[]));
      setProducts(check(results[1]) as Product[]);
      setWorkshops(check(results[2]) as Workshop[]);
      const currentSettings = check(results[3]) as Settings;
      setSettings(
        signedIn ? currentSettings : { ...currentSettings, bank_instructions: "", delivery_fee: 0 },
      );
      setPromotions(check(results[4]) as Promotion[]);
      setHomeSpecials(check(results[5]) as Service[]);
    } catch (e) {
      if (generation === catalogGeneration.current)
        setError(e instanceof Error ? e.message : "Unable to connect. Please try again.");
    } finally {
      if (generation === catalogGeneration.current) setLoading(false);
    }
  }, [signedIn]);
  const refreshPrivate = useCallback(async () => {
    const generation = ++privateGeneration.current;
    if (!customerId) {
      setProfile(null);
      setAppointments([]);
      setPurchases([]);
      setTransactions([]);
      setCredits([]);
      setRewards(emptyRewardSummary);
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
      ]);
      if (generation !== privateGeneration.current) return;
      setProfile(check(results[0]) as Profile | null);
      setAppointments(check(results[1]) as Appointment[]);
      setPurchases(check(results[2]) as Purchase[]);
      setTransactions(check(results[3]) as Transaction[]);
      setCredits(check(results[4]) as Credit[]);
      setRewards(check(results[5]) as RewardSummary);
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
    } = supabase.auth.onAuthStateChange((_event, s) => {
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
        setServices([]);
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
        { event: "*", schema: "public", table: "lj_reward_balances", filter: `customer_id=eq.${customerId}` },
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
        rewards: testMode && !session ? { ...emptyRewardSummary, points: 1240, value_ttd: 62 } : rewards,
        cart,
        setCart,
        selected,
        setSelected,
        workshopCart,
        setWorkshopCart,
        demoOwner,
        setDemoOwner,
        testMode,
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
