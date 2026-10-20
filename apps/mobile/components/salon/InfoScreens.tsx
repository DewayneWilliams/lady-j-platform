import CatalogGallery from "./CatalogGallery";
import React from "react";
import { View, Linking, useWindowDimensions } from "react-native";
import { useSalon } from "@/lib/salon/SalonProvider";
import { salonIdentity } from "@/lib/salon/identity";
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
export default function InfoScreen({ page }: { page: string }) {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
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
      <Shell>
        <Heading sub="We’re here to help you plan your next moment of care.">Let’s connect</Heading>
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 30 }}>
          <Photo name="salon" style={{ flex: 1, height: 390, borderRadius: 18 }} />
          <Card style={{ flex: 1, gap: 20 }}>
            <Txt serif size={29}>
              Lady J Salon & Day Spa
            </Txt>
            <Txt>{s.settings?.address || salonIdentity.address}</Txt>
            <Txt>Tuesday–Saturday{`\n`}10 AM–6 PM (GMT−4)</Txt>
            <Txt color={c.mutedForeground} size={14}>
              Closed Sunday and Monday
            </Txt>
            {s.settings?.contact_phone ? (
              <LinkText
                onPress={() =>
                  void Linking.openURL(`tel:${s.settings?.contact_phone?.replace(/[^+\d]/g, "")}`)
                }
              >
                {s.settings?.contact_phone}
              </LinkText>
            ) : (
              <Tag>Salon phone not yet provided</Tag>
            )}
            {s.settings?.contact_email ? (
              <LinkText onPress={() => void Linking.openURL(`mailto:${s.settings?.contact_email}`)}>
                {s.settings?.contact_email}
              </LinkText>
            ) : (
              <Tag>Salon email not yet provided</Tag>
            )}
            <SupportContact />
            <Action gold label="Book your appointment" onPress={() => go("booking")} />
          </Card>
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
              "Private by design",
              "There are no public profiles, feeds, followers or client-to-client messages. Your account information is available to you and the authorized salon owner.",
            ],
            [
              "What is stored",
              "Your account details, preferences you choose to provide, booking history, purchases, payment references and communication consent are stored in the connected Supabase database. Never enter card details into notes or forms.",
            ],
            [
              "Photos and sensitive information",
              "Your selected inspiration photos remain on your device. The salon stores photos or health details only with your permission.",
            ],
            [
              "Free account and sign-in",
              "Catalog prices are available without an account. A free account is required to open private availability, book, shop or check out. Email sign-in is available. Google, Facebook and Apple sign-in are available only after the salon configures those providers. The chosen provider shares account details such as your name and email; Lady J does not receive your provider password.",
            ],
            [
              "Your choices",
              "Marketing is optional and off by default for new accounts. Choosing not to receive offers does not affect your ability to book. Manage or withdraw consent in My Profile. Appointment and purchase updates are separate from marketing. Contact the salon to request access to or deletion of your records. Automated messaging providers are not connected yet.",
            ],
            [
              "Policy review",
              "This is a first-version privacy notice for owner review before public launch. The owner must supply their legal business details, privacy contact, retention periods and any required disclosures.",
            ],
          ]
        : [
            [
              "Booking and payment",
              "All amounts are in TTD. Appointment deposits are 50%. Pending bank requests are not confirmed payments. Card payments are not connected. See the booking policy for cancellations.",
            ],
            [
              "Boutique purchases",
              "Products and prices in this version are demonstrations. Pickup and delivery arrangements are confirmed by the salon. Delivery fees, where configured, are shown before submission. Contact the salon about returns, refunds or product concerns.",
            ],
            [
              "Professional workshops",
              "Registration is confirmed after payment verification. Online session links, materials and completion certificates are available only when provided by the owner. A certificate is not a professional accreditation unless explicitly stated.",
            ],
            [
              "Professional confirmation",
              "Service durations and prices are estimates and require professional confirmation. Product ingredients, sensitivities, suitability and workshop schedules must be reviewed with the salon.",
            ],
            [
              "Before public launch",
              "These draft terms require owner review, legal business details and final product and workshop cancellation and refund terms before commercial use.",
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
          <Txt bold>Google Maps Reviews</Txt>
          <Txt>
            The Google reviews section uses Google Maps Platform. Google's terms apply to this
            content, and Google's Privacy Policy explains how Google handles information.
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
