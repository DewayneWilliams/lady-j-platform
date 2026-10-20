import React from "react";
import { Tabs } from "expo-router";
import { useSalon } from "@/lib/salon/SalonProvider";
import { clientNavigationCopy } from "@/lib/salon/clientLanguage";
import { goldTabItem, useGoldTabOptions } from "@/components/salon/BottomNavigation";
export default function ClientTabs() {
  const options = useGoldTabOptions();
  const s = useSalon(),
    copy = clientNavigationCopy[s.clientLanguage];
  const items = [
    { key: "home", label: copy.home, icon: "HouseHeart" as const },
    { key: "services", label: copy.services, icon: "Scissors" as const },
    { key: "boutique", label: copy.products, icon: "ShoppingBasket" as const },
    { key: "workshops", label: copy.workshops, icon: "BookOpenCheck" as const },
    { key: "contact", label: copy.contact, icon: "MessagesSquare" as const },
    { key: "account", label: copy.account, icon: "CircleUserRound" as const },
  ];
  return (
    <Tabs screenOptions={options} backBehavior="history">
      {items.map((item) => (
        <Tabs.Screen key={item.key} name={item.key} options={goldTabItem(item)} />
      ))}
      <Tabs.Screen name="[page]" options={{ href: null, title: "Lady J" }} />
    </Tabs>
  );
}
