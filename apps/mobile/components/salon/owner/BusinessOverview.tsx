import React from "react";
import { View, Pressable } from "react-native";
import Icon, { type IconName } from "@/lib/icons/LucideIcon";
import { Card, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
export default function BusinessOverview({
  services,
  products,
  workshops,
  onOpen,
  specials,
  onMedia,
}: {
  services: number;
  products: number;
  workshops: number;
  pending: number;
  orders: number;
  bankReady: boolean;
  onOpen: (section: string) => void;
  specials?: React.ReactNode;
  onMedia: () => void;
}) {
  const c = useColors();
  const rows: { title: string; section: string; detail: string; icon: IconName }[] = [
    {
      title: "Services & Pricing",
      section: "Services",
      detail: `${services} services`,
      icon: "Scissors",
    },
    {
      title: "Products & Inventory",
      section: "Products",
      detail: `${products} products`,
      icon: "Package",
    },
    {
      title: "Workshops & Enrollment",
      section: "Workshops",
      detail: `${workshops} workshops`,
      icon: "GraduationCap",
    },
    {
      title: "Client Photos & Videos",
      section: "Media",
      detail: "Private client photos, videos and albums",
      icon: "Images",
    },
    {
      title: "Download Reports",
      section: "Reports",
      detail: "Financial, client and business reports",
      icon: "Download",
    },
    {
      title: "Settings",
      section: "Settings",
      detail: "Business details and notifications",
      icon: "Settings2",
    },
  ];
  return (
    <View style={{ gap: 28 }}>
      {specials}
      {rows.map((row) => (
        <View key={row.section} style={{ gap: 24 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={row.title}
            onPress={() => (row.section === "Media" ? onMedia() : onOpen(row.section))}
          >
            <Card style={{ padding: 22, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Icon name={row.icon} size={24} color={c.brandAccent} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <OwnerText size={22} bold>
                    {row.title}
                  </OwnerText>
                </View>
                <Icon name="ChevronRight" size={20} color={c.mutedForeground} />
              </View>
              <OwnerText muted>{row.detail}</OwnerText>
            </Card>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
