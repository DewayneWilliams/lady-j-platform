import { MyWaitlist } from "./Waitlist";
import { DateField } from "./DateFields";
import React, { useState, useEffect } from "react";
import { View, useWindowDimensions, Pressable, Linking } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check } from "@/lib/salon/client";
import { money, dateLabel, timeLabel } from "@/lib/salon/types";
import {
  availableAuthProviders,
  socialSignIn,
  authDestination,
  AuthProviders,
  SocialProvider,
} from "@/lib/salon/auth";
import { AccountTrust } from "./AccountGate";
import Shell, { useNav } from "./Shell";
import {
  Txt,
  Action,
  Heading,
  Tag,
  Card,
  Empty,
  Field,
  Check,
  ErrorBox,
  LinkText,
  useColors,
  shared,
} from "./ui";
export function AuthScreen({
  mode,
  next,
}: {
  mode: "login" | "register" | "owner-login";
  next?: string;
}) {
  const s = useSalon(),
    go = useNav(),
    c = useColors();
  const [firstName, setFirstName] = useState(""),
    [lastName, setLastName] = useState(""),
    [birthday, setBirthday] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const [providers, setProviders] = useState<AuthProviders | null>(null),
    [providerError, setProviderError] = useState("");
  const owner = mode === "owner-login",
    register = mode === "register";
  useEffect(() => {
    if (owner) return;
    let active = true;
    void availableAuthProviders()
      .then((v) => {
        if (active) setProviders(v);
      })
      .catch((e) => {
        if (active)
          setProviderError(e instanceof Error ? e.message : "Sign-in options could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [owner]);
  const continueToAccount = () => {
    const destination = authDestination(next);
    go(destination.page, destination.params);
  };
  async function submit() {
    setError("");
    setSuccess("");
    if (
      !email.includes("@") ||
      password.length < 8 ||
      (register && (!firstName.trim() || !lastName.trim()))
    ) {
      setError(
        "Enter your email and a password of at least 8 characters. Add your name when creating an account.",
      );
      return;
    }
    setBusy(true);
    try {
      if (register) {
        const r = check(
          await db().auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                birthday: birthday || null,
                marketing_consent: consent,
              },
            },
          }),
        );
        if (!r.session)
          setSuccess("Check your email to confirm your free account, then return here to sign in.");
        else {
          check(
            await db()
              .from("lj_profiles")
              .upsert({
                id: r.session.user.id,
                full_name: name,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                birthday: birthday || null,
                email: email.trim(),
                marketing_consent: consent,
              }),
          );
          continueToAccount();
        }
      } else {
        const result = check(await db().auth.signInWithPassword({ email: email.trim(), password }));
        if (owner) {
          if (!check(await db().rpc("lj_is_owner"))) {
            await db().auth.signOut();
            setError(
              "This account is not authorized for owner access. Please use customer sign-in.",
            );
            return;
          }
          s.setDemoOwner(false);
          go("owner");
        } else {
          if (consent && result.user)
            check(
              await db()
                .from("lj_profiles")
                .update({ marketing_consent: true })
                .eq("id", result.user.id)
                .select("id")
                .single(),
            );
          continueToAccount();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: SocialProvider) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await socialSignIn(provider, consent);
      continueToAccount();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sign-in could not be completed. Please try email.",
      );
    } finally {
      setBusy(false);
    }
  }
  const anySocial = Boolean(providers && Object.values(providers).some(Boolean));
  const socialOptions = (
    <View style={{ gap: 10 }}>
      <Txt size={16} bold>
        {anySocial ? "Quick, secure sign-in" : "More ways to sign in"}
      </Txt>
      <View style={{ gap: 10 }}>
        {(
          [
            { key: "google", label: "Google" },
            { key: "facebook", label: "Facebook" },
            { key: "apple", label: "Apple" },
          ] as const
        ).map((v) => (
          <View key={v.key} style={{ gap: 3 }}>
            <Action
              label={"Continue with " + v.label}
              secondary
              disabled={busy || !providers?.[v.key]}
              onPress={() => void social(v.key)}
              style={{ alignSelf: "stretch", minHeight: 56 }}
            />
            {!providers?.[v.key] && (
              <Txt size={13} color={c.mutedForeground}>
                {providers
                  ? "Awaiting secure provider setup"
                  : providerError
                    ? "Provider status unavailable"
                    : "Checking availability"}
              </Txt>
            )}
          </View>
        ))}
      </View>
      {!!providerError && (
        <Txt size={14} color={c.mutedForeground}>
          {providerError}
        </Txt>
      )}

      {!anySocial && (
        <Txt size={14} color={c.mutedForeground}>
          Email works now. Social sign-in will be available once the salon completes provider setup.
        </Txt>
      )}
    </View>
  );
  return (
    <Shell>
      <View
        style={{ maxWidth: 500, width: "100%", alignSelf: "center", paddingVertical: 24, gap: 20 }}
      >
        <Tag>{owner ? "Private owner access" : "Free account · Private by design"}</Tag>
        <Txt serif size={38} style={{ lineHeight: 44 }}>
          {owner
            ? "Welcome back, Lady J."
            : register
              ? "A little care starts here."
              : "Your next moment awaits."}
        </Txt>
        <Txt size={17} color={c.mutedForeground}>
          {owner
            ? "Business management is exclusively for the verified salon owner."
            : "Choose your time and keep your bookings together. Your account is always free."}
        </Txt>
        {!!error && <ErrorBox message={error} />}
        {!!success && (
          <Card>
            <Txt size={17}>{success}</Txt>
          </Card>
        )}
        {!owner && anySocial && (
          <View style={{ gap: 10 }}>
            <Txt size={14} color={c.mutedForeground}>
              Continuing creates a free account if needed. You agree to the Terms and acknowledge
              our Privacy notice. Marketing stays optional.
            </Txt>
            <View style={{ flexDirection: "row", gap: 20 }}>
              <LinkText onPress={() => go("terms")}>Terms</LinkText>
              <LinkText onPress={() => go("privacy")}>Privacy notice</LinkText>
            </View>
            {socialOptions}
          </View>
        )}
        <View>
          {register && (
            <>
              <Txt size={18} bold>
                Name
              </Txt>
              <Field label="First name" value={firstName} onChangeText={setFirstName} />
              <Field label="Last name" value={lastName} onChangeText={setLastName} />
              <DateField
                label="Date of birth (optional)"
                value={birthday}
                onChange={setBirthday}
                birthday
                optional
              />
            </>
          )}
          <Field
            label="Email address"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
          />
          {!owner && (
            <View style={{ gap: 10, marginBottom: 18 }}>
              <Check
                label="Email me salon offers and workshop news (optional)."
                checked={consent}
                onPress={() => setConsent(!consent)}
              />
              <Txt size={14} color={c.mutedForeground}>
                Marketing is off by default. You can change your choice in My Profile. Booking
                updates are separate.
              </Txt>
              <Txt size={14} color={c.mutedForeground}>
                By continuing, you agree to our Terms and acknowledge our Privacy notice. New
                accounts are free.
              </Txt>
              <View style={{ flexDirection: "row", gap: 20 }}>
                <LinkText onPress={() => go("terms")}>Terms</LinkText>
                <LinkText onPress={() => go("privacy")}>Privacy notice</LinkText>
              </View>
            </View>
          )}
          <Action
            label={
              register ? "Create free account" : owner ? "Sign in as owner" : "Sign in with email"
            }
            busy={busy}
            gold
            onPress={() => void submit()}
            style={{ alignSelf: "stretch", minHeight: 56 }}
          />
        </View>
        {!owner && !anySocial && socialOptions}
        {!owner && (
          <>
            <LinkText onPress={() => go(register ? "login" : "register", next ? { next } : {})}>
              {register
                ? "Already have an account? Sign in"
                : "New to Lady J? Create a free account"}
            </LinkText>
            <AccountTrust />
          </>
        )}
        {owner && (
          <Card style={{ gap: 13, backgroundColor: c.secondary }}>
            <Txt size={15}>View appointments, clients and business details.</Txt>
            <Action
              label="View workspace"
              secondary
              onPress={() => {
                s.setDemoOwner(true);
                go("owner");
              }}
            />
            <Txt size={13} color={c.mutedForeground}>
              Real owner access must be assigned securely to your verified Supabase user.
            </Txt>
          </Card>
        )}
      </View>
    </Shell>
  );
}
export function AccountScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const ownerCard = (
    <Card
      style={{
        gap: 14,
        borderColor: c.goldBorder,
        backgroundColor: c.goldSurface,
      }}
    >
      <View style={[shared.row, { justifyContent: "space-between", flexWrap: "wrap" }]}>
        <Txt serif size={28}>
          Owner
        </Txt>
        {!s.owner && <Tag>Sample data</Tag>}
      </View>
      <Txt color={c.mutedForeground}>
        {s.owner
          ? "Your private workspace for your calendar, clients and business."
          : "Appointments, clients and business details in one place."}
      </Txt>
      <Action
        label="View dashboard"
        gold
        onPress={() => {
          s.setDemoOwner(!s.owner);
          go("owner");
        }}
      />
    </Card>
  );
  if (!s.session)
    return (
      <Shell>
        <View style={{ maxWidth: 720, alignSelf: "center", width: "100%", paddingVertical: 30 }}>
          <Empty
            title="Your own private space"
            body="Sign in to privately manage your appointments, workshop purchases, orders and personal details."
            action={
              <View style={[shared.row, { flexWrap: "wrap", justifyContent: "center" }]}>
                <Action label="Sign in" onPress={() => go("login")} />
                <Action label="Create an account" secondary onPress={() => go("register")} />
              </View>
            }
          />
          <View style={{ marginTop: 20 }}>{ownerCard}</View>
        </View>
      </Shell>
    );
  const tiles = [
    [
      "Gem",
      "Premium checkout",
      "A polished shortcut to your bag and secure checkout",
      "checkout",
    ],
    ["CalendarDays", "My appointments", "Your upcoming moments of care", "appointments"],
    [
      "GraduationCap",
      "My workshops",
      "In-person and online registrations & materials",
      "my-workshops",
    ],
    ["ShoppingBag", "My orders", "Follow your boutique purchases", "orders"],
    ["Wallet", "Payments & credits", "Deposits, transactions & balances", "payments"],
    ["Images", "My media", "Photos and videos shared privately by Lady J", "my-media"],
    ["FileText", "Service agreements", "Your signed, dated consent PDFs", "agreements"],
    ["UserRound", "My profile", "Your preferences and personal details", "profile"],
    ["ShieldCheck", "Booking policies", "Carefully considered, clearly explained", "policies"],
  ] as const;
  return (
    <Shell>
      <Heading sub="A private space for everything Lady J.">
        Welcome,
        {s.profile?.full_name?.split(" ")[0] ||
          s.session.user.user_metadata?.full_name?.split(" ")[0] ||
          "beautiful"}
        .
      </Heading>
      <View style={{ marginBottom: 20 }}>{ownerCard}</View>
      <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
        {tiles.map(([icon, title, desc, page]) => (
          <Pressable
            key={page}
            onPress={() => go(page)}
            style={{ width: width > 800 ? "31%" : "100%", flexGrow: 1 }}
          >
            <Card
              style={{
                minHeight: 170,
                gap: 12,
                ...(page === "checkout"
                  ? { borderColor: c.goldBorder, backgroundColor: c.goldSurface }
                  : {}),
              }}
            >
              <Icon name={icon} size={25} color={c.secondaryForeground} />
              <Txt serif size={25}>
                {title}
              </Txt>
              <Txt size={13} color={c.mutedForeground}>
                {desc}
              </Txt>
            </Card>
          </Pressable>
        ))}
      </View>

      <LinkText
        onPress={() => {
          void db()
            .auth.signOut()
            .then(({ error }) => {
              if (error) s.notify(error.message);
              else go("home");
            });
        }}
      >
        Sign out securely
      </LinkText>
    </Shell>
  );
}
export function ProfileScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors();
  const full = s.profile?.full_name || s.session?.user?.user_metadata?.full_name || "";
  const [firstName, setFirstName] = useState(s.profile?.first_name || full.split(" ")[0] || ""),
    [lastName, setLastName] = useState(s.profile?.last_name || full.split(" ").slice(1).join(" ")),
    [email, setEmail] = useState(s.profile?.email || s.session?.user?.email || ""),
    [phone, setPhone] = useState(s.profile?.phone || ""),
    [birthday, setBirthday] = useState(s.profile?.birthday || ""),
    [preferences, setPreferences] = useState(s.profile?.preferences || ""),
    [medicalConditions, setMedicalConditions] = useState(s.profile?.medical_conditions || ""),
    [consent, setConsent] = useState(s.profile?.marketing_consent || false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  async function save() {
    if (!s.session) return;
    setError("");
    if (!firstName.trim() || !lastName.trim() || !email.includes("@")) {
      setError("Enter your first name, last name and email.");
      return;
    }
    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      setError("Use YYYY-MM-DD for your birthday.");
      return;
    }
    setBusy(true);
    try {
      check(
        await db()
          .from("lj_profiles")
          .upsert({
            id: s.session.user.id,
            full_name: name,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone,
            birthday: birthday || null,
            preferences,
            medical_conditions: medicalConditions.trim(),
            marketing_consent: consent,
          }),
      );
      await s.refreshPrivate();
      s.notify("Your private profile has been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <Heading sub="Only you and the salon owner can access your details.">My profile</Heading>
      {!s.session ? (
        <Empty
          title="Sign in to view your profile"
          body="Your personal details stay private."
          action={<Action label="Sign in" onPress={() => go("login", { next: "profile" })} />}
        />
      ) : (
        <Card style={{ maxWidth: 650, width: "100%" }}>
          {!!error && <ErrorBox message={error} />}
          <Txt size={18} bold>
            Name
          </Txt>
          <Field label="First name" value={firstName} onChangeText={setFirstName} />
          <Field label="Last name" value={lastName} onChangeText={setLastName} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field
            label="Phone / WhatsApp"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <DateField
            label="Date of birth (optional)"
            value={birthday}
            onChange={setBirthday}
            birthday
            optional
          />
          <Field
            label="Preferences or relevant sensitivities (optional)"
            value={preferences}
            onChangeText={setPreferences}
            multiline
          />
          <Field
            label="Medical Conditions"
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            multiline
          />
          <Check
            label="I consent to receive optional offers and birthday messages."
            checked={consent}
            onPress={() => setConsent(!consent)}
          />
          <Txt color={c.mutedForeground} size={12} style={{ marginBottom: 18 }}>
            Notification providers are not connected yet. You can update your consent at any time.
          </Txt>
          <Action label="Save my profile" onPress={() => void save()} busy={busy} />
        </Card>
      )}
    </Shell>
  );
}
export function RecordsScreen({ page }: { page: string }) {
  const s = useSalon(),
    go = useNav(),
    c = useColors();
  const [recordPage, setRecordPage] = useState(0);
  useEffect(() => setRecordPage(0), [page]);
  const count =
    page === "appointments"
      ? s.appointments.length
      : page === "payments"
        ? s.transactions.length
        : s.purchases.filter((v) => v.kind === (page === "orders" ? "product" : "workshop")).length;
  const pages = Math.max(1, Math.ceil(count / 20));
  const currentPage = Math.min(recordPage, pages - 1);
  const [referenceTarget, setReferenceTarget] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false);
  const title =
    page === "appointments"
      ? "My appointments"
      : page === "orders"
        ? "My orders"
        : page === "my-workshops"
          ? "My workshops"
          : "Payments & credits";
  async function cancelPurchase(id: string) {
    setBusy(true);
    try {
      s.notify(check(await db().rpc("lj_cancel_unpaid_purchase", { p_id: id })));
      setConfirm("");
      await s.refreshPrivate();
      await s.refresh();
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to cancel this request.");
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    try {
      s.notify(check(await db().rpc("lj_cancel", { p_id: id })));
      setConfirm("");
      await s.refreshPrivate();
    } catch (e) {
      s.notify(e instanceof Error ? e.message : "Unable to cancel this appointment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <Heading sub="Private records, clearly organised.">{title}</Heading>
      {!s.session ? (
        <Empty
          title="A private space, just for you"
          body="Sign in to view your salon history."
          action={<Action label="Sign in" onPress={() => go("login", { next: page })} />}
        />
      ) : (
        <View style={{ gap: 17 }}>
          {page === "appointments" &&
            (s.appointments.length ? (
              s.appointments.slice(currentPage * 20, currentPage * 20 + 20).map((a) => (
                <Card key={a.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 15 }}>
                    <View style={{ flex: 1 }}>
                      <Txt serif size={25}>
                        {a.services?.map((v) => v.name).join(" + ") || "Salon appointment"}
                      </Txt>
                      <Txt style={{ marginVertical: 10 }}>
                        {dateLabel(a.starts_at)} at {timeLabel(a.starts_at)}
                      </Txt>
                      <Txt size={13}>
                        Total {money(a.total)} · Deposit {money(a.deposit)} · Remaining
                        {money(a.total - (a.deposit_paid ? a.deposit : 0))}
                      </Txt>
                    </View>
                    <Tag>{a.status === "pending" ? "Payment pending" : a.status}</Tag>
                  </View>
                  {["pending", "confirmed"].includes(a.status) &&
                    new Date(a.starts_at) > new Date() &&
                    (confirm === a.id ? (
                      <View style={{ marginTop: 20, gap: 12 }}>
                        <Txt size={14}>
                          Cancel this appointment? The cancellation policy will apply to any
                          verified deposit.
                        </Txt>
                        <View style={shared.row}>
                          <Action
                            label="Confirm cancellation"
                            busy={busy}
                            onPress={() => void cancel(a.id)}
                          />
                          <Action
                            label="Keep appointment"
                            secondary
                            onPress={() => setConfirm("")}
                          />
                        </View>
                      </View>
                    ) : (
                      <LinkText onPress={() => setConfirm(a.id)}>Cancel appointment</LinkText>
                    ))}
                  {["completed", "cancelled", "no_show"].includes(a.status) && (
                    <LinkText
                      onPress={() => {
                        const names = a.services?.map((v) => v.name) || [];
                        const services = names.map((name) =>
                          s.services.find((v) => v.name === name && v.active),
                        );
                        if (!names.length || services.some((v) => !v)) {
                          s.notify(
                            "Some services have changed. Please choose from the current menu.",
                          );
                          go("services");
                          return;
                        }
                        s.setSelected(services.flatMap((v) => (v ? [v.id] : [])));
                        go("booking");
                      }}
                    >
                      Book these services again
                    </LinkText>
                  )}
                </Card>
              ))
            ) : (
              <Empty
                title="Your next moment is waiting"
                body="Your appointments will appear here when you submit a booking request."
                action={<Action label="Book an appointment" onPress={() => go("booking")} />}
              />
            ))}
          {page === "appointments" && <MyWaitlist />}
          {(page === "orders" || page === "my-workshops") &&
            (() => {
              const rows = s.purchases.filter(
                (v) => v.kind === (page === "orders" ? "product" : "workshop"),
              );
              return rows.length ? (
                rows.slice(currentPage * 20, currentPage * 20 + 20).map((p) => (
                  <Card key={p.id}>
                    <View style={{ gap: 10 }}>
                      <Tag>{p.status === "pending" ? "Payment pending" : p.status}</Tag>
                      <Txt serif size={25}>
                        {p.items
                          .map((v) => `${v.name}${v.quantity > 1 ? ` × ${v.quantity}` : ""}`)
                          .join(", ")}
                      </Txt>
                      <Txt>
                        {money(p.total)} · {dateLabel(p.created_at)}
                      </Txt>
                      <Txt size={13}>
                        Reference {p.id.slice(0, 8).toUpperCase()} · {p.fulfillment}
                      </Txt>
                      {p.status === "pending" &&
                        (confirm === "purchase-" + p.id ? (
                          <View style={{ gap: 12 }}>
                            <Txt size={14}>
                              Cancel this unpaid request and release reserved stock or workshop
                              space? If you already transferred money, contact the salon for
                              reconciliation.
                            </Txt>
                            <Action
                              label="Confirm cancellation"
                              busy={busy}
                              onPress={() => void cancelPurchase(p.id)}
                            />
                            <Action
                              label="Keep request"
                              secondary
                              disabled={busy}
                              onPress={() => setConfirm("")}
                            />
                          </View>
                        ) : (
                          <LinkText onPress={() => setConfirm("purchase-" + p.id)}>
                            Cancel unpaid request
                          </LinkText>
                        ))}
                      {p.kind === "workshop" &&
                        p.items.map((v) => (
                          <WorkshopAccess
                            key={v.id}
                            id={v.id}
                            purchaseId={p.id}
                            paid={["paid", "fulfilled"].includes(p.status)}
                          />
                        ))}
                    </View>
                  </Card>
                ))
              ) : (
                <Empty
                  title={
                    page === "orders"
                      ? "A little luxury to bring home"
                      : "Make room for something new"
                  }
                  body={
                    page === "orders"
                      ? "Your boutique orders and their progress will appear here."
                      : "Your workshop registrations, in-person and online workshop resources will appear here."
                  }
                  action={
                    <Action
                      label={page === "orders" ? "Explore the boutique" : "Discover workshops"}
                      onPress={() => go(page === "orders" ? "boutique" : "workshops")}
                    />
                  }
                />
              );
            })()}
          {page === "payments" && (
            <>
              <Card style={{ backgroundColor: c.secondary }}>
                <Txt size={14}>Your available future credit</Txt>
                <Txt serif size={36}>
                  {money(s.credits.reduce((n, v) => n + Number(v.amount), 0))}
                </Txt>
                <Txt size={12} color={c.mutedForeground}>
                  Credits are applied with the owner’s assistance. Refunds remain pending until
                  processed.
                </Txt>
              </Card>
              {s.transactions.length ? (
                s.transactions.slice(currentPage * 20, currentPage * 20 + 20).map((t) => (
                  <Card key={t.id}>
                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}
                    >
                      <View>
                        <Txt bold size={20}>
                          {money(t.amount)}
                        </Txt>
                        <Txt size={13} color={c.mutedForeground}>
                          Bank transfer · {dateLabel(t.created_at)}
                        </Txt>
                        <Txt size={12}>Reference: {t.reference || "Not yet supplied"}</Txt>
                        <Txt size={11} color={c.mutedForeground}>
                          Transaction {t.id.slice(0, 8).toUpperCase()}
                        </Txt>
                      </View>
                      <Tag>{t.status}</Tag>
                    </View>
                    {t.status === "pending" && t.method === "bank" && (
                      <View style={{ marginTop: 16, gap: 12 }}>
                        {referenceTarget === t.id ? (
                          <>
                            <Field
                              label="Bank transfer reference"
                              value={transferReference}
                              onChangeText={setTransferReference}
                            />
                            <Txt size={13}>
                              A reference helps the salon find your transfer. Your payment remains
                              pending until the owner verifies receipt.
                            </Txt>
                            <Action
                              label="Save reference"
                              disabled={
                                !transferReference.trim() || transferReference.trim().length > 150
                              }
                              busy={busy}
                              onPress={() => {
                                setBusy(true);
                                void (async () => {
                                  try {
                                    check(
                                      await db().rpc("lj_update_transfer_reference", {
                                        p_id: t.id,
                                        p_reference: transferReference.trim(),
                                      }),
                                    );
                                    await s.refreshPrivate();
                                    setReferenceTarget("");
                                    s.notify(
                                      "Reference saved. Your payment is still awaiting owner verification.",
                                    );
                                  } catch (e) {
                                    s.notify(
                                      e instanceof Error
                                        ? e.message
                                        : "Unable to save the reference.",
                                    );
                                  } finally {
                                    setBusy(false);
                                  }
                                })();
                              }}
                            />
                            <Action
                              label="Cancel editing"
                              secondary
                              disabled={busy}
                              onPress={() => setReferenceTarget("")}
                            />
                          </>
                        ) : (
                          <LinkText
                            onPress={() => {
                              setReferenceTarget(t.id);
                              setTransferReference(t.reference || "");
                            }}
                          >
                            {t.reference ? "Update transfer reference" : "Add transfer reference"}
                          </LinkText>
                        )}
                      </View>
                    )}
                  </Card>
                ))
              ) : (
                <Empty
                  title="Everything in one place"
                  body="Your transactions and verified payments will appear here. A pending transfer is not a payment receipt."
                />
              )}
            </>
          )}
          {pages > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <Action
                label="Previous"
                secondary
                disabled={currentPage === 0}
                onPress={() => setRecordPage(currentPage - 1)}
              />
              <Txt>
                Page {currentPage + 1} of {pages}
              </Txt>
              <Action
                label="Next"
                secondary
                disabled={currentPage + 1 >= pages}
                onPress={() => setRecordPage(currentPage + 1)}
              />
            </View>
          )}
        </View>
      )}
    </Shell>
  );
}
function WorkshopAccess({
  id,
  paid,
  purchaseId,
}: {
  id: string;
  paid: boolean;
  purchaseId: string;
}) {
  const [certificate, setCertificate] = useState("");
  useEffect(() => {
    if (paid)
      void db()
        .from("lj_attendance")
        .select("attended,certificate_url")
        .eq("purchase_id", purchaseId)
        .maybeSingle()
        .then((r) => {
          if (r.data?.attended) setCertificate(r.data.certificate_url || "");
        });
  }, [purchaseId, paid]);
  const [resources, setResources] = useState<Record<string, string | null> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (paid)
      void db()
        .from("lj_workshop_resources")
        .select("*")
        .eq("workshop_id", id)
        .maybeSingle()
        .then((r) => {
          if (r.error) setError(r.error.message);
          else setResources(r.data);
        });
  }, [id, paid]);
  if (!paid) return <Txt size={13}>Access opens after the owner verifies payment.</Txt>;
  return (
    <View style={{ gap: 8 }}>
      {!!error && <ErrorBox message={error} />}

      {!resources ? (
        <Txt size={13}>
          Your payment is verified. The owner has not added workshop resources yet.
        </Txt>
      ) : (
        Object.entries({
          live_url: "Join live session",
          materials_url: "Download materials",
        }).map(([key, label]) =>
          resources[key] ? (
            <LinkText
              key={key}
              onPress={() => {
                const url = resources[key];
                if (url?.startsWith("https://")) void Linking.openURL(url);
              }}
            >
              {label} ↗
            </LinkText>
          ) : null,
        )
      )}
      {!!certificate && (
        <LinkText
          onPress={() => {
            if (certificate.startsWith("https://")) void Linking.openURL(certificate);
          }}
        >
          View completion certificate ↗
        </LinkText>
      )}
    </View>
  );
}
