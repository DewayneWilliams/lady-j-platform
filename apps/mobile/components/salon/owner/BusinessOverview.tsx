import React from "react";
import { Pressable, View } from "react-native";
import Icon, { type IconName } from "@/lib/icons/LucideIcon";
import { Card, Txt, useColors } from "../ui";
import AttentionCard from "./AttentionCard";

const businessRows: Array<{
  title: string;
  description: string;
  section: string;
  icon: IconName;
}> = [
  {
    title: "VIP Appointments & Consultation Requests",
    description: "Approve or Decline pending requests",
    section: "Approvals",
    icon: "ClipboardList",
  },
  {
    title: "Service Menu & Pricing",
    description: "Manage services, pricing and consultations",
    section: "Services",
    icon: "Scissors",
  },
  {
    title: "Backbar Inventory",
    description: "Professional supplies, product usage and stock alerts",
    section: "Backbar",
    icon: "ScanLine",
  },
  {
    title: "Retail Inventory",
    description: "Retail products, stock levels and sales",
    section: "Products",
    icon: "Package",
  },
  {
    title: "Vendor Management",
    description: "Supplier purchases, spending and payment records",
    section: "VendorManagement",
    icon: "Wallet",
  },
  {
    title: "Client Gallery",
    description: "Private client photos, videos and treatment records",
    section: "Media",
    icon: "Images",
  },
  {
    title: "Promotions & Offers",
    description: "Special offers, promo codes and campaign performance",
    section: "Discounts",
    icon: "BadgePercent",
  },
  {
    title: "Royalty Program",
    description: "Visit rewards, membership levels and retention",
    section: "Royalty",
    icon: "Crown",
  },
  {
    title: "Gift Cards & Referrals",
    description: "Gift balances, referral rewards and redemptions",
    section: "GiftsReferrals",
    icon: "Gift",
  },
  {
    title: "Workshops & Enrollment",
    description: "Manage training sessions, enrollment and attendance",
    section: "Workshops",
    icon: "GraduationCap",
  },
  {
    title: "Business Reports",
    description: "Revenue, client activity and business performance",
    section: "Reports",
    icon: "Download",
  },
  {
    title: "Settings",
    description: "Business details, preferences and notifications",
    section: "Settings",
    icon: "Settings2",
  },
];

export default function BusinessOverview({
  onOpen,
  onMedia,
  urgentApproval = false,
}: {
  onOpen: (section: string) => void;
  onMedia: () => void;
  urgentApproval?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      {businessRows.map((row) => (
        <Pressable
          key={row.section}
          accessibilityRole="button"
          accessibilityLabel={row.title}
          accessibilityHint={row.description}
          onPress={() => (row.section === "Media" ? onMedia() : onOpen(row.section))}
          style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
        >
          {row.section === "Approvals" && urgentApproval ? (
            <AttentionCard urgent>
              <View
                style={{
                  minHeight: 84,
                  paddingLeft: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 11,
                }}
              >
                <Icon name={row.icon} size={21} color={c.brandAccent} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Txt
                    size={16}
                    bold
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    ellipsizeMode="clip"
                    style={{ lineHeight: 21 }}
                  >
                    {row.title}
                  </Txt>
                  <Txt
                    size={14}
                    color={c.mutedForeground}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    ellipsizeMode="clip"
                    style={{ flexShrink: 1, lineHeight: 19 }}
                  >
                    {row.description}
                  </Txt>
                </View>
              </View>
            </AttentionCard>
          ) : (
            <Card
              style={{
                minHeight: row.section === "Approvals" ? 92 : 72,
                paddingHorizontal: 16,
                paddingVertical: 10,
                justifyContent: "center",
                gap: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                <Icon name={row.icon} size={21} color={c.brandAccent} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Txt
                    size={17}
                    bold
                    numberOfLines={row.section === "Approvals" ? 2 : 1}
                    ellipsizeMode="clip"
                    style={{ flexShrink: 1, lineHeight: 22 }}
                  >
                    {row.title}
                  </Txt>
                  <Txt
                    size={14}
                    color={c.mutedForeground}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    ellipsizeMode="clip"
                    style={{ flexShrink: 1, lineHeight: 19 }}
                  >
                    {row.description}
                  </Txt>
                </View>
                <Icon name="ChevronRight" size={18} color={c.mutedForeground} />
              </View>
            </Card>
          )}
        </Pressable>
      ))}
    </View>
  );
}
