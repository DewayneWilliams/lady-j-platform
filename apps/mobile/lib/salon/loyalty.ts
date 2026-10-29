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
    kind: "welcome" | "birthday" | "milestone";
    amount: number;
    status: "available" | "redeemed" | "expired";
    benefit_year?: number | null;
    appointment_id?: string | null;
    level?: number | null;
    percentage?: number | null;
    max_savings?: number | null;
    royalty_year_start?: string | null;
    unlocked_at?: string;
    expires_at?: string | null;
    redeemed_at?: string | null;
    redeemed_amount?: number | null;
  }[];
};

export const royaltyLevels = [
  {
    level: 1,
    icon: "🌸",
    name: "Sweet Start",
    visits: 0,
    reward: "$50 OFF",
    maxSavings: 50,
    message: "Your Royalty journey begins beautifully.",
  },
  {
    level: 2,
    icon: "🌺",
    name: "Island Glow",
    visits: 3,
    reward: "10% OFF",
    maxSavings: 50,
    message: "Your beauty journey keeps blossoming.",
  },
  {
    level: 3,
    icon: "⭐",
    name: "Caribbean Star",
    visits: 7,
    reward: "15% OFF",
    maxSavings: 75,
    message: "Your signature glow is taking center stage.",
  },
  {
    level: 4,
    icon: "☀️",
    name: "Golden Sunshine",
    visits: 10,
    reward: "20% OFF",
    maxSavings: 100,
    message: "Your radiance deserves to be celebrated.",
  },
  {
    level: 5,
    icon: "💎",
    name: "Diamond Glow",
    visits: 14,
    reward: "30% OFF",
    maxSavings: 150,
    message: "Your dedication shines brilliantly.",
  },
  {
    level: 6,
    icon: "👑",
    name: "Carnival Royalty",
    visits: 20,
    reward: "40% OFF",
    maxSavings: 200,
    message: "You carry the spirit of Lady J Royalty.",
  },
  {
    level: 7,
    icon: "👑",
    name: "Lady J Royal Circle",
    visits: 24,
    reward: "50% OFF",
    maxSavings: 250,
    message: "You are at the heart of the Lady J Royal Circle.",
  },
] as const;

export const royaltyLevelDetails = [
  {
    level: 1,
    title: "Sweet Start — Your Royalty Journey Begins",
    message:
      "Every beautiful relationship deserves a special beginning. Welcome to Lady J, where your first experience comes with our appreciation.",
    rewardLabel: "Your Welcome Gift: TT$50 OFF",
    eligibility: "Available on your first eligible service appointment of TT$250 or more.",
  },
  {
    level: 2,
    title: "Island Glow — Your Loyalty Is Blossoming",
    message:
      "Three visits. One beautiful beginning. You’ve chosen Lady J again, and that means something to us.",
    rewardLabel: "Your Royalty Reward: 10% OFF",
    eligibility: "Unlocked after 3 qualifying visits · Maximum savings TT$50.",
  },
  {
    level: 3,
    title: "Caribbean Star — You’re Becoming a Star",
    message:
      "Seven visits represent something special: a growing relationship built on trust. Your loyalty deserves recognition.",
    rewardLabel: "Your Royalty Reward: 15% OFF",
    eligibility: "Unlocked after 7 qualifying visits · Maximum savings TT$75.",
  },
  {
    level: 4,
    title: "Golden Sunshine — A Golden Milestone",
    message:
      "Ten visits. Ten opportunities to serve you. You’ve reached a milestone worth celebrating, and we’re grateful you’ve made Lady J part of your journey.",
    rewardLabel: "Your Royalty Reward: 20% OFF",
    eligibility: "Unlocked after 10 qualifying visits · Maximum savings TT$100.",
  },
  {
    level: 5,
    title: "Diamond Glow — Loyalty That Shines",
    message:
      "Some relationships become truly extraordinary. Your continued trust has earned you a place among our Diamond Glow clients.",
    rewardLabel: "Your Royalty Reward: 30% OFF",
    eligibility: "Unlocked after 14 qualifying visits · Maximum savings TT$150.",
  },
  {
    level: 6,
    title: "Carnival Royalty — Your Loyalty Deserves the Crown",
    message:
      "Twenty visits. A remarkable expression of loyalty. Your continued support deserves exceptional recognition.",
    rewardLabel: "Your Royalty Reward: 40% OFF",
    eligibility: "Unlocked after 20 qualifying visits · Maximum savings TT$200.",
  },
  {
    level: 7,
    title: "Lady J Royal Circle — The Ultimate Royalty Experience",
    message:
      "Twenty-four visits. An extraordinary milestone. You’ve reached the highest level of Lady J Royalty. This distinction celebrates the trust, loyalty, and relationship we’ve built together. Your commitment deserves our highest recognition. Welcome to the Lady J Royal Circle. You’ve earned your crown.",
    rewardLabel: "Your Ultimate Royalty Reward: 50% OFF",
    eligibility: "Unlocked after 24 qualifying visits · Maximum savings TT$250.",
  },
] as const;

export function rewardName(reward: RewardSummary["entitlements"][number]) {
  if (reward.kind === "welcome") return "Sweet Start Welcome Gift";
  if (reward.kind === "birthday") return "Birthday Surprise";
  return `${royaltyLevel(reward.level || 1).name} Reward`;
}

export function rewardValue(reward: RewardSummary["entitlements"][number]) {
  return reward.kind === "milestone"
    ? `${Number(reward.percentage || 0)}% OFF`
    : `TT$${Number(reward.amount || 0).toFixed(0)} OFF`;
}

export function rewardExpiration(reward: RewardSummary["entitlements"][number]) {
  if (!reward.expires_at) return null;
  const timestamp = Date.parse(reward.expires_at);
  if (!Number.isFinite(timestamp)) return reward.expires_at;
  return new Date(timestamp - (reward.kind === "birthday" ? 1 : 0)).toISOString();
}

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
