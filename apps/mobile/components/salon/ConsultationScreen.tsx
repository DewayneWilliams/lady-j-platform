import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { check, db } from "@/lib/salon/client";
import {
  outcomeChoices,
  screeningQuestions,
  serviceGroup,
  clientConsultationWhatsAppSummary,
  CONSULTATION_WHATSAPP_PHONE,
  type ConsultationRequest,
} from "@/lib/salon/consultations";
import { fonts, fieldLabel } from "@/lib/salon/design";
import { internationalNumber, whatsappContactUrl } from "@/lib/salon/whatsapp";
import { DateField } from "./DateFields";
import Shell, { useNav } from "./Shell";
import { Action, Card, ErrorBox, Heading, Txt, useColors } from "./ui";

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 3) | 8).toString(16);
  });

async function assetBytes(asset: ImagePicker.ImagePickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();
  if (!asset.base64) throw new Error("Choose this inspiration photo again.");
  return Uint8Array.from(atob(asset.base64), (value) => value.charCodeAt(0)).buffer;
}

function Choice({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 52,
        maxWidth: "100%",
        borderWidth: 1,
        borderColor: selected ? c.brandAccent : c.border,
        backgroundColor: selected ? c.brandAccentSurface : c.card,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Icon
        name={selected ? "CircleCheck" : "Circle"}
        size={21}
        color={selected ? c.brandAccent : c.mutedForeground}
      />
      <Txt bold={selected} style={{ flex: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Choices({
  options,
  values,
  onChange,
  multiple = false,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <View style={{ gap: 9 }}>
      {options.map((option) => (
        <Choice
          key={option}
          label={option}
          selected={values.includes(option)}
          onPress={() =>
            onChange(
              multiple
                ? values.includes(option)
                  ? values.filter((value) => value !== option)
                  : [...values, option]
                : [option],
            )
          }
        />
      ))}
    </View>
  );
}

function Question({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <Txt size={21} bold style={{ flexShrink: 1 }}>
          {title}
        </Txt>
        {optional && (
          <Txt size={14} color={c.mutedForeground}>
            Optional
          </Txt>
        )}
      </View>
      {children}
    </View>
  );
}

function Notes({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const c = useColors();
  return (
    <TextInput
      accessibilityLabel={fieldLabel(label)}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.mutedForeground}
      multiline
      maxLength={2000}
      style={{
        minHeight: 116,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        color: c.foreground,
        borderRadius: 14,
        padding: 15,
        fontFamily: fonts.body,
        fontSize: 18,
        lineHeight: 26,
        textAlignVertical: "top",
      }}
    />
  );
}

export default function ConsultationScreen() {
  const s = useSalon();
  const c = useColors();
  const go = useNav();
  const requestKey = useRef(uuid());
  const categoryScroll = useRef<ScrollView>(null);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [primary, setPrimary] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [customOutcome, setCustomOutcome] = useState("");
  const [visitSpecial, setVisitSpecial] = useState("");
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [experience, setExperience] = useState("");
  const [comfort, setComfort] = useState("");
  const [comfortPrivate, setComfortPrivate] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState("");
  const [comments, setComments] = useState("");
  const [allergyStatus, setAllergyStatus] = useState("");
  const [allergyDetails, setAllergyDetails] = useState("");
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [accessibilityDetails, setAccessibilityDetails] = useState("");
  const [screening, setScreening] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<ConsultationRequest | null>(null);
  const [whatsappError, setWhatsappError] = useState("");

  useEffect(() => {
    setName(
      (current) =>
        current || s.profile?.full_name || String(s.session?.user.user_metadata?.full_name || ""),
    );
    setEmail((current) => current || s.profile?.email || s.session?.user.email || "");
    setWhatsapp((current) => current || s.profile?.phone || "");
  }, [s.profile, s.session]);

  const services = useMemo(
    () =>
      s.services.filter(
        (service) =>
          service.active &&
          service.catalog_visible !== false &&
          !/^free consultation$/i.test(service.name),
      ),
    [s.services],
  );
  const categories = useMemo(
    () => [...new Set(services.map((service) => service.category))],
    [services],
  );
  useEffect(() => {
    if (selected.length === 1) setPrimary(selected[0]);
    else if (!selected.includes(primary)) setPrimary("");
  }, [selected, primary]);
  const selectedServices = services.filter((service) => selected.includes(service.id));
  const availableOutcomes = useMemo(
    () => [
      ...new Set(
        selectedServices.flatMap((service) => outcomeChoices[serviceGroup(service)] || []),
      ),
      "Other",
    ],
    [selectedServices],
  );
  const safetyQuestions = useMemo(
    () => [
      ...new Map(
        selectedServices
          .flatMap((service) => screeningQuestions[serviceGroup(service)] || [])
          .map((question) => [question.id, question]),
      ).values(),
    ],
    [selectedServices],
  );

  async function choosePhotos() {
    setError("");
    try {
      if (photos.length >= 3) throw new Error("You can share up to 3 inspiration photos.");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error("Photo library permission is needed to add inspiration photos.");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 3 - photos.length,
        quality: 0.82,
        base64: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const next = await Promise.all(
        result.assets.slice(0, 3 - photos.length).map(async (asset) => {
          const normalized = await manipulateAsync(asset.uri, [], {
            compress: 0.84,
            format: SaveFormat.JPEG,
            base64: true,
          });
          return {
            ...asset,
            uri: normalized.uri,
            base64: normalized.base64 || null,
            mimeType: "image/jpeg",
            fileName: (asset.fileName || "inspiration-photo").replace(/\.[^.]+$/, ".jpg"),
            fileSize: normalized.base64 ? Math.ceil((normalized.base64.length * 3) / 4) : asset.fileSize,
          };
        }),
      );
      if (next.some((asset) => (asset.fileSize || 0) > 10 * 1024 * 1024))
        throw new Error("Each inspiration photo must be 10 MB or smaller.");
      setPhotos((current) => [...current, ...next].slice(0, 3));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to choose inspiration photos.");
    }
  }

  function validate() {
    if (selected.length < 1 || selected.length > 3) return "Choose 1 to 3 services.";
    if (selected.length > 1 && !primary) return "Choose the service that matters most.";
    if (!outcomes.length || (outcomes.includes("Other") && !customOutcome.trim()))
      return "Choose what you would love to achieve and describe Other when selected.";
    if (!visitSpecial || !occasion || !experience)
      return "Complete the visit, occasion, and previous-service questions.";
    if (!days.length || !times.length) return "Choose at least one preferred day and time.";
    if (!allergyStatus || !accessibility.length) return "Complete the Comfort & Safety choices.";
    if (safetyQuestions.some((question) => !screening[question.id]))
      return "Complete each service safety question.";
    if (name.trim().length < 2 || !email.includes("@"))
      return "Add your name and a valid email address.";
    if (whatsapp.trim() && !/^\+[1-9][0-9\s().-]{7,20}$/.test(whatsapp.trim()))
      return "Enter WhatsApp with a country code, for example +1 868 555 0123.";
    if (whatsapp.trim() && !whatsappConsent)
      return "Confirm WhatsApp consent or clear the WhatsApp field to submit without it.";
    return "";
  }

  async function submit() {
    const issue = validate();
    setError(issue);
    if (issue) return;
    setBusy(true);
    const paths: string[] = [];
    try {
      for (let index = 0; s.session && index < photos.length; index++) {
        const asset = photos[index];
        const mime = asset.mimeType || "image/jpeg";
        const extension = mime.includes("png")
          ? "png"
          : mime.includes("webp")
            ? "webp"
            : mime.includes("hei")
              ? "heic"
              : "jpg";
        const path = `${s.session.user.id}/${requestKey.current}/${index + 1}.${extension}`;
        check(
          await db()
            .storage.from("lj-consultation-media")
            .upload(path, await assetBytes(asset), {
              contentType: mime,
              upsert: true,
            }),
        );
        paths.push(path);
      }
      const finalOutcomes = outcomes.map((value) =>
        value === "Other" ? `Other: ${customOutcome.trim()}` : value,
      );
      const answers = {
        client_name: name.trim(),
        client_email: email.trim(),
        whatsapp_phone: whatsapp.trim(),
        whatsapp_consent: Boolean(whatsapp.trim() && whatsappConsent),
        service_ids: selected,
        primary_service_id: primary || selected[0],
        desired_outcomes: finalOutcomes,
        visit_special: visitSpecial,
        occasion,
        event_date: eventDate,
        previous_experience: experience,
        comfort_note: comfort,
        comfort_private: comfortPrivate,
        availability_days: days,
        availability_times: times,
        preferred_date: preferredDate,
        additional_notes: comments,
        allergy_status: allergyStatus,
        allergy_details: allergyDetails,
        accessibility_needs: accessibility,
        accessibility_details: accessibilityDetails,
        screening,
      };
      const guestPhotos = s.session
        ? []
        : photos.map((asset) => ({
            base64: asset.base64,
            mimeType: asset.mimeType || "image/jpeg",
          }));
      if (guestPhotos.some((photo) => !photo.base64))
        throw new Error(
          "Please choose the inspiration photos again so they can be securely uploaded.",
        );
      const delivery = check(
        await db().functions.invoke("lj-submit-consultation", {
          body: {
            requestKey: requestKey.current,
            answers,
            inspirationPaths: paths,
            photos: guestPhotos,
          },
        }),
      ) as {
        id: string;
        inspirationPaths?: string[];
        whatsappStatus?: ConsultationRequest["owner_alert_status"];
      };
      const id = delivery.id;
      const primaryService = selectedServices.find(
        (service) => service.id === (primary || selected[0]),
      )!;
      const completedRequest: ConsultationRequest = {
        id,
        customer_id: s.session?.user.id || null,
        client_id: null,
        client_name: name.trim(),
        client_email: email.trim(),
        whatsapp_phone: whatsapp.trim(),
        selected_services: selectedServices.map(({ id, name, category }) => ({
          id,
          name,
          category,
        })),
        primary_service: {
          id: primaryService.id,
          name: primaryService.name,
          category: primaryService.category,
        },
        desired_outcomes: finalOutcomes,
        visit_special: visitSpecial,
        occasion,
        event_date: eventDate || null,
        previous_experience: experience,
        comfort_note: comfort,
        comfort_private: comfortPrivate,
        availability_days: days,
        availability_times: times,
        preferred_date: preferredDate || null,
        additional_notes: comments,
        allergy_status: allergyStatus,
        allergy_details: allergyDetails,
        accessibility_needs: accessibility,
        accessibility_details: accessibilityDetails,
        screening,
        inspiration_paths: delivery.inspirationPaths || paths,
        summary: `Primary goal: ${primaryService.name}. Desired outcome: ${finalOutcomes.join(", ")}. What makes the visit special: ${visitSpecial}.`,
        status: "new",
        owner_alert_status: delivery.whatsappStatus || "queued",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSubmitted(completedRequest);
    } catch (reason) {
      if (paths.length) await db().storage.from("lj-consultation-media").remove(paths);
      setError(
        reason instanceof Error ? reason.message : "Your consultation request could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openWhatsAppSummary(request: ConsultationRequest) {
    setWhatsappError("");
    const message = clientConsultationWhatsAppSummary(request);
    const phone = internationalNumber(CONSULTATION_WHATSAPP_PHONE);
    const browserUrl = whatsappContactUrl(CONSULTATION_WHATSAPP_PHONE, message);
    if (!phone || !browserUrl) {
      setWhatsappError("The WhatsApp summary could not be prepared. Your request remains saved.");
      return;
    }
    try {
      if (Platform.OS === "web") {
        await Linking.openURL(browserUrl);
        return;
      }
      try {
        await Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
      } catch {
        await Linking.openURL(browserUrl);
      }
    } catch {
      setWhatsappError(
        "WhatsApp could not open. Your request and complete summary are saved; tap Open WhatsApp Summary to try again.",
      );
    }
  }

  if (submitted) {
    return (
      <Shell>
        <Card style={{ gap: 20, padding: 24, borderColor: c.goldBorder }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: c.brandAccentSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="Sparkles" size={30} color={c.brandAccent} />
          </View>
          <Heading>Your Beauty Journey Starts Here!</Heading>
          <Txt size={19} style={{ lineHeight: 30 }}>
            Thank you for sharing your goals! Lady J will personally review your request and contact
            you through WhatsApp to arrange a convenient time.
          </Txt>
          <Txt color={c.mutedForeground}>This request does not confirm an appointment.</Txt>
          <View style={{ gap: 10 }}>
            <Action label="Done" onPress={() => go("home")} style={{ alignSelf: "stretch" }} />
            <Action
              label="Open WhatsApp Summary"
              icon="MessageCircle"
              secondary
              onPress={() => void openWhatsAppSummary(submitted)}
              style={{ alignSelf: "stretch" }}
            />
          </View>
          {!!whatsappError && <ErrorBox message={whatsappError} />}
          <Txt size={14} color={c.mutedForeground}>
            {submitted.owner_alert_status === "sent"
              ? "Your request is saved securely and Lady J has been notified through WhatsApp."
              : "Your request is saved securely. If the automatic owner alert is unavailable, Lady J can still review it in the secure owner workspace."}
          </Txt>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Heading sub="Tell us what you're looking for. Lady J will personally review your request and help you plan your visit.">
        Let&apos;s Find the Right Service for You
      </Heading>
      {!!error && <ErrorBox message={error} />}
      <View style={{ gap: 22 }}>
        <Card style={{ gap: 24 }}>
          <Question title="Which services are you interested in?">
            <Txt color={c.mutedForeground}>{selected.length}/3 selected</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous service categories"
                onPress={() => categoryScroll.current?.scrollTo({ x: 0, animated: true })}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="ChevronLeft" size={14} strokeWidth={1.5} color={c.mutedForeground} />
              </Pressable>
              <ScrollView
                ref={categoryScroll}
                horizontal
                style={{ flex: 1 }}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {categories.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 15,
                      paddingVertical: 11,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: category === item ? c.brandAccent : c.border,
                      backgroundColor: category === item ? c.brandAccentSurface : c.card,
                    }}
                  >
                    <Txt bold={category === item}>{item}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More service categories"
                onPress={() => categoryScroll.current?.scrollToEnd({ animated: true })}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="ChevronRight" size={14} strokeWidth={1.5} color={c.mutedForeground} />
              </Pressable>
            </View>
            {!category && (
              <Txt size={14} color={c.mutedForeground}>
                Choose a category to see its services.
              </Txt>
            )}
            <View style={{ gap: 9 }}>
              {services
                .filter((service) => service.category === category)
                .map((service) => (
                  <Choice
                    key={service.id}
                    label={service.name}
                    selected={selected.includes(service.id)}
                    disabled={!selected.includes(service.id) && selected.length >= 3}
                    onPress={() =>
                      setSelected((current) =>
                        current.includes(service.id)
                          ? current.filter((id) => id !== service.id)
                          : [...current, service.id],
                      )
                    }
                  />
                ))}
            </View>
          </Question>
          {selected.length > 1 && (
            <Question title="Which service matters most to you?">
              <Choices
                options={selectedServices.map((service) => service.name)}
                values={
                  primary ? [services.find((service) => service.id === primary)?.name || ""] : []
                }
                onChange={([value]) =>
                  setPrimary(selectedServices.find((service) => service.name === value)?.id || "")
                }
              />
            </Question>
          )}
          {!!selected.length && (
            <Question title="What would you love to achieve?">
              <Choices
                multiple
                options={availableOutcomes}
                values={outcomes}
                onChange={setOutcomes}
              />
              {outcomes.includes("Other") && (
                <Notes
                  label="Other desired outcome"
                  value={customOutcome}
                  onChange={setCustomOutcome}
                  placeholder="Tell Lady J what you have in mind."
                />
              )}
            </Question>
          )}
          <Question title="What would make this visit special for you?">
            <Choices
              options={[
                "Fresh new look",
                "Confidence",
                "Relaxation & self-care",
                "Special occasion",
                "Something else",
              ]}
              values={visitSpecial ? [visitSpecial] : []}
              onChange={([value]) => setVisitSpecial(value)}
            />
          </Question>
          <Question title="Are you preparing for a special occasion?">
            <Choices
              options={["Wedding", "Birthday", "Vacation", "Special event", "Just for me", "No"]}
              values={occasion ? [occasion] : []}
              onChange={([value]) => setOccasion(value)}
            />
            {["Wedding", "Birthday", "Vacation", "Special event"].includes(occasion) && (
              <DateField
                label="Event Date (Optional)"
                value={eventDate}
                optional
                onChange={setEventDate}
              />
            )}
          </Question>
          <Question title="Have you received this service before?">
            <Choices
              options={["Yes", "No", "Not sure"]}
              values={experience ? [experience] : []}
              onChange={([value]) => setExperience(value)}
            />
          </Question>
          <Question
            title="Is there anything we can do to make your visit more comfortable?"
            optional
          >
            <Notes
              label="Visit comfort"
              value={comfort}
              onChange={setComfort}
              placeholder="Share only what you are comfortable sharing."
            />
            <Choice
              label="I would prefer to discuss this privately"
              selected={comfortPrivate}
              onPress={() => setComfortPrivate((value) => !value)}
            />
          </Question>
          <Question title="Would you like to share inspiration photos?" optional>
            <Action
              label={
                photos.length
                  ? `Add another photo (${photos.length}/3)`
                  : "Choose inspiration photos"
              }
              icon="Images"
              secondary
              disabled={photos.length >= 3}
              onPress={() => void choosePhotos()}
            />
            {!!photos.length && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {photos.map((photo, index) => (
                  <View key={photo.assetId || photo.uri} style={{ width: 96, gap: 5 }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: 96, height: 96, borderRadius: 12 }}
                    />
                    <Txt size={11} color={c.mutedForeground} numberOfLines={1}>
                      {photo.fileName || "Inspiration photo"}
                    </Txt>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setPhotos((current) => current.filter((_, item) => item !== index))
                      }
                      style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
                    >
                      <Txt size={14} bold color={c.brandAccent}>
                        Remove
                      </Txt>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Txt size={14} color={c.mutedForeground}>
              Up to 3 private photos. Only you and authorized salon staff can view them.
            </Txt>
          </Question>
          <Question title="Which days and times work best for you?">
            <Choices
              multiple
              options={["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]}
              values={days}
              onChange={setDays}
            />
            <Choices
              multiple
              options={["Morning", "Afternoon", "Late Afternoon", "Flexible"]}
              values={times}
              onChange={setTimes}
            />
            <DateField
              label="Preferred Date (Optional)"
              value={preferredDate}
              optional
              onChange={setPreferredDate}
            />
            <Txt size={14} color={c.mutedForeground}>
              Preferences help Lady J plan. Availability is never confirmed automatically.
            </Txt>
          </Question>
          <Question title="Is there anything else you'd like Lady J to know?" optional>
            <Notes
              label="Additional comments"
              value={comments}
              onChange={setComments}
              placeholder="Add any general details for your consultation."
            />
          </Question>
        </Card>

        <Card style={{ gap: 22, borderColor: c.goldBorder }}>
          <View style={{ gap: 5 }}>
            <Txt serif size={29}>
              Your Comfort &amp; Safety
            </Txt>
            <Txt color={c.mutedForeground}>
              Share only what helps Lady J prepare. These answers stay private and are never used to
              diagnose or automatically decide eligibility.
            </Txt>
          </View>
          <Question title="Allergies, sensitivities, or relevant health considerations?">
            <Choices
              options={[
                "No",
                "Allergy or sensitivity",
                "Health consideration",
                "Not sure",
                "Discuss privately",
              ]}
              values={allergyStatus ? [allergyStatus] : []}
              onChange={([value]) => setAllergyStatus(value)}
            />
            {allergyStatus && allergyStatus !== "No" && (
              <Notes
                label="Allergy or health details"
                value={allergyDetails}
                onChange={setAllergyDetails}
                placeholder="Optional — no diagnosis is required."
              />
            )}
          </Question>
          <Question title="Comfort or accessibility needs?">
            <Choices
              multiple
              options={[
                "None",
                "Mobility assistance",
                "Quieter environment",
                "Extra time or assistance",
                "Discuss privately",
                "Other",
              ]}
              values={accessibility}
              onChange={(values) =>
                setAccessibility(
                  values.includes("None") ? ["None"] : values.filter((value) => value !== "None"),
                )
              }
            />
            {accessibility.some((value) => value !== "None") && (
              <Notes
                label="Accessibility details"
                value={accessibilityDetails}
                onChange={setAccessibilityDetails}
                placeholder="Optional — tell us what would make the visit easier."
              />
            )}
          </Question>
          {safetyQuestions.map((question) => (
            <Question key={question.id} title={question.label}>
              <Choices
                options={["Yes", "No", "Not sure", "Discuss privately"]}
                values={screening[question.id] ? [screening[question.id]] : []}
                onChange={([value]) =>
                  setScreening((current) => ({ ...current, [question.id]: value }))
                }
              />
            </Question>
          ))}
        </Card>

        <Card style={{ gap: 20 }}>
          <View style={{ gap: 5 }}>
            <Txt serif size={29}>
              Your Details
            </Txt>
            <Txt color={c.mutedForeground}>
              {s.session
                ? "We filled in what is already saved to your account."
                : "No account is required. Add the details Lady J should use for this consultation."}
            </Txt>
          </View>
          {[
            { label: "Name", value: name, set: setName, type: "default" },
            { label: "Email", value: email, set: setEmail, type: "email-address" },
            {
              label: "WhatsApp with country code (optional)",
              value: whatsapp,
              set: setWhatsapp,
              type: "phone-pad",
            },
          ].map((item) => (
            <View key={item.label} style={{ gap: 8 }}>
              <Txt bold>{item.label}</Txt>
              <TextInput
                accessibilityLabel={item.label}
                value={item.value}
                onChangeText={item.set}
                keyboardType={item.type as "default" | "email-address" | "phone-pad"}
                autoCapitalize={item.type === "email-address" ? "none" : "words"}
                style={{
                  minHeight: 56,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.background,
                  color: c.foreground,
                  borderRadius: 12,
                  padding: 14,
                  fontFamily: fonts.body,
                  fontSize: 18,
                }}
              />
            </View>
          ))}
          <Choice
            label="I consent to Lady J contacting me through WhatsApp about this consultation request."
            selected={whatsappConsent}
            onPress={() => setWhatsappConsent((value) => !value)}
          />
          <Action
            label="Send My Consultation Request"
            busy={busy}
            onPress={() => void submit()}
            contentColor="#FFFFFF"
            style={{
              alignSelf: "stretch",
              minHeight: 62,
              backgroundColor: "#2563EB",
              borderColor: "#2563EB",
            }}
          />
          <Txt bold style={{ textAlign: "center" }}>
            15 Minutes • Complimentary • No Obligation
          </Txt>
        </Card>
      </View>
    </Shell>
  );
}
