import { MyWaitlist } from "./Waitlist";
import { DateField } from "./DateFields";
import React, { useState, useEffect, useRef } from "react";
import { Animated, Platform, View, Pressable, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check } from "@/lib/salon/client";
import { money, dateLabel, timeLabel, type Product, type Service } from "@/lib/salon/types";
import {
  availableAuthProviders,
  socialSignIn,
  authDestination,
  rememberAuthDestination,
  AuthProviders,
  SocialProvider,
  signOutCurrentDevice,
} from "@/lib/salon/auth";
import { AccountTrust } from "./AccountGate";
import Shell, { useNav } from "./Shell";
import { ProfilePhotoEditor } from "./ProfilePhoto";
import ServiceCard from "./ServiceCard";
import ProductCard from "./ProductCard";
import { demoTestClientPhotoPath } from "@/lib/salon/demoProfilePhotos";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import VipPaymentPanel from "./VipPaymentPanel";
import LoyaltyHeader, { LoyaltyHistory } from "./LoyaltyHeader";
import LoyaltyActions from "./LoyaltyActions";
import GiftsReferrals from "./GiftsReferrals";
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
  Photo,
} from "./ui";

const pronounOptions = [
  ["she_her", "She/Her"],
  ["he_him", "He/Him"],
  ["they_them", "They/Them"],
  ["prefer_not", "Prefer Not to Say"],
] as const;

function visiblePronouns(value?: string | null) {
  if (!value || value === "prefer_not") return "";
  return pronounOptions.find(([key]) => key === value)?.[1] || "";
}

let accountForwardTarget: string | null = null;

function AccountMenuRow({
  icon,
  title,
  description,
  onPress,
  topBorder = false,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  description?: string;
  onPress: () => void;
  topBorder?: boolean;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const motion = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);
  const [highlighted, setHighlighted] = useState(false);
  const animate = (value: number) => {
    if (reducedMotion !== false) {
      motion.setValue(0);
      return;
    }
    Animated.spring(motion, {
      toValue: value,
      speed: 24,
      bounciness: 5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0.97, 1, 1.03],
            }),
          },
          {
            translateX: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 0, 3],
            }),
          },
          {
            translateY: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 0, -2],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          setHighlighted(true);
          animate(-1);
        }}
        onPressOut={() => {
          setHighlighted(hovered.current);
          animate(hovered.current ? 1 : 0);
        }}
        onHoverIn={() => {
          hovered.current = true;
          setHighlighted(true);
          animate(1);
        }}
        onHoverOut={() => {
          hovered.current = false;
          setHighlighted(false);
          animate(0);
        }}
        accessibilityRole="button"
        accessibilityLabel={description ? `${title}. ${description}` : title}
        style={{
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 6,
          paddingHorizontal: 7,
          borderTopWidth: topBorder ? 1 : 0,
          borderColor: c.border,
          borderRadius: 12,
          backgroundColor: highlighted ? c.goldSurface : "transparent",
          shadowColor: c.foreground,
          shadowOpacity: highlighted ? 0.1 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Animated.View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.goldSurface,
            transform: [
              {
                rotate: motion.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: ["-3deg", "0deg", "3deg"],
                }),
              },
            ],
          }}
        >
          <Icon name={icon} size={18} color={c.brandAccent} />
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Txt size={16} bold>
            {title}
          </Txt>
          {!!description && (
            <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
              {description}
            </Txt>
          )}
        </View>
        <Icon name="ChevronRight" size={17} strokeWidth={1.5} color={c.foreground} />
      </Pressable>
    </Animated.View>
  );
}

