import { check, db } from "./client";

export type RewardSummary = {
  enabled: boolean;
  referral_code?: string | null;
  first_name?: string;
  royalty: {
    level: number;
    annual_visits: number;
    lifetime_visits: number;
    year_start: string;
    anniversary: string;
  };
  pending_level?: { level: number; achieved_at: string } | null;
  level_history: {
    id: string;
    level: number;
    annual_visits: number;
    royalty_year_start: string;
    achieved_at: string;
  }[];
  visit_history: {
    id: string;
    appointment_id?: string | null;
    visit_date: string;
    status: "qualified" | "reversed";
    qualified_at: string;
    reversed_at?: string | null;
  }[];
  entitlements: {
    id: string;
    kind: "welcome" | "birthday";
    amount: number;
    status: "available" | "redeemed" | "expired";
    benefit_year?: number | null;
  }[];
};

export const royaltyLevels = [
  {
    level: 1,
    icon: "🌸",
    name: "Sweet Start",
    visits: 0,
    message: "Your Royalty journey begins beautifully.",
  },
  {
    level: 2,
    icon: "🌺",
    name: "Island Glow",
    visits: 3,
    message: "Your beauty journey keeps blossoming.",
  },
  {
    level: 3,
    icon: "⭐",
    name: "Caribbean Star",
    visits: 7,
    message: "Your signature glow is taking center stage.",
  },
  {
    level: 4,
    icon: "☀️",
    name: "Golden Sunshine",
    visits: 10,
    message: "Your radiance deserves to be celebrated.",
  },
  {
    level: 5,
    icon: "💎",
    name: "Diamond Glow",
    visits: 14,
    message: "Your dedication shines brilliantly.",
  },
  {
    level: 6,
    icon: "👑",
    name: "Carnival Royalty",
    visits: 20,
    message: "You carry the spirit of Lady J Royalty.",
  },
  {
    level: 7,
    icon: "👑",
    name: "Lady J Royal Circle",
    visits: 24,
    message: "You are at the heart of the Lady J Royal Circle.",
  },
] as const;

export function royaltyLevel(level: number) {
  return royaltyLevels[Math.max(0, Math.min(royaltyLevels.length - 1, level - 1))];
}

export const emptyRewardSummary: RewardSummary = {
  enabled: true,
  royalty: {
    level: 1,
    annual_visits: 0,
    lifetime_visits: 0,
    year_start: new Date().toISOString().slice(0, 10),
    anniversary: new Date().toISOString(),
  },
  level_history: [],
  visit_history: [],
  entitlements: [],
};

export async function myRewards() {
  return check(await db().rpc("lj_my_rewards")) as RewardSummary;
}
