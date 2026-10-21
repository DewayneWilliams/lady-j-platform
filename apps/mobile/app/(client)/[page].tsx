import ClientMediaScreen from "@/components/salon/media/ClientMediaScreen";
import { AgreementList } from "@/components/salon/ServiceAgreement";
import { Heading } from "@/components/salon/ui";
import React from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  ServicesScreen,
  WorkshopsScreen,
  BoutiqueScreen,
  DetailScreen,
} from "@/components/salon/CatalogScreens";
import BookingScreen from "@/components/salon/BookingScreen";
import {
  AuthScreen,
  AccountScreen,
  ProfileScreen,
  RecordsScreen,
} from "@/components/salon/AccountScreens";
import { BagScreen, CheckoutScreen } from "@/components/salon/CommerceScreens";
import { useSalon } from "@/lib/salon/SalonProvider";
import AccountGate from "@/components/salon/AccountGate";
import InfoScreen from "@/components/salon/InfoScreens";
import Shell, { useNav } from "@/components/salon/Shell";
import { Empty, Action } from "@/components/salon/ui";
const titles: Record<string, string> = {
  services: "Services",
  workshops: "Workshops",
  boutique: "Boutique",
  booking: "Book your moment",
  account: "My Account",
  login: "Sign in",
  register: "Create an account",
  "owner-login": "Owner sign-in",
  profile: "My Profile",
  appointments: "My Appointments",
  "my-workshops": "My Workshops",
  orders: "My Orders",
  payments: "Payments & Credits",
  agreements: "My service agreements",
  "my-media": "My media",
  bag: "Shopping Bag",
  checkout: "Secure Checkout",
  about: "About Lady J",
  contact: "Contact",
  gallery: "Gallery",
  promotions: "Promotions",
  policies: "Booking Policies",
  privacy: "Privacy",
  terms: "Terms",
  product: "Product Details",
  workshop: "Workshop Details",
};
export default function Page() {
  const { page, id, kind, next } = useLocalSearchParams<{
    page: string;
    id?: string;
    kind?: string;
    next?: string;
  }>();
  const go = useNav();
  const s = useSalon();
  let content: React.ReactNode;
  switch (page) {
    case "services":
      content = <ServicesScreen />;
      break;
    case "workshops":
      content = <WorkshopsScreen />;
      break;
    case "boutique":
      content = <BoutiqueScreen />;
      break;
    case "booking":
      content = <BookingScreen />;
      break;
    case "product":
    case "workshop":
      content = <DetailScreen kind={page} id={id || ""} />;
      break;
    case "account":
      content = <AccountScreen />;
      break;
    case "login":
    case "register":
    case "owner-login":
      content = <AuthScreen key={page} mode={page} next={next} />;
      break;
    case "my-media":
      content = s.session ? (
        <ClientMediaScreen />
      ) : s.testMode ? (
        <Shell>
          <Heading>My media</Heading>
          <Empty
            title="Development test view"
            body="Private client media is intentionally excluded from login-free Test Mode."
          />
        </Shell>
      ) : (
        <AccountGate next="my-media" />
      );
      break;
    case "agreements":
      content = (
        <Shell>
          <Heading>My signed agreements</Heading>
          {s.session || s.testMode ? (
            <AgreementList customerId={s.session?.user.id} demo={s.testMode && !s.session} />
          ) : (
            <Action label="Sign in" onPress={() => go("login", { next: "agreements" })} />
          )}
        </Shell>
      );
      break;
    case "profile":
      content = <ProfileScreen />;
      break;
    case "appointments":
    case "my-workshops":
    case "orders":
    case "payments":
      content = <RecordsScreen page={page} />;
      break;
    case "bag":
      content = <BagScreen />;
      break;
    case "checkout":
      content = <CheckoutScreen kind={kind || "product"} id={id} />;
      break;
    case "about":
    case "contact":
    case "gallery":
    case "promotions":
    case "policies":
    case "privacy":
    case "terms":
      content = <InfoScreen page={page} />;
      break;
    default:
      content = (
        <Shell>
          <Empty
            title="Let’s find your way back"
            body="Your next moment of care is just a tap away."
            action={<Action label="Return home" onPress={() => go("home")} />}
          />
        </Shell>
      );
  }
  if (["bag", "checkout"].includes(page) && !s.session && !s.testMode) {
    const query = new URLSearchParams();
    if (id) query.set("id", id);
    if (kind) query.set("kind", kind);
    content = <AccountGate next={page + (query.toString() ? "?" + query.toString() : "")} />;
  }
  return (
    <>
      <Stack.Screen options={{ title: titles[page] || "Lady J" }} />
      {content}
    </>
  );
}