function AccountHistoryControls({ currentPage }: { currentPage: string }) {
  const router = useRouter();
  const go = useNav();
  const c = useColors();
  const canGoBack = router.canGoBack();
  const canGoForward = Boolean(accountForwardTarget && accountForwardTarget !== currentPage);
  return (
    <View
      accessibilityLabel="Account navigation history"
      style={{
        flexDirection: "row",
        gap: 8,
        justifyContent: "flex-end",
        marginBottom: currentPage === "account" ? 4 : 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityState={{ disabled: !canGoBack }}
        disabled={!canGoBack}
        onPress={() => {
          if (!router.canGoBack()) return;
          accountForwardTarget = currentPage;
          router.back();
        }}
        style={({ pressed }) => ({ opacity: !canGoBack ? 0.35 : pressed ? 0.6 : 1, padding: 10 })}
      >
        <Icon name="ArrowLeft" size={22} color={c.foreground} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go forward"
        accessibilityState={{ disabled: !canGoForward }}
        disabled={!canGoForward}
        onPress={() => {
          const target = accountForwardTarget;
          if (!target) return;
          accountForwardTarget = null;
          go(target);
        }}
        style={({ pressed }) => ({
          opacity: !canGoForward ? 0.35 : pressed ? 0.6 : 1,
          padding: 10,
        })}
      >
        <Icon name="ArrowRight" size={22} color={c.foreground} />
      </Pressable>
    </View>
  );
}
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
  useEffect(() => {
    if (!owner && s.authReady && s.session) continueToAccount();
  }, [owner, s.authReady, s.session]);
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
            await signOutCurrentDevice();
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
      await rememberAuthDestination(next);
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
        <Txt
          serif
          size={38}
          style={{
            lineHeight: 44,
            fontSize: 24,
            textAlign: "center",
          }}
        >
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
    c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const avatarEntrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion !== false) {
      avatarEntrance.setValue(1);
      return;
    }
    Animated.spring(avatarEntrance, {
      toValue: 1,
      speed: 16,
      bounciness: 6,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [avatarEntrance, reducedMotion]);
  const accountParams = useLocalSearchParams<{ ref?: string; gift?: string }>();
  const accountNext =
    "account" +
    (accountParams.ref
      ? `?ref=${encodeURIComponent(accountParams.ref)}`
      : accountParams.gift
        ? `?gift=${encodeURIComponent(accountParams.gift)}`
        : "");
  if (!s.session && !s.testMode)
    return (
      <Shell footer={false}>
        <View style={{ maxWidth: 720, alignSelf: "center", width: "100%", paddingVertical: 30 }}>
          <Empty
            title="Your own private space"
            body="Sign in to privately manage your appointments, workshop purchases, orders and personal details."
            action={
              <View style={[shared.row, { flexWrap: "wrap", justifyContent: "center" }]}>
                <Action label="Sign in" onPress={() => go("login", { next: accountNext })} />
                <Action
                  label="Create an account"
                  secondary
                  onPress={() => go("register", { next: accountNext })}
                />
              </View>
            }
          />
        </View>
      </Shell>
    );
  const name =
    s.profile?.full_name ||
    s.session?.user.user_metadata?.full_name ||
    (s.testMode ? "Test Client" : "Client");
  const firstName = s.profile?.first_name || name.split(" ")[0] || "beautiful";
  const nextAppointment = s.appointments
    .filter((appointment) => appointment.status === "confirmed" && Date.parse(appointment.starts_at) > Date.now())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const birthdayEntitlement = s.rewards.entitlements.find(
    (entry) => entry.kind === "birthday" && entry.status === "available",
  );
  const birthdayExpiration =
    birthdayEntitlement && s.profile?.birthday
      ? dateLabel(
          new Date(
            Date.UTC(
              birthdayEntitlement.benefit_year || new Date().getUTCFullYear(),
              Number(s.profile.birthday.slice(5, 7)) - 1,
              Number(s.profile.birthday.slice(8, 10)) + 7,
              12,
            ),
          ).toISOString(),
        )
      : "7 days after your birthday";
  const rows = [
    ["UserRound", "Profile", "Personal details and preferences", "profile"],
    ["CalendarDays", "Appointment History", "Upcoming bookings and service history", "appointments"],
    ["Wallet", "Orders & Payments", "Purchases, deposits, credits and balances", "payments"],
    ["Heart", "Favorites", "Saved services, products and workshops", "favorites"],
    ["Images", "Photos & Videos", "Privately share your beauty inspiration", "my-media"],
    ["Crown", "Royalty Rewards", "History, benefits and reward redemption", "royalty-rewards"],
    [
      "GraduationCap",
      "Beauty Academy",
      "Courses, workshops and learning materials",
      "my-workshops",
    ],
    [
      "FileText",
      "Policies & Agreements",
      "Booking policies and signed consent forms",
      "agreements",
    ],
  ] as const;
  return (
    <Shell footer={false} contentTopPadding={0}>
      <View
        style={{
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          marginBottom: 4,
        }}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: avatarEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 0],
                }),
              },
              {
                scale: avatarEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          }}
        >
          <ProfilePhotoEditor
            name={name}
            mode="client"
            clientPath={
              s.profile?.profile_photo_path ||
              (!s.session && s.testMode ? demoTestClientPhotoPath : null)
            }
            displayPath={s.profile?.display_profile_photo_path}
            updatedAt={s.profile?.profile_photo_updated_at}
            disabled={!s.session}
            transparent
            onChanged={s.refreshPrivate}
          />
        </Animated.View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt size={21} bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Welcome Back, {firstName}
          </Txt>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={nextAppointment ? "View next appointment" : "Book an appointment"}
            onPress={() => go(nextAppointment ? "appointments" : "booking")}
            style={{ alignSelf: "flex-start", minWidth: 0, maxWidth: "100%" }}
          >
            <Txt size={14} color={c.brandAccent} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {nextAppointment
                ? `Next Appointment · ${dateLabel(nextAppointment.starts_at)} at ${timeLabel(nextAppointment.starts_at)}`
                : "No Upcoming Appointments · Book Now ›"}
            </Txt>
          </Pressable>
          {!s.session && s.testMode && null}
        </View>
      </View>
      <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 6 }}>
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: c.goldBorder,
            paddingVertical: 2,
          }}
        >
          {rows.map(([icon, title, desc, page], index) => (
            <AccountMenuRow
              key={page}
              icon={icon}
              title={title}
              description={desc}
              topBorder={index > 0}
              onPress={() => go(page)}
            />
          ))}
        </View>
        <GiftsReferrals />
        {birthdayEntitlement && (
          <Card
            style={{
              gap: 8,
              backgroundColor: c.goldSurface,
              borderColor: c.goldBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="Gift" size={22} color={c.brandAccent} />
              <Txt serif size={23}>
                Your Birthday Surprise is ready
              </Txt>
            </View>
            <Txt bold>
              TT$
              {birthdayEntitlement.amount || 50} birthday credit
            </Txt>
            <Txt size={13} color={c.mutedForeground}>
              Available to eligible Royalty members through {birthdayExpiration}. Apply it to an
              eligible appointment before payment; the salon will confirm your redemption.
            </Txt>
          </Card>
        )}
        <LoyaltyHeader
          rewards={s.rewards}
          firstName={firstName}
          onChanged={s.refreshPrivate}
          compact
        />
        <AccountMenuRow
          icon="LogOut"
          title={s.testMode && !s.session ? "Exit Test Mode" : "Log Out"}
          onPress={() => {
            if (s.testMode && !s.session) {
              s.exitTestMode();
              go("home");
              return;
            }
            void signOutCurrentDevice()
              .then(() => go("login"))
              .catch((reason: unknown) =>
                s.notify(reason instanceof Error ? reason.message : "Unable to log out."),
              );
          }}
          topBorder
        />
      </View>
    </Shell>
  );
}

