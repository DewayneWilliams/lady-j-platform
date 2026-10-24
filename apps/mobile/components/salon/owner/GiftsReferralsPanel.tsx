import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { QRCode } from "@ttsalpha/qrcode/native";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import { dateLabel, money } from "@/lib/salon/types";
import { Card, ErrorBox, Field, Tag, Txt, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";

type OwnerGift = {
  id: string; recipient_name: string; recipient_email: string; recipient_phone: string; sender_name: string;
  amount: number; balance: number; secure_code: string; code_last4: string; payment_status: string; status: string;
  expires_at?: string | null; delivery_at: string; created_at: string;
};
type Referral = { id: string; referrer: string; friend: string; code: string; status: string; created_at: string; closed_at?: string | null };
type Summary = { cards: OwnerGift[]; referrals: Referral[]; sales_value: number; complimentary_value: number; outstanding: number; redeemed: number; pending_payments: number; upcoming_expirations: number; referral_outstanding: number };
const empty: Summary = { cards: [], referrals: [], sales_value: 0, complimentary_value: 0, outstanding: 0, redeemed: 0, pending_payments: 0, upcoming_expirations: 0, referral_outstanding: 0 };

export default function GiftsReferralsPanel({ demo = false }: { demo?: boolean }) {
  const c = useColors();
  const [data, setData] = useState<Summary>(empty);
  const [view, setView] = useState<"gifts" | "referrals">("gifts");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OwnerGift | null>(null);
  const [reason, setReason] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueName, setIssueName] = useState("");
  const [issueEmail, setIssueEmail] = useState("");
  const [issuePhone, setIssuePhone] = useState("");
  const [issueAmount, setIssueAmount] = useState("150");
  const [issueMessage, setIssueMessage] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (demo) return;
    setData((check(await db().rpc("lj_owner_gifts_referrals")) || empty) as Summary);
  }, [demo]);
  useEffect(() => { void load().catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load Gifts & Referrals.")); }, [load]);
  const run = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true); setError("");
    try { await task(); await load(); setSelected(null); setReason(""); setAdjustment(""); }
    catch (e) { setError(e instanceof Error ? e.message : message); }
    finally { setBusy(false); }
  };
  const cards = useMemo(() => data.cards.filter((card) => `${card.recipient_name} ${card.recipient_email} ${card.recipient_phone} ${card.secure_code}`.toLowerCase().includes(query.toLowerCase())), [data.cards, query]);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignItems: "center", gap: 4 }}><OwnerText size={30} bold>Gifts &amp; Referrals</OwnerText><OwnerText muted>Stored value and referral credits, fully separate from Royalty.</OwnerText></View>
      <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><OwnerButton label="Gift Cards" secondary={view !== "gifts"} onPress={() => setView("gifts")} /></View><View style={{ flex: 1 }}><OwnerButton label="Referrals" secondary={view !== "referrals"} onPress={() => setView("referrals")} /></View></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Gift Sales", money(data.sales_value)], ["Complimentary", money(data.complimentary_value)], ["Outstanding", money(data.outstanding)], ["Redeemed", money(data.redeemed)],
          ["Pending Payments", String(data.pending_payments)], ["Expiring in 30 Days", String(data.upcoming_expirations)], ["Referral Credits", money(data.referral_outstanding)],
        ].map(([label, value]) => <Card key={label} style={{ minWidth: 145, flexGrow: 1, gap: 4 }}><OwnerText muted>{label}</OwnerText><OwnerText size={24} bold>{value}</OwnerText></Card>)}
      </View>
      {!!error && <ErrorBox message={error} />}
      {view === "gifts" ? <>
        <OwnerButton label={issueOpen ? "Close Complimentary Gift" : "Issue Complimentary Gift"} icon="Gift" onPress={() => setIssueOpen(!issueOpen)} />
        {issueOpen && <Card style={{ gap: 12, borderColor: c.goldBorder, backgroundColor: c.goldSurface }}>
          <OwnerText size={22} bold>Complimentary Gift Card</OwnerText>
          <Field label="Recipient Name" value={issueName} onChangeText={setIssueName} />
          <Field label="Recipient Email" value={issueEmail} onChangeText={setIssueEmail} keyboardType="email-address" />
          <Field label="Recipient WhatsApp" value={issuePhone} onChangeText={setIssuePhone} keyboardType="phone-pad" />
          <Field label="Amount" value={issueAmount} onChangeText={setIssueAmount} keyboardType="decimal-pad" />
          <Field label="Message" value={issueMessage} onChangeText={setIssueMessage} multiline />
          <OwnerText muted>Valid for 6 Months from issuance. Complimentary value is recorded separately from gift-card sales.</OwnerText>
          <OwnerButton label={busy ? "Issuing…" : "Issue & Activate"} disabled={busy || !issueName.trim() || (!issueEmail.trim() && !issuePhone.trim())} onPress={() => void run(async () => {
            const result = check(await db().rpc("lj_owner_issue_gift_card", { p_amount: Number(issueAmount), p_recipient_name: issueName, p_recipient_email: issueEmail, p_recipient_phone: issuePhone, p_message: issueMessage })) as { code: string };
            setIssuedCode(result.code); setIssueName(""); setIssueEmail(""); setIssuePhone(""); setIssueMessage("");
          }, "Unable to issue the gift card.")} />
          {!!issuedCode && <View style={{ alignItems: "center", gap: 8 }}><QRCode value={`https://ladyjglobal.com/account?gift=${encodeURIComponent(issuedCode)}`} size={150} dotColor={c.headerInk} backgroundColor="#FFFFFF" /><Txt selectable bold>{issuedCode}</Txt></View>}
        </Card>}
        <Field label="Search cards, recipients or codes" value={query} onChangeText={setQuery} />
        {!cards.length && <Card><OwnerText>No matching gift cards.</OwnerText></Card>}
        {cards.map((card) => <Pressable key={card.id} onPress={() => setSelected(selected?.id === card.id ? null : card)}><Card style={{ gap: 9, borderColor: card.payment_status === "pending" ? c.goldBorder : c.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Icon name="Gift" size={22} color={c.tertiary} /><View style={{ flex: 1 }}><OwnerText size={21} bold>{card.recipient_name}</OwnerText><OwnerText muted>{card.sender_name} · •••• {card.code_last4}</OwnerText></View><Tag>{card.status.replaceAll("_", " ")}</Tag></View>
          <OwnerText>{money(card.balance)} remaining of {money(card.amount)}</OwnerText>
          <OwnerText muted>{card.expires_at ? `Expires ${dateLabel(card.expires_at)}` : "Valid for 6 Months after payment confirmation"}</OwnerText>
          {selected?.id === card.id && <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderColor: c.border }}>
            <Txt selectable>{card.secure_code}</Txt>
            {card.payment_status === "pending" && <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><OwnerButton label="Verify Bank Transfer" disabled={busy} onPress={() => void run(() => Promise.resolve(db().rpc("lj_owner_verify_gift_card", { p_id: card.id, p_approve: true, p_reason: "Bank transfer verified" })).then(check), "Unable to verify payment.")} /></View><View style={{ flex: 1 }}><OwnerButton label="Reject" secondary disabled={busy || reason.trim().length < 5} onPress={() => void run(() => Promise.resolve(db().rpc("lj_owner_verify_gift_card", { p_id: card.id, p_approve: false, p_reason: reason })).then(check), "Unable to reject payment.")} /></View></View>}
            <Field label="Audit Reason" value={reason} onChangeText={setReason} placeholder="Required for rejection, adjustment or disable" />
            <Field label="Balance Adjustment (+ / −)" value={adjustment} onChangeText={setAdjustment} keyboardType="decimal-pad" />
            <OwnerButton label="Save Balance Adjustment" secondary disabled={busy || !Number(adjustment) || reason.trim().length < 5} onPress={() => void run(() => Promise.resolve(db().rpc("lj_owner_adjust_gift_card", { p_id: card.id, p_amount: Number(adjustment), p_reason: reason, p_disable: false })).then(check), "Unable to adjust balance.")} />
            <OwnerButton label="Disable Compromised Card" secondary disabled={busy || reason.trim().length < 5} onPress={() => void run(() => Promise.resolve(db().rpc("lj_owner_adjust_gift_card", { p_id: card.id, p_amount: 0, p_reason: reason, p_disable: true })).then(check), "Unable to disable card.")} />
          </View>}
        </Card></Pressable>)}
      </> : <>
        {!data.referrals.length && <Card><OwnerText>No referrals yet.</OwnerText></Card>}
        {data.referrals.map((item) => <Card key={item.id} style={{ gap: 9, borderColor: item.status === "fraud_review" ? c.destructive : c.brandAccent }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1 }}><OwnerText size={21} bold>{item.referrer || "Client"} → {item.friend || "Friend"}</OwnerText><OwnerText muted>{item.code} · {dateLabel(item.created_at)}</OwnerText></View><Tag>{item.status}</Tag></View>
          <OwnerButton label="Review / Correct" secondary onPress={() => setSelected({ id: item.id } as OwnerGift)} />
          {selected?.id === item.id && <View style={{ gap: 10 }}><Field label="Audit Reason" value={reason} onChangeText={setReason} /><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["successful","unsuccessful","fraud_review"].map((status) => <OwnerButton key={status} label={status.replaceAll("_", " ")} secondary disabled={busy || reason.trim().length < 5} onPress={() => void run(() => Promise.resolve(db().rpc("lj_owner_correct_referral", { p_id: item.id, p_status: status, p_reason: reason })).then(check), "Unable to correct referral.")} />)}</View></View>}
        </Card>)}
      </>}
    </View>
  );
}
