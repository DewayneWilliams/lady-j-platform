import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Linking, Platform, Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { QRCode } from "@ttsalpha/qrcode/native";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import {
  emptyGiftsReferrals,
  GiftCard,
  GiftsReferralsSummary,
  myGiftsReferrals,
} from "@/lib/salon/gifts";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { dateLabel, money } from "@/lib/salon/types";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Action, Card, Check, ErrorBox, Field, LinkText, Tag, Txt, useColors } from "./ui";

const amounts = [150, 250, 350, 500, 1000];
const designs = ["Royal Gold", "Lady J Blush", "Midnight Crown"];
const occasions = ["Just Because", "Birthday", "Thank You", "Celebration"];
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

function Choice({
  label,
  selected,
  pink,
  onPress,
}: {
  label: string;
  selected: boolean;
  pink?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? (pink ? c.brandAccent : c.goldBorder) : c.border,
        backgroundColor: selected ? (pink ? c.brandAccentSurface : c.goldSurface) : c.card,
        transform: pressed ? [{ scale: 0.97 }] : undefined,
      })}
    >
      <Txt size={14} bold>
        {label}
      </Txt>
    </Pressable>
  );
}

function GiftVisual({ card, compact = false }: { card: GiftCard; compact?: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        borderRadius: 18,
        padding: compact ? 16 : 20,
        gap: 8,
        overflow: "hidden",
        backgroundColor: c.headerGold,
        borderWidth: 1,
        borderColor: c.goldBorder,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="Crown" size={20} color={c.headerInk} />
        <Txt size={12} bold color={c.headerInk} style={{ letterSpacing: 1 }}>
          LADY J GIFT CARD
        </Txt>
      </View>
      <Txt size={compact ? 25 : 31} bold color={c.headerInk}>
        {money(card.balance)}
      </Txt>
      <Txt bold color={c.headerInk}>
        For {card.recipient_name}
      </Txt>
      {!!card.message && (
        <Txt size={13} color={c.headerInk} numberOfLines={compact ? 2 : undefined}>
          {card.message}
        </Txt>
      )}
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}
      >
        <Txt size={11} color={c.headerInk}>
          {card.status.replaceAll("_", " ").toUpperCase()}
        </Txt>
        <Txt size={11} bold color={c.headerInk}>
          {card.expires_at
            ? `Expires ${dateLabel(card.expires_at)}`
            : "Valid for 6 Months after confirmation"}
        </Txt>
      </View>
    </View>
  );
}