export function RoyaltyRewardsScreen() {
  const s = useSalon();
  const c = useColors();
  return (
    <Shell footer={false} contentTopPadding={12}>
      <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 14 }}>
        <AccountHistoryControls currentPage="royalty-rewards" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.goldSurface,
              borderWidth: 1,
              borderColor: c.goldBorder,
            }}
          >
            <Icon name="Crown" size={23} color={c.brandAccent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={26} bold>
              Royalty Rewards
            </Txt>
            <Txt size={13} color={c.mutedForeground}>
              Your Royalty history, benefits and available rewards.
            </Txt>
          </View>
        </View>
        <LoyaltyHistory rewards={s.rewards} />
        <LoyaltyActions
          rewards={s.rewards}
          appointments={s.appointments}
          onChanged={s.refreshPrivate}
        />
      </View>
    </Shell>
  );
}

export function FavoritesScreen() {
  const s = useSalon();
  const go = useNav();
  const c = useColors();
  const [tab, setTab] = useState<"service" | "product" | "workshop">("service");
  const catalog = tab === "service" ? s.services : tab === "product" ? s.products : s.workshops;
  const items = s.favorites
    .filter((favorite) => favorite.kind === tab)
    .flatMap((favorite) => {
      const item = catalog.find((entry) => entry.id === favorite.item_id);
      return item ? [{ favorite, item }] : [];
    });
  return (
    <Shell>
      <Heading sub="Everything you love, ready when you are.">Favorites</Heading>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>
        {(
          [
            ["service", "Services"],
            ["product", "Products"],
            ["workshop", "Workshops"],
          ] as const
        ).map(([value, label]) => (
          <View key={value} style={{ flex: 1 }}>
            <Action
              label={label}
              secondary={tab !== value}
              gold={tab === value}
              onPress={() => setTab(value)}
              style={{ minHeight: 48, paddingHorizontal: 6 }}
            />
          </View>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        {items.map(({ favorite, item }) => (
          tab === "service" ? (
            <ServiceCard key={favorite.id} service={item as Service} showFavorite onPress={() => go("booking", { id: item.id })} />
          ) : tab === "product" ? (
            <ProductCard key={favorite.id} product={item as Product} onPress={() => go("product", { id: item.id })} />
          ) : (
            <Card key={favorite.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
              <Photo name={item.image} style={{ width: 72, height: 72, borderRadius: 14 }} />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Txt size={17} bold>{item.name}</Txt>
                <LinkText onPress={() => go("workshop", { id: item.id })}>View Workshop</LinkText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from favorites`} onPress={() => void s.toggleFavorite(tab, item.id)} style={{ padding: 10 }}>
                <Icon name="Heart" size={22} color={c.brandAccent} fill={c.brandAccent} />
              </Pressable>
            </Card>
          )
        ))}
        {!items.length && (
          <Empty
            title={`No favorite ${tab === "service" ? "services" : tab === "product" ? "products" : "workshops"} yet`}
            body="Tap the heart on anything you want to find again quickly."
          />
        )}
      </View>
    </Shell>
  );
}
export function ProfileScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors();
  const full = s.profile?.full_name || s.session?.user?.user_metadata?.full_name || "";
  const [firstName, setFirstName] = useState(
      s.profile?.first_name || full.split(" ")[0] || (s.testMode ? "Test" : ""),
    ),
    [lastName, setLastName] = useState(
      s.profile?.last_name || full.split(" ").slice(1).join(" ") || (s.testMode ? "Client" : ""),
    ),
    [email, setEmail] = useState(
      s.profile?.email || s.session?.user?.email || (s.testMode ? "test@example.invalid" : ""),
    ),
    [phone, setPhone] = useState(s.profile?.phone || ""),
    [birthday, setBirthday] = useState(s.profile?.birthday || ""),
    [preferences, setPreferences] = useState(s.profile?.preferences || ""),
    [healthSafetyNotes, setHealthSafetyNotes] = useState(
      s.profile?.health_safety_notes || s.profile?.medical_conditions || "",
    ),
    [clientAccommodations, setClientAccommodations] = useState(
      s.profile?.client_accommodations || "",
    ),
    [pronouns, setPronouns] = useState(s.profile?.pronouns || null),
    [consent, setConsent] = useState(s.profile?.marketing_consent || false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  async function save() {
    setError("");
    if (!firstName.trim() || !lastName.trim() || !email.includes("@")) {
      setError("Enter your first name, last name and email.");
      return;
    }
    if (s.testMode && !s.session) {
      s.notify("Test profile updated locally. No client record was created.");
      setEditing(false);
      return;
    }
    if (!s.session) return;
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
            health_safety_notes: healthSafetyNotes.trim(),
            client_accommodations: clientAccommodations.trim(),
            pronouns,
            marketing_consent: consent,
          }),
      );
      await s.refreshPrivate();
      setEditing(false);
      s.notify("Your private profile has been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  function cancelEdit() {
    const savedFull = s.profile?.full_name || s.session?.user?.user_metadata?.full_name || "";
    setFirstName(s.profile?.first_name || savedFull.split(" ")[0] || (s.testMode ? "Test" : ""));
    setLastName(
      s.profile?.last_name ||
        savedFull.split(" ").slice(1).join(" ") ||
        (s.testMode ? "Client" : ""),
    );
    setEmail(
      s.profile?.email || s.session?.user?.email || (s.testMode ? "test@example.invalid" : ""),
    );
    setPhone(s.profile?.phone || "");
    setBirthday(s.profile?.birthday || "");
    setPreferences(s.profile?.preferences || "");
    setHealthSafetyNotes(s.profile?.health_safety_notes || s.profile?.medical_conditions || "");
    setClientAccommodations(s.profile?.client_accommodations || "");
    setPronouns(s.profile?.pronouns || null);
    setConsent(s.profile?.marketing_consent || false);
    setError("");
    setEditing(false);
  }
  return (
    <Shell>
      <AccountHistoryControls currentPage="profile" />
      <Heading sub="Only you and the salon owner can access your details.">My profile</Heading>
      {!s.session && !s.testMode ? (
        <Empty
          title="Sign in to view your profile"
          body="Your personal details stay private."
          action={<Action label="Sign in" onPress={() => go("login", { next: "profile" })} />}
        />
      ) : (
        <View style={{ maxWidth: 650, width: "100%", alignSelf: "center", gap: 14 }}>
          {s.testMode && !s.session && <Tag>Development Test Mode · Local fields only</Tag>}
          {!!error && <ErrorBox message={error} />}
          <View style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
            <ProfilePhotoEditor
              name={name || "Client"}
              mode="client"
              clientPath={
                s.profile?.profile_photo_path ||
                (!s.session && s.testMode ? demoTestClientPhotoPath : null)
              }
              displayPath={s.profile?.display_profile_photo_path}
              updatedAt={s.profile?.profile_photo_updated_at}
              disabled={!s.session}
              onChanged={s.refreshPrivate}
            />
            <Txt size={13} color={c.mutedForeground}>
              Tap to update your private profile photo
            </Txt>
          </View>
          {editing ? (
            <>
              <Txt size={18} bold>
                Name
              </Txt>
              <Field label="First name" value={firstName} onChangeText={setFirstName} />
              <Field label="Last name" value={lastName} onChangeText={setLastName} />
              <Txt size={14} bold style={{ marginTop: 4 }}>
                Pronouns (optional)
              </Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {pronounOptions.map(([value, label]) => {
                  const selected = pronouns === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setPronouns(selected ? null : value)}
                      style={{
                        minHeight: 44,
                        justifyContent: "center",
                        paddingHorizontal: 14,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: selected ? c.brandAccent : c.border,
                        backgroundColor: selected ? c.brandAccentSurface : c.card,
                      }}
                    >
                      <Txt bold={selected} color={selected ? c.brandAccent : c.foreground}>
                        {label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
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
              <View style={{ gap: 4 }}>
                <Field
                  label="Health & Safety Notes (optional)"
                  value={healthSafetyNotes}
                  onChangeText={setHealthSafetyNotes}
                  multiline
                />
                <Txt size={13} color={c.mutedForeground}>
                  Allergies, sensitivities, medical considerations, and treatment precautions.
                </Txt>
              </View>
              <View style={{ gap: 4 }}>
                <Field
                  label="Client Accommodations (optional)"
                  value={clientAccommodations}
                  onChangeText={setClientAccommodations}
                  multiline
                />
                <Txt size={13} color={c.mutedForeground}>
                  Accessibility needs, mobility assistance, comfort preferences, and special service
                  adjustments.
                </Txt>
              </View>
              <Check
                label="I consent to receive optional offers and birthday messages."
                checked={consent}
                onPress={() => setConsent(!consent)}
              />
              <Txt color={c.mutedForeground} size={12} style={{ marginBottom: 18 }}>
                Notification providers are not connected yet. You can update your consent at any
                time.
              </Txt>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Cancel"
                    secondary
                    onPress={cancelEdit}
                    style={{ alignSelf: "stretch" }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Save"
                    onPress={() => void save()}
                    busy={busy}
                    style={{ alignSelf: "stretch" }}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={{ gap: 0 }}>
              {[
                ["Name", name || "Not provided"],
                ["Pronouns", visiblePronouns(pronouns) || "Not provided"],
                ["Email", email || "Not provided"],
                ["Phone / WhatsApp", phone || "Not provided"],
                ["Date of Birth", birthday || "Not provided"],
                ["Health & Safety Notes", healthSafetyNotes || "Not provided"],
                ["Client Accommodations", clientAccommodations || "Not provided"],
                ["Optional Offers", consent ? "Allowed" : "Not allowed"],
              ].map(([label, value], index) => (
                <View
                  key={label}
                  style={{
                    paddingVertical: 14,
                    borderTopWidth: index ? 1 : 0,
                    borderColor: c.border,
                    gap: 4,
                  }}
                >
                  <Txt size={13} bold color={c.mutedForeground}>
                    {label}
                  </Txt>
                  <Txt>{value}</Txt>
                </View>
              ))}
              <Action
                label="Edit Profile"
                icon="Pencil"
                onPress={() => setEditing(true)}
                style={{ alignSelf: "stretch", marginTop: 14 }}
              />
            </View>
          )}
        </View>
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
      ? "Appointment History"
      : page === "orders"
        ? "My orders"
        : page === "my-workshops"
          ? "My workshops"
          : "Orders & Payments";
  async function cancelPurchase(id: string) {
    if (s.testMode && !s.session) {
      setConfirm("");
      s.notify("Test request cancelled locally. No purchase was changed.");
      return;
    }
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
    if (s.testMode && !s.session) {
      setConfirm("");
      s.notify("Test appointment cancelled locally. No appointment was changed.");
      return;
    }
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
      <AccountHistoryControls currentPage={page} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Icon
          name={
            page === "appointments"
              ? "CalendarDays"
              : page === "my-workshops"
                ? "GraduationCap"
                : "Wallet"
          }
          size={30}
          color={c.brandAccent}
        />
        <Txt
          serif
          size={32}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={{ flex: 1 }}
        >
          {title}
        </Txt>
      </View>
      <Txt color={c.mutedForeground} style={{ marginBottom: 12 }}>
        Private records, clearly organised.
      </Txt>
      {!s.session && !s.testMode ? (
        <Empty
          title="A private space, just for you"
          body="Sign in to view your salon history."
          action={<Action label="Sign in" onPress={() => go("login", { next: page })} />}
        />
      ) : (
        <View style={{ gap: 17 }}>
          {page === "appointments" &&
            (s.appointments.length ? (
              s.appointments.slice(currentPage * 20, currentPage * 20 + 20).map((a) => {
                const isConsultation = a.services?.some((service) =>
                  /^(free )?consult(ation|s)?$/i.test(service.name),
                );
                const payment = s.transactions.find(
                  (transaction) =>
                    transaction.appointment_id === a.id && !["voided"].includes(transaction.status),
                );
                return (
                  <Card key={a.id}>
                    <View
                      style={{ flexDirection: "row", justifyContent: "space-between", gap: 15 }}
                    >
                      <View style={{ flex: 1 }}>
                        <Txt serif size={25}>
                          {isConsultation
                            ? "Free Consultation"
                            : a.services?.map((v) => v.name).join(" + ") || "Salon appointment"}
                        </Txt>
                        <Txt style={{ marginVertical: 10 }}>
                          {dateLabel(a.starts_at)} at {timeLabel(a.starts_at)}
                        </Txt>
                        {isConsultation ? (
                          <Txt size={13}>
                            15 minutes · Complimentary · No payment required{"\n"}
                            {s.settings?.address || "Lady J Salon & Day Spa"}
                          </Txt>
                        ) : (
                          <Txt size={13}>
                            Total {money(a.total)} · Deposit {money(a.deposit)} · Remaining
                            {money(a.total - (a.deposit_paid ? a.deposit : 0))}
                          </Txt>
                        )}
                      </View>
                      <Tag>
                        {payment?.status === "pending"
                          ? "Pending Verification"
                          : payment?.status === "rejected"
                            ? "Payment Rejected"
                            : a.status}
                      </Tag>
                    </View>
                    {!!payment && (
                      <View
                        style={{
                          marginTop: 12,
                          gap: 6,
                          borderTopWidth: 1,
                          borderColor: c.border,
                          paddingTop: 12,
                        }}
                      >
                        <Txt size={13}>
                          Bank transfer · {money(payment.amount)} · Reference{" "}
                          {payment.reference || "not supplied"}
                        </Txt>
                        {!!payment.payment_date && (
                          <Txt size={13}>
                            Payment Date:{" "}
                            {dateLabel(payment.payment_date + "T12:00:00Z", { year: "numeric" })}
                          </Txt>
                        )}
                        {!!payment.rejection_reason && (
                          <Txt size={13} color={c.paymentPending}>
                            Reason: {payment.rejection_reason}
                          </Txt>
                        )}
                        {!!payment.receipt_path && (
                          <LinkText
                            onPress={() =>
                              void (async () => {
                                const result = check(
                                  await db()
                                    .storage.from("lj-payment-receipts")
                                    .createSignedUrl(payment.receipt_path!, 60),
                                );
                                if (!result?.signedUrl)
                                  throw new Error("Unable to open this receipt.");
                                await Linking.openURL(result.signedUrl);
                              })().catch((e) =>
                                s.notify(
                                  e instanceof Error ? e.message : "Unable to open this receipt.",
                                ),
                              )
                            }
                          >
                            View payment receipt
                          </LinkText>
                        )}
                      </View>
                    )}
                    {(a.is_vip || a.custom_approval) &&
                      a.approval_status === "approved" &&
                      !payment && <VipPaymentPanel appointment={a} />}
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
                );
              })
            ) : (
              <Empty
                title="Your next moment is waiting"
                body="Your appointments will appear here when you submit a booking request."
                action={<Action label="Book an appointment" onPress={() => go("booking")} />}
              />
            ))}
          {page === "appointments" && !s.testMode && <MyWaitlist />}
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
                        (Array.isArray(p.items) ? p.items : []).map((v) => (
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
              <Card style={{ gap: 12 }}>
                <Txt bold size={18}>
                  Purchases
                </Txt>
                <Txt color={c.mutedForeground}>
                  Review boutique purchases, fulfillment and unpaid requests.
                </Txt>
                <Action label="View product orders" secondary onPress={() => go("orders")} />
              </Card>
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
