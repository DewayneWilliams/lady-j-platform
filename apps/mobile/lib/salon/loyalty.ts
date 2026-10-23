import { check, db } from "./client";

export type RewardEntry = {
  id: string;
  entry_type: string;
  points: number;
  value_ttd: number;
  balance_after: number;
  reason: string;
  created_at: string;
};

export type RewardSummary = {
  enabled: boolean;
  points: number;
  value_ttd: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  points_per_ttd: number;
  redemption_points: number;
  redemption_value: number;
  referral_code?: string | null;
  history: RewardEntry[];
  entitlements: {
    id: string;
    kind: "welcome" | "birthday";
    amount: number;
    status: "available" | "redeemed" | "expired";
    benefit_year?: number | null;
  }[];
};

export const rewardMilestones = [
  { points: 500, name: "Sweet Start 🌺", value: 25 },
  { points: 1000, name: "Island Glow ☀️", value: 50 },
  { points: 2000, name: "Caribbean Star ⭐", value: 100 },
  { points: 3000, name: "Golden Sunshine ✨", value: 150 },
  { points: 5000, name: "Queen of Carnival 👑", value: 250 },
] as const;

export const emptyRewardSummary: RewardSummary = {
  enabled: true,
  points: 0,
  value_ttd: 0,
  lifetime_earned: 0,
  lifetime_redeemed: 0,
  points_per_ttd: 1,
  redemption_points: 100,
  redemption_value: 5,
  history: [],
  entitlements: [],
};

export async function myRewards() {
  return check(await db().rpc("lj_my_rewards")) as RewardSummary;
}

export function nextReward(points: number) {
  return rewardMilestones.find((milestone) => points < milestone.points) || rewardMilestones.at(-1)!;
}
