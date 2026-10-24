import { check, db } from "./client";

export type GiftCard = {
  id: string;
  recipient_name: string;
  sender_name: string;
  message: string;
  occasion: string;
  design: string;
  amount: number;
  balance: number;
  code: string;
  status: "pending_payment" | "scheduled" | "active" | "redeemed" | "disabled" | "owner_review";
  payment_status?: "pending" | "verified" | "rejected" | "complimentary";
  expires_at?: string | null;
  delivery_at?: string;
  created_at: string;
};

export type GiftsReferralsSummary = {
  referral_code: string;
  referral_link: string;
  referral_available: number;
  referral_pending: number;
  referrals: { id: string; status: string; name: string; created_at: string; closed_at?: string | null }[];
  received: GiftCard[];
  sent: GiftCard[];
  gift_history: {
    id: string;
    gift_card_id: string;
    entry_type: string;
    amount: number;
    balance_after: number;
    reason: string;
    created_at: string;
  }[];
};

export const emptyGiftsReferrals: GiftsReferralsSummary = {
  referral_code: "",
  referral_link: "",
  referral_available: 0,
  referral_pending: 0,
  referrals: [],
  received: [],
  sent: [],
  gift_history: [],
};

export async function myGiftsReferrals() {
  return (check(await db().rpc("lj_my_gifts_referrals")) || emptyGiftsReferrals) as GiftsReferralsSummary;
}
