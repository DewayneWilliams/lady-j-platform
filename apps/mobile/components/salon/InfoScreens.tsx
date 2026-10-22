import CatalogGallery from "./CatalogGallery";
import React from "react";
import { View, Linking, Pressable, useWindowDimensions } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useSalon } from "@/lib/salon/SalonProvider";
import SupportContact from "./SupportContact";
import Shell, { useNav } from "./Shell";
import { Txt, Action, Heading, Photo, Tag, Card, LinkText, useColors } from "./ui";
const policies = [
  [
    "Your appointment",
    "A 50% deposit secures your appointment once payment has been verified. Bank transfer requests remain pending until the owner confirms receipt of funds. Final service suitability and pricing are confirmed by your salon professional.",
  ],
  [
    "Cancellations 24 hours or more before your visit",
    "You are eligible for a full refund of your verified deposit. Refunds are reviewed and processed by the owner; cancelling does not mean a refund has already been paid.",
  ],
  [
    "Cancellations under 24 hours",
    "The deposit is non-refundable. Management may offer 50% of the deposit as future service credit. Credit is discretionary, not automatic.",
  ],
  [
    "No-shows",
    "If you miss your appointment without cancelling, your deposit is forfeited. Please contact the salon if you are running late.",
  ],
  [
    "Business hours",
    "Tuesday–Saturday, 10 AM–6 PM. Closed Sunday and Monday. All appointment times use America/Port_of_Spain (GMT−4).",
  ],
];
const socialPlatforms = [
  { label: "Instagram", icon: "instagram", url: process.env.EXPO_PUBLIC_INSTAGRAM_URL },
  { label: "Facebook", icon: "facebook-f", url: process.env.EXPO_PUBLIC_FACEBOOK_URL },
  { label: "TikTok", icon: "tiktok", url: process.env.EXPO_PUBLIC_TIKTOK_URL },
  { label: "YouTube", icon: "youtube", url: process.env.EXPO_PUBLIC_YOUTUBE_URL },
] as const;
export default function InfoScreen({ page }: { page: string }) {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const socialColumns = width >= 980 ? 4 : width >= 540 ? 2 : 1;
  if (page === "gallery")
    return (
      <Shell>
        <Heading sub="A glimpse into the care, details and moments we love.">
          The Lady J edit
        </Heading>
        <Tag>Inspiration imagery · Not actual salon portfolio</Tag>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 25 }}>
          {["hair", "facial", "nails", "salon", "lashes", "makeup"].map((v, i) => (
            <View key={v} style={{ width: width > 800 ? "31%" : "47%", flexGrow: 1 }}>
              <Photo name={v} style={{ height: i % 2 ? 300 : 260, borderRadius: 15 }} />
            </View>
          ))}
        </View>
      </Shell>
    );
  if (page === "contact")
    return (
      <Shell footer>
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <Txt serif size={40} style={{ textAlign: "center" }}>
            Let’s connect
          </Txt>
          <Txt color={c.mutedForeground} style={{ textAlign: "center", marginTop: 8 }}>
            We’re here to help you plan your next moment of care.
          </Txt>
        </View>
        <View
          style={{
            flexDirection: width > 820 ? "row" : "column",
            alignItems: "stretch",
            gap: 24,
            maxWidth: 1040,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <View style={{ flex: 1.1, minWidth: 0, gap: 8 }}>
            <Photo
              name="contactReception"
              style={{ width: "100%", height: width > 820 ? 430 : 270, borderRadius: 18 }}
            />
            <Txt size={11} color={c.mutedForeground} style={{ textAlign: "center" }}>
              Representative salon image · The person pictured is not identified as a Lady J
              employee.
            </Txt>
          </View>
          <Card style={{ flex: 0.9, gap: 16, justifyContent: "center", padding: 24 }}>
            <Txt serif size={30}>
              Lady J Salon & Day Spa
            </Txt>
            <View style={{ gap: 3 }}>
              <Txt>On My Way Plaza</Txt>
              <Txt>Petit Valley, Trinidad and Tobago</Txt>
            </View>
            <View style={{ gap: 8, alignItems: "flex-start" }}>
              {s.settings?.contact_phone ? (
                <LinkText
                  onPress={() =>
                    void Linking.openURL(`tel:${s.settings?.contact_phone?.replace(/[^+\d]/g, "")}`)
                  }
                >
                  {s.settings.contact_phone}
                </LinkText>
              ) : (
                <Tag>Salon phone not yet provided</Tag>
              )}
              {s.settings?.contact_email ? (
                <LinkText
                  onPress={() => void Linking.openURL(`mailto:${s.settings?.contact_email}`)}
                >
                  {s.settings.contact_email}
                </LinkText>
              ) : (
                <Tag>Salon email not yet provided</Tag>
              )}
            </View>
            <SupportContact />
            <Action gold label="Book your appointment" onPress={() => go("booking")} />
          </Card>
        </View>
        <View
          style={{
            maxWidth: 1040,
            width: "100%",
            alignSelf: "center",
            borderTopWidth: 1,
            borderColor: c.border,
            marginTop: 32,
            paddingTop: 26,
            alignItems: "center",
            gap: 16,
          }}
        >
          <Txt serif size={28}>
            Connect With Us
          </Txt>
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {socialPlatforms.map((platform) => {
              const available = Boolean(platform.url);
              return (
                <Pressable
                  key={platform.label}
                  accessibilityRole="link"
                  accessibilityLabel={`${platform.label} @LadyJSalon${available ? "" : " link awaiting configuration"}`}
                  disabled={!available}
                  onPress={() => {
                    if (platform.url) void Linking.openURL(platform.url);
                  }}
                  style={({ pressed }) => ({
                    width: socialColumns === 4 ? "23.5%" : socialColumns === 2 ? "48%" : "100%",
                    maxWidth: socialColumns === 1 ? 440 : undefined,
                    height: 76,
                    borderWidth: 1,
                    borderColor: c.goldBorder,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    opacity: available ? (pressed ? 0.72 : 1) : 0.55,
                    backgroundColor: c.card,
                  })}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FontAwesome6
                      name={platform.icon}
                      iconStyle="brand"
                      size={21}
                      color={available ? c.brandAccent : c.mutedForeground}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
                    <Txt size={14} bold numberOfLines={1}>
                      {platform.label}
                    </Txt>
                    <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
                      @LadyJSalon
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {!socialPlatforms.every((platform) => platform.url) && (
            <Txt size={12} color={c.mutedForeground} style={{ textAlign: "center" }}>
              Verified social profile links are awaiting configuration.
            </Txt>
          )}
        </View>
      </Shell>
    );
  if (page === "promotions")
    return (
      <Shell>
        <Heading sub="Thoughtful little extras for your next visit.">
          Something lovely for you
        </Heading>
        {s.promotions.map((p) => (
          <Card key={p.id} style={{ gap: 17, marginBottom: 20, backgroundColor: c.secondary }}>
            {!!p.photos?.length && (
              <CatalogGallery photos={p.photos} cover={p.photos[0]} height={240} />
            )}
            <Txt serif size={29}>
              {p.name}
            </Txt>
            <Txt>{p.description}</Txt>
            <Action label="Explore services" onPress={() => go("services")} />
          </Card>
        ))}
      </Shell>
    );
  if (page === "about")
    return (
      <Shell>
        <View
          style={{ flexDirection: width > 800 ? "row" : "column", gap: 40, alignItems: "center" }}
        >
          <Photo name="salon" style={{ flex: 1, width: "100%", height: 470, borderRadius: 20 }} />
          <View style={{ flex: 1, gap: 20 }}>
            <Tag>A space for you</Tag>
            <Txt serif size={43} style={{ lineHeight: 51 }}>
              Beauty with intention.{`\n`}Care with heart.
            </Txt>
            <Txt color={c.mutedForeground}>
              Lady J Salon & Day Spa brings beauty and wellbeing together in one considered
              experience. From a signature style to a relaxing spa treatment, every appointment is
              time set aside for you.
            </Txt>
            <Txt color={c.mutedForeground}>
              We believe exceptional care feels personal. Your preferences are heard, your privacy
              is respected, and your time matters.
            </Txt>
            <Action label="Discover your treatment" onPress={() => go("services")} />
            <Txt size={11} color={c.mutedForeground}>
              Brand introduction and inspiration imagery for owner review.
            </Txt>
          </View>
        </View>
      </Shell>
    );
  const title =
    page === "policies"
      ? "Thoughtful care. Clear policies."
      : page === "privacy"
        ? "Your privacy matters."
        : "Terms of your experience";
  const sections =
    page === "policies"
      ? policies
      : page === "privacy"
        ? [
            [
              "Information we collect",
              "We collect the account and contact details you provide, booking and service history, signed service agreements, purchases, payment references, preferences, communications consent and client information needed to provide requested services. Medical conditions entered in your profile may be used by the salon to plan safer, more appropriate care. Do not enter card details into notes or forms.",
            ],
            [
              "How information is used",
              "Information is used to create and manage your account, provide availability, process booking and purchase requests, prepare for appointments, verify bank payments, maintain service records, respond to enquiries, provide requested media and send operational messages. Optional marketing consent is separate and off by default.",
            ],
            [
              "Photos, videos and consent",
              "An inspiration photo selected during booking remains on your device unless you separately submit or share it. Private client photos and videos are stored only through the salon media feature with recorded consent and item-specific access. Albums do not make media public. You may withdraw consent or request removal, subject to records the salon must retain for legitimate operational or legal reasons.",
            ],
            [
              "Authentication and service providers",
              "Account authentication and protected data storage use Supabase. If you choose Google, Facebook or Apple sign-in, that provider processes the sign-in and may share basic account information such as your name and email; Lady J does not receive your provider password. Google Maps and Google review content are provided by Google. Each provider processes information under its own terms and privacy notice.",
            ],
            [
              "Access and safeguards",
              "Private account, appointment, agreement and media records are limited to the signed-in client and authorized salon access through database access controls. Temporary media links expire. No method of storage or transmission is guaranteed to be completely secure, so clients should share only information relevant to salon care.",
            ],
            [
              "AI assistance",
              "The Maria voice assistant, conversational AI and photo recommendations are not connected. The current app does not record voice or send inspiration photos to an AI provider. This notice must be updated and fresh consent obtained before those features process client information.",
            ],
            [
              "Your choices and requests",
              "You can update profile details and marketing consent in your account. Contact the salon through the Contact page to request access, correction or deletion of your information, withdraw media consent or ask a privacy question. Some booking, payment, consent or service records may need to be retained for operational, dispute or legal purposes.",
            ],
            [
              "Owner approval required",
              "Before public launch, the owner must approve the legal business name, privacy contact details, effective date, retention periods, any cross-border processing disclosures and the procedure and timing for responding to privacy requests. This draft does not claim compliance with a specific privacy law.",
            ],
          ]
        : [
            [
              "Using the service",
              "You must provide accurate contact and booking information and keep your account secure. Catalog browsing is public, while availability, booking, purchases and private records require an account or the supported guest-booking flow. The salon may contact you when information is incomplete or professional confirmation is needed.",
            ],
            [
              "Bookings, services and suitability",
              "A submitted request is not a confirmed paid appointment until the app shows confirmation or the salon verifies the required bank payment. Service descriptions, durations and prices may depend on consultation, hair length or condition, products used and professional assessment. Tell the salon about relevant allergies, sensitivities, medical conditions and changes before treatment. Results vary and no particular result or duration is guaranteed.",
            ],
            [
              "Pricing and payments",
              "Displayed monetary amounts use TTD. The booking flow shows the selected-service total and any eligible discount before submission. Paid appointments use the existing 50% deposit policy unless the booking total is zero. Bank requests remain pending until the owner verifies receipt; a reference alone is not proof of payment. Card processing is not currently available.",
            ],
            [
              "Cancellations and changes",
              "The Booking Policy shown in the app governs appointment cancellation, rescheduling, no-shows, deposit refunds and discretionary credits. Current terms provide a full verified-deposit refund or one complimentary rescheduling with at least 24 hours’ notice; under 24 hours the deposit is non-refundable and management may offer 50% as future credit; no-shows forfeit the deposit. Refunds and credits are not complete until recorded or paid by the salon.",
            ],
            [
              "Products and workshops",
              "Product stock, pickup, delivery and any delivery charge are confirmed during checkout and fulfilment. Product suitability and ingredients should be checked before use. Workshop registration is confirmed after payment verification; schedules, links, materials and certificates are supplied only when stated. A certificate is not professional accreditation unless expressly described as such.",
            ],
            [
              "Client information, photos and videos",
              "You authorize the salon to use information you submit to manage requested services. Inspiration photos stay on your device unless separately shared. Salon photos and videos require recorded consent and remain private to authorized users. Do not upload content you do not have permission to share. Privacy practices are described in the Privacy Policy.",
            ],
            [
              "Third-party services and AI",
              "Authentication, maps, reviews, storage and messaging may rely on identified third-party providers, which have their own terms. Maria voice, conversational AI and automated photo recommendations are not connected and must not be relied on for professional, medical or emergency advice.",
            ],
            [
              "Disclaimers and responsibility",
              "Salon services, products and educational content are not medical care. Seek an appropriate health professional for medical concerns. To the extent allowed by applicable law, Lady J is not responsible for indirect losses, third-party service outages or issues caused by inaccurate information, undisclosed conditions, misuse of products or failure to follow care instructions. Nothing in these terms removes rights or responsibilities that cannot lawfully be excluded.",
            ],
            [
              "Contact and owner approval",
              "Questions, complaints and legal notices can be started through the app’s Contact page or addressed to Lady J Salon & Day Spa at On My Way Plaza, Petit Valley, Trinidad and Tobago. Before public launch, the owner must approve the legal business name, direct notice contact, effective date, governing-law and dispute terms, product return terms, workshop cancellation terms and any liability limits.",
            ],
          ];
  return (
    <Shell>
      <Heading
        sub={
          page === "policies"
            ? "Designed to respect your time and ours."
            : "Clear information about your private salon experience."
        }
      >
        {title}
      </Heading>
      <View style={{ maxWidth: 800, gap: 17 }}>
        {page !== "policies" && <Tag>Draft notice · Owner review required</Tag>}
        {sections.map(([heading, body]) => (
          <Card key={heading} style={{ gap: 12 }}>
            <Txt serif size={25}>
              {heading}
            </Txt>
            <Txt size={15} color={c.mutedForeground}>
              {body}
            </Txt>
          </Card>
        ))}
      </View>
      {(page === "privacy" || page === "terms") && (
        <Card style={{ gap: 12, marginTop: 20 }}>
          <Txt bold>Google services</Txt>
          <Txt>
            The embedded map and Google review content use Google Maps Platform. Google’s terms and
            privacy practices apply when that content loads or you open it.
          </Txt>
          <LinkText onPress={() => void Linking.openURL("https://policies.google.com/terms")}>
            Google Terms of Service
          </LinkText>
          <LinkText onPress={() => void Linking.openURL("https://policies.google.com/privacy")}>
            Google Privacy Policy
          </LinkText>
        </Card>
      )}
    </Shell>
  );
}
