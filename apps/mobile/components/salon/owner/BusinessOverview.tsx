import React from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import Icon, { IconName } from "@/lib/icons/LucideIcon";
import { Card, useColors } from "../ui";
import { OwnerButton, OwnerText, OwnerTitle } from "./OwnerUI";
export default function BusinessOverview({
  services,
  workshops,
  products,
  pending,
  orders,
  onOpen,
  bankReady,
}: {
  services: number;
  workshops: number;
  products: number;
  pending: number;
  orders: number;
  onOpen: (v: string) => void;
  bankReady: boolean;
}) {
  const c = useColors(),
    { width } = useWindowDimensions();
  const modules: { title: string; description: string; section: string; icon: IconName }[] = [
    {
      title: "Services & pricing",
      description: services + " treatments in your care menu",
      section: "Services",
      icon: "Scissors",
    },
    {
      title: "Products & inventory",
      description: products + " boutique products",
      section: "Products",
      icon: "Package",
    },
    {
      title: "Workshops & enrollment",
      description: workshops + " academy workshops",
      section: "Workshops",
      icon: "GraduationCap",
    },
    {
      title: "Orders & fulfillment",
      description: orders + " orders to manage",
      section: "Orders",
      icon: "ShoppingBag",
    },
    {
      title: "Deposits & bank verification",
      description: pending + " awaiting your review",
      section: "Payments",
      icon: "Landmark",
    },
    {
      title: "Revenue & reports",
      description: "Services, products and workshops · CSV reports",
      section: "Revenue",
      icon: "ChartNoAxesCombined",
    },
    {
      title: "Expenses & cash overview",
      description: "Everyday spending alongside your recorded receipts",
      section: "Expenses",
      icon: "Receipt",
    },
    {
      title: "Client waitlist",
      description: "Upcoming requests for a preferred day",
      section: "Waitlist",
      icon: "CalendarDays",
    },
    {
      title: "Signed service agreements",
      description: "Dated consent PDFs for your clients",
      section: "Agreements",
      icon: "FileText",
    },
    {
      title: "Apply discounts",
      description: "Choose the percentage for services, products, workshops or everything",
      section: "Discounts",
      icon: "Gift",
    },
    {
      title: "Specials & packages",
      description: "Combine services, set a package price and feature it on Home",
      section: "Specials",
      icon: "Sparkles",
    },
    {
      title: "Promotions",
      description: "Considered offers for your clients",
      section: "Promotions",
      icon: "Gift",
    },
    {
      title: "Communication",
      description: "Consent, reminders and provider setup",
      section: "Automation",
      icon: "MessagesSquare",
    },
    {
      title: "Business settings",
      description: "Contact, bank and delivery details",
      section: "Settings",
      icon: "Settings2",
    },
  ];
  return (
    <View style={{ gap: 24 }}>
      <Card style={{ backgroundColor: c.goldSurface, borderColor: c.goldBorder, gap: 14 }}>
        <OwnerText size={27} bold>
          Your business, beautifully organised.
        </OwnerText>
        <OwnerText muted>
          One private space for the details that keep Lady J running smoothly.
        </OwnerText>
        <OwnerButton
          label="Business settings"
          secondary
          icon="Settings2"
          onPress={() => onOpen("Settings")}
        />
      </Card>
      <View>
        <OwnerTitle title="Everything in its place" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {modules.map((v) => (
            <Pressable
              key={v.section}
              accessibilityRole="button"
              onPress={() => onOpen(v.section)}
              style={{ width: width > 1250 ? "30%" : width > 700 ? "47%" : "100%", flexGrow: 1 }}
            >
              <Card style={{ minHeight: 190, padding: 23, gap: 15 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View
                    style={{
                      height: 45,
                      width: 45,
                      borderRadius: 12,
                      backgroundColor: c.goldSurface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={v.icon} size={25} color={c.warning} />
                  </View>
                  <Icon name="ArrowUpRight" size={22} color={c.mutedForeground} />
                </View>
                <OwnerText size={22} bold>
                  {v.title}
                </OwnerText>
                <OwnerText muted>{v.description}</OwnerText>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
      <Card style={{ gap: 12 }}>
        <OwnerText size={24} bold>
          Ready for your next chapter
        </OwnerText>
        <OwnerText>
          {bankReady
            ? "Bank transfer instructions are available to your customers."
            : "Add bank transfer instructions before inviting customers to pay."}
        </OwnerText>
        <OwnerText muted>
          Card processing and Maria’s voice connection need provider setup. Email reminders stay
          paused until a verified sender is connected. Demo interfaces are labeled throughout.
        </OwnerText>
      </Card>
    </View>
  );
}