export default function GiftsReferrals() {
  const c = useColors();
  const s = useSalon();
  const params = useLocalSearchParams<{ ref?: string; gift?: string }>();
  const reduced = useReducedMotionPreference();
  const shimmer = useRef(new Animated.Value(0)).current;
  const [summary, setSummary] = useState<GiftsReferralsSummary>(emptyGiftsReferrals);
  const [section, setSection] = useState<"gifts" | "referrals">("gifts");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState("");
  const [design, setDesign] = useState(designs[0]);
  const [occasion, setOccasion] = useState(occasions[0]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [senderName, setSenderName] = useState(s.profile?.full_name || "");
  const [message, setMessage] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [reference, setReference] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const finalAmount = custom ? Number(custom) : amount;
  const load = useCallback(async () => {
    if (!s.session) return setSummary(emptyGiftsReferrals);
    try {
      setSummary(await myGiftsReferrals());
    } catch {
      /* keep the account usable during schema deployment */
    }
  }, [s.session]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const code = typeof params.ref === "string" ? params.ref.trim() : "";
    if (!code || !s.session) return;
    setSection("referrals");
    setFriendCode(code);
    void Promise.resolve(db().rpc("lj_register_referral", { p_code: code }))
      .then(check)
      .then(load)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unable to link this referral."),
      );
  }, [load, params.ref, s.session]);
  useEffect(() => {
    const code = typeof params.gift === "string" ? params.gift.trim().toUpperCase() : "";
    if (!code || !s.session) return;
    setSection("gifts");
    setClaimCode(code);
    void Promise.resolve(db().rpc("lj_claim_gift_card", { p_code: code }))
      .then(check)
      .then(load)
      .then(() => setClaimCode(""))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unable to claim this gift."),
      );
  }, [load, params.gift, s.session]);
  useEffect(() => {
    if (reduced !== false) return;
    shimmer.setValue(0);
    Animated.timing(shimmer, {
      toValue: 1,
      duration: 750,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [reduced, shimmer, created]);

  const draftCard = useMemo<GiftCard>(
    () => ({
      id: "preview",
      recipient_name: recipientName || "A special someone",
      sender_name: senderName,
      message,
      occasion,
      design,
      amount: finalAmount || 0,
      balance: finalAmount || 0,
      code: "",
      status: "pending_payment",
      created_at: new Date().toISOString(),
      expires_at: null,
    }),
    [design, finalAmount, message, occasion, recipientName, senderName],
  );

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
      s.notify(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const share = async (url: string, kind: "copy" | "whatsapp" | "email") => {
    if (kind === "copy") {
      await Clipboard.setStringAsync(url);
      s.notify("Link copied.");
      return;
    }
    const target =
      kind === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`Beauty is better shared. Join me at Lady J: ${url}`)}`
        : `mailto:?subject=${encodeURIComponent("A Lady J invitation for you")}&body=${encodeURIComponent(`Beauty is better shared. Join me at Lady J: ${url}`)}`;
    await Linking.openURL(target);
  };

  if (!s.session) return null;
  return (
    <View style={{ gap: 16, marginBottom: 24 }}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Txt serif size={29} style={{ textAlign: "center" }}>
          Share the Beauty
        </Txt>
        <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>
          A thoughtful gift. A beautiful experience.
        </Txt>
        <Tag>Separate from Royalty visits</Tag>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Choice
            label="Gift Cards"
            selected={section === "gifts"}
            onPress={() => setSection("gifts")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Choice
            label="Refer a Friend"
            pink
            selected={section === "referrals"}
            onPress={() => setSection("referrals")}
          />
        </View>
      </View>

      {section === "gifts" ? (
        <View style={{ gap: 16 }}>
          <Card style={{ gap: 14, borderColor: c.goldBorder }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              {["Choose Gift", "Personalize", "Review & Pay"].map((label, index) => (
                <View key={label} style={{ flex: 1, alignItems: "center", gap: 5 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: step >= index + 1 ? c.headerGold : c.muted,
                    }}
                  >
                    <Txt size={12} bold color={step >= index + 1 ? c.headerInk : c.mutedForeground}>
                      {index + 1}
                    </Txt>
                  </View>
                  <Txt size={10} bold style={{ textAlign: "center" }}>
                    {label}
                  </Txt>
                </View>
              ))}
            </View>
            {step === 1 && (
              <>
                <Txt size={21} bold>
                  Choose a beautiful gift
                </Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {amounts.map((value) => (
                    <Choice
                      key={value}
                      label={money(value)}
                      selected={!custom && amount === value}
                      onPress={() => {
                        setCustom("");
                        setAmount(value);
                      }}
                    />
                  ))}
                </View>
                <Field
                  label="Custom Amount · TT$100–5,000"
                  value={custom}
                  onChangeText={setCustom}
                  keyboardType="decimal-pad"
                  placeholder="Enter a custom amount"
                />
                <Txt bold>Card design</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {designs.map((value) => (
                    <Choice
                      key={value}
                      label={value}
                      selected={design === value}
                      onPress={() => setDesign(value)}
                    />
                  ))}
                </View>
                <Txt bold>Occasion</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {occasions.map((value) => (
                    <Choice
                      key={value}
                      label={value}
                      selected={occasion === value}
                      onPress={() => setOccasion(value)}
                    />
                  ))}
                </View>
                <Card style={{ backgroundColor: c.goldSurface, borderColor: c.goldBorder, gap: 4 }}>
                  <Txt size={18} bold>
                    Valid for 6 Months
                  </Txt>
                  <Txt size={13} color={c.mutedForeground}>
                    Validity begins on the date payment is confirmed. The exact expiration date will
                    appear on the activated card.
                  </Txt>
                </Card>
                <Action
                  label="Personalize Gift"
                  disabled={
                    !Number.isFinite(finalAmount) || finalAmount < 100 || finalAmount > 5000
                  }
                  onPress={() => setStep(2)}
                />
              </>
            )}
            {step === 2 && (
              <>
                <Txt size={21} bold>
                  Make it personal
                </Txt>
                <Field
                  label="Recipient Name"
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
                <Field
                  label="Recipient Email"
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                />
                <Field
                  label="Recipient WhatsApp"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                />
                <Field label="Sender Name" value={senderName} onChangeText={setSenderName} />
                <Field
                  label="Optional Message"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  placeholder="A warm note for their Lady J experience"
                />
                <Check
                  checked={scheduled}
                  onPress={() => setScheduled(!scheduled)}
                  label="Schedule delivery for later"
                />
                {scheduled && (
                  <Field
                    label="Delivery Date"
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                    placeholder="YYYY-MM-DD"
                  />
                )}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action label="Back" secondary onPress={() => setStep(1)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="Review Gift"
                      disabled={
                        !recipientName.trim() ||
                        (!recipientEmail.trim() && !recipientPhone.trim()) ||
                        !senderName.trim()
                      }
                      onPress={() => setStep(3)}
                    />
                  </View>
                </View>
              </>
            )}
            {step === 3 && (
              <>
                <GiftVisual card={draftCard} />
                <Card style={{ backgroundColor: c.goldSurface, borderColor: c.goldBorder, gap: 6 }}>
                  <Txt size={19} bold>
                    Valid for 6 Months
                  </Txt>
                  <Txt size={13}>
                    The six-month validity begins only when Lady J confirms full payment. We will
                    show the exact expiration date after confirmation.
                  </Txt>
                </Card>
                <Txt size={18} bold>
                  Payment method
                </Txt>
                <Choice
                  label="Bank Transfer · Owner verification"
                  selected
                  onPress={() => undefined}
                />
                <Pressable disabled style={{ opacity: 0.78 }}>
                  <Choice
                    label="Credit Card · Not connected"
                    selected={false}
                    onPress={() => undefined}
                  />
                </Pressable>
                <Field
                  label="Bank Transfer Reference"
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Reference used with your transfer"
                />
                <Check
                  checked={acknowledged}
                  onPress={() => setAcknowledged(!acknowledged)}
                  label="I understand this gift is valid for 6 months from confirmed purchase."
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action label="Back" secondary onPress={() => setStep(2)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      label={busy ? "Submitting…" : `Submit ${money(finalAmount)}`}
                      disabled={busy || !acknowledged || !reference.trim()}
                      onPress={() =>
                        void run(async () => {
                          const data = check(
                            await db().rpc("lj_purchase_gift_card", {
                              p_amount: finalAmount,
                              p_recipient_name: recipientName,
                              p_recipient_email: recipientEmail,
                              p_recipient_phone: recipientPhone,
                              p_sender_name: senderName,
                              p_message: message,
                              p_occasion: occasion,
                              p_design: design,
                              p_delivery_at:
                                scheduled && deliveryDate
                                  ? `${deliveryDate}T12:00:00-04:00`
                                  : new Date().toISOString(),
                              p_payment_method: "bank",
                              p_payment_reference: reference,
                              p_acknowledged: acknowledged,
                              p_request_key: uuid(),
                            }),
                          ) as { id: string; code: string };
                          setCreated(data);
                          setAcknowledged(false);
                        }, "Gift request saved for payment verification.")
                      }
                    />
                  </View>
                </View>
                {!!created && (
                  <Card style={{ gap: 10, borderColor: c.goldBorder }}>
                    <Txt bold>Gift request received</Txt>
                    <Txt size={13} color={c.mutedForeground}>
                      The card will activate and become deliverable only after the owner confirms
                      the full bank transfer.
                    </Txt>
                    <Txt selectable bold>
                      {created.code}
                    </Txt>
                    <View style={{ alignItems: "center" }}>
                      <QRCode
                        value={`https://ladyjglobal.com/account?gift=${encodeURIComponent(created.code)}`}
                        size={150}
                        dotColor={c.headerInk}
                        backgroundColor="#FFFFFF"
                      />
                    </View>
                  </Card>
                )}
              </>
            )}
            {!!error && <ErrorBox message={error} />}
          </Card>

          <Card style={{ gap: 14 }}>
            <Txt size={21} bold>
              Gift Wallet
            </Txt>
            <Txt bold>Received Gifts</Txt>
            {!summary.received.length && <Txt color={c.mutedForeground}>No claimed gifts yet.</Txt>}
            {summary.received.map((card) => (
              <View key={card.id} style={{ gap: 8 }}>
                <GiftVisual card={card} compact />
                <Txt selectable size={12}>
                  {card.code}
                </Txt>
              </View>
            ))}
            <Txt bold style={{ marginTop: 6 }}>
              Gifts I&apos;ve Sent
            </Txt>
            {!summary.sent.length && (
              <Txt color={c.mutedForeground}>Your sent gifts will appear here.</Txt>
            )}
            {summary.sent.map((card) => (
              <View key={card.id} style={{ gap: 8 }}>
                <GiftVisual card={card} compact />
                <Txt selectable size={12}>
                  {card.code}
                </Txt>
              </View>
            ))}
            <Field
              label="Claim a Gift Code"
              value={claimCode}
              onChangeText={(value) => setClaimCode(value.toUpperCase())}
            />
            <Action
              label="Claim Gift"
              secondary
              disabled={busy || !claimCode.trim()}
              onPress={() =>
                void run(async () => {
                  await Promise.resolve(
                    db().rpc("lj_claim_gift_card", { p_code: claimCode.trim() }),
                  ).then(check);
                  setClaimCode("");
                }, "Gift added to your wallet.")
              }
            />
          </Card>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <Card style={{ gap: 13, borderColor: c.brandAccent }}>
            <Txt serif size={27}>
              Beauty Is Better Shared
            </Txt>
            <Txt>
              Invite a friend. You&apos;ll both receive TT$25 toward a future visit after their
              qualifying first appointment.
            </Txt>
            <Card
              style={{ backgroundColor: c.brandAccentSurface, borderColor: c.brandAccent, gap: 5 }}
            >
              <Txt bold>How it works</Txt>
              <Txt size={13}>
                Your friend registers from your link, then completes and fully pays their first
                eligible appointment of TT$350 or more. Both TT$25 credits are released
                automatically. A lower first visit closes the referral without a reward.
              </Txt>
            </Card>
            <View style={{ alignItems: "center", paddingVertical: 6 }}>
              <QRCode
                value={summary.referral_link || "https://ladyjglobal.com"}
                size={180}
                dotColor={c.headerInk}
                backgroundColor="#FFFFFF"
              />
            </View>
            <Txt selectable bold style={{ textAlign: "center" }}>
              {summary.referral_link || "Preparing your personal link…"}
            </Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Action
                label="Copy Link"
                secondary
                onPress={() => void share(summary.referral_link, "copy")}
              />
              <Action
                label="WhatsApp"
                secondary
                onPress={() => void share(summary.referral_link, "whatsapp")}
              />
              <Action
                label="Email"
                secondary
                onPress={() => void share(summary.referral_link, "email")}
              />
            </View>
            <Txt size={12} color={c.mutedForeground}>
              Credits are nontransferable, nonwithdrawable, and cannot purchase gift cards. They do
              not affect Royalty visit progress.
            </Txt>
          </Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Card style={{ flex: 1, gap: 4, borderColor: c.brandAccent }}>
              <Txt size={12} color={c.mutedForeground}>
                AVAILABLE
              </Txt>
              <Txt size={24} bold>
                {money(summary.referral_available)}
              </Txt>
            </Card>
            <Card style={{ flex: 1, gap: 4 }}>
              <Txt size={12} color={c.mutedForeground}>
                PENDING
              </Txt>
              <Txt size={24} bold>
                {money(summary.referral_pending)}
              </Txt>
            </Card>
          </View>
          <Card style={{ gap: 10 }}>
            <Txt size={20} bold>
              Referral History
            </Txt>
            {!summary.referrals.length && (
              <Txt color={c.mutedForeground}>Share your link to begin.</Txt>
            )}
            {summary.referrals.map((item) => (
              <View
                key={item.id}
                style={{
                  paddingVertical: 9,
                  borderTopWidth: 1,
                  borderColor: c.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Txt bold>{item.name}</Txt>
                  <Txt size={12} color={c.mutedForeground}>
                    {dateLabel(item.created_at)}
                  </Txt>
                </View>
                <Tag>{item.status}</Tag>
              </View>
            ))}
          </Card>
          <Card style={{ gap: 10 }}>
            <Txt bold>Have a friend&apos;s code?</Txt>
            <Field
              label="Referral Code"
              value={friendCode}
              onChangeText={(value) => setFriendCode(value.toUpperCase())}
            />
            <Action
              label="Link Referral"
              secondary
              disabled={busy || !friendCode.trim()}
              onPress={() =>
                void run(async () => {
                  await Promise.resolve(
                    db().rpc("lj_register_referral", { p_code: friendCode.trim() }),
                  ).then(check);
                  setFriendCode("");
                }, "Referral linked.")
              }
            />
            {!!error && <ErrorBox message={error} />}
          </Card>
        </View>
      )}
    </View>
  );
}
