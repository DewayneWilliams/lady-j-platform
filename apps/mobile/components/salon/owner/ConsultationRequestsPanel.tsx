import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import { safeConsultationWhatsApp, type ConsultationRequest } from "@/lib/salon/consultations";
import type { Appointment, Service } from "@/lib/salon/types";
import { dateLabel, timeLabel } from "@/lib/salon/types";
import { whatsappContactUrl } from "@/lib/salon/whatsapp";
import { useSalon } from "@/lib/salon/SalonProvider";
import { useBottomNavigationSpacing } from "../BottomNavigation";
import { DateTimeField } from "../DateFields";
import { Card, ErrorBox, Txt, useColors } from "../ui";
import { OwnerButton, OwnerStatus, OwnerText } from "./OwnerUI";

const localStart = () => {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Port_of_Spain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 86400000));
  return `${day}T10:00`;
};
const toIso = (value: string) => new Date(`${value}:00-04:00`).toISOString();

function PhotoStrip({ paths }: { paths: string[] }) {
  const c = useColors();
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!paths.length) return;
    void Promise.all(
      paths.map(async (path) => {
        const row = check(
          await db().storage.from("lj-consultation-media").createSignedUrl(path, 120),
        );
        if (!row?.signedUrl) throw new Error("A private photo is unavailable.");
        return row.signedUrl;
      }),
    )
      .then((value) => active && setUrls(value))
      .catch(
        (reason) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Unable to open private photos."),
      );
    return () => {
      active = false;
    };
  }, [paths.join("|")]);
  if (!paths.length) return <OwnerText muted>No inspiration photos shared.</OwnerText>;
  if (error) return <Txt color={c.attentionBorder}>{error}</Txt>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {urls.map((url) => (
        <Pressable
          key={url}
          onPress={() => void Linking.openURL(url)}
          accessibilityRole="button"
          accessibilityLabel="Open private inspiration photo"
        >
          <Image source={{ uri: url }} style={{ width: 108, height: 108, borderRadius: 12 }} />
        </Pressable>
      ))}
    </View>
  );
}

function Detail({
  label,
  children,
  privateValue = false,
}: {
  label: string;
  children: React.ReactNode;
  privateValue?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 4, paddingVertical: 9, borderBottomWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
        {privateValue && <Icon name="LockKeyhole" size={16} color={c.warning} />}
        <OwnerText size={16} bold>
          {label}
        </OwnerText>
      </View>
      <OwnerText>{children || "Not provided"}</OwnerText>
    </View>
  );
}

export default function ConsultationRequestsPanel({
  services,
  appointments,
  demo = false,
  clientId,
  focusId,
  onChanged,
}: {
  services: Service[];
  appointments: Appointment[];
  demo?: boolean;
  clientId?: string;
  focusId?: string;
  onChanged?: () => Promise<void> | void;
}) {
  const c = useColors();
  const salon = useSalon();
  const { width } = useWindowDimensions();
  const spacing = useBottomNavigationSpacing(true);
  const [rows, setRows] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState("");
  const [busy, setBusy] = useState("");
  const [editor, setEditor] = useState<{
    request: ConsultationRequest;
    mode: "schedule" | "reschedule" | "convert";
  } | null>(null);
  const [start, setStart] = useState(localStart());
  const [serviceId, setServiceId] = useState("");
  const [followups, setFollowups] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      if (demo) {
        const names = [
          "Mary Magdalene",
          "Esther of Susa",
          "Ruth of Moab",
          "Martha of Bethany",
          "Priscilla of Corinth",
          "Sarah Matriarch",
        ];
        const statuses: ConsultationRequest["status"][] = [
          "new",
          "contacted",
          "scheduled",
          "completed",
          "new",
          "cancelled",
        ];
        const value = names.map((client_name, index) => {
          const service = services[index % Math.max(1, services.length)];
          const selected = {
            id: service?.id || `demo-service-${index}`,
            name: service?.name || "Signature salon consultation",
            category: service?.category || "Hair",
          };
          return {
            id: `demo-consultation-${index + 1}`,
            customer_id: `demo-client-${index + 1}`,
            client_id: `demo-client-${index + 1}`,
            client_name,
            client_email: `consultation${index + 1}@demo.invalid`,
            whatsapp_phone: `+1 868 555 ${String(5200 + index)}`,
            selected_services: [selected],
            primary_service: selected,
            desired_outcomes: ["A polished, healthy-looking result", "Personalized aftercare"],
            visit_special: index % 2 ? "Self-care appointment" : "Special occasion",
            occasion: index % 2 ? "" : "Demo celebration",
            event_date: null,
            previous_experience: "Fictional consultation history for Development Test Mode.",
            comfort_note: "Prefers a calm explanation before the service begins.",
            comfort_private: index % 2 === 0,
            availability_days: ["Tuesday", "Thursday"],
            availability_times: ["Morning", "Afternoon"],
            preferred_date: null,
            additional_notes: "Demo request only; no real client information.",
            allergy_status: "No known allergies disclosed in this demo.",
            allergy_details: "",
            accessibility_needs: index === 3 ? ["Extra seating support"] : [],
            accessibility_details: "",
            screening: { demo_screening: "Reviewed for testing" },
            inspiration_paths: [],
            summary: `${client_name} is requesting a ${selected.name.toLowerCase()} consultation.`,
            status: statuses[index],
            owner_alert_status: index < 2 ? "sent" : "manual_required",
            appointment_id:
              statuses[index] === "scheduled"
                ? appointments.find((item) => item.customer_id === `demo-client-${index + 1}`)
                    ?.id || null
                : null,
            converted_appointment_id: null,
            created_at: new Date(Date.now() - index * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies ConsultationRequest;
        });
        setRows(clientId ? value.filter((request) => request.client_id === clientId) : value);
        setLoading(false);
        return;
      }
      let query = db()
        .from("lj_consultation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const result = check(await query);
      const value = Array.isArray(result) ? (result as ConsultationRequest[]) : [];
      setRows(value);
      if (focusId && value.some((request) => request.id === focusId)) setExpanded(focusId);
      setFollowups((current) =>
        Object.fromEntries(
          value.map((request) => [
            request.id,
            current[request.id] ||
              `Hello ${String(request?.client_name ?? "there").split(" ")[0]}, thank you for sharing your goals with Lady J. I reviewed your interest in ${String(request?.primary_service?.name ?? "your selected service").toLowerCase()} and your wish for ${(Array.isArray(request?.desired_outcomes) ? request.desired_outcomes : ["your desired result"]).join(", ").toLowerCase()}. I’d love to arrange your complimentary 15-minute consultation. Would ${(Array.isArray(request?.availability_days) ? request.availability_days : ["your preferred day"]).slice(0, 2).join(" or ")} during ${String(request?.availability_times?.[0] ?? "your preferred time").toLowerCase()} work for you?`,
          ]),
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load consultation requests.");
    } finally {
      setLoading(false);
    }
  }, [appointments, clientId, demo, focusId, services]);
  useEffect(() => {
    void load();
  }, [load]);

  const update = async (
    request: ConsultationRequest,
    action: string,
    task: () => Promise<unknown>,
  ) => {
    setBusy(request.id + action);
    setError("");
    try {
      await task();
      await load();
      await onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update this consultation.");
    } finally {
      setBusy("");
    }
  };
  const openMessage = (request: ConsultationRequest, message: string) => {
    const url = whatsappContactUrl(request.whatsapp_phone, message);
    if (!url) {
      setError("Save a valid international WhatsApp number before messaging this client.");
      return;
    }
    void Linking.openURL(url).catch(() => setError("WhatsApp could not open."));
  };
  const ordered = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const upcomingA = ["new", "contacted", "scheduled"].includes(a.status) ? 0 : 1;
        const upcomingB = ["new", "contacted", "scheduled"].includes(b.status) ? 0 : 1;
        return upcomingA - upcomingB || b.created_at.localeCompare(a.created_at);
      }),
    [rows],
  );

  if (clientId && (loading || !rows.length)) return null;

  return (
    <>
      <View
        style={{
          padding: width >= 1100 ? 32 : 20,
          paddingBottom: Math.max(40, spacing),
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
          gap: 14,
        }}
      >
        <View style={{ gap: 12, marginBottom: 8 }}>
          <OwnerText size={32} bold>
            {clientId ? "Consultations" : "Consultation Requests"}
          </OwnerText>
          {!clientId && (
            <OwnerText muted>
              Personal goals, private care notes, and follow-up in one secure place.
            </OwnerText>
          )}
          {!!error && <ErrorBox message={error} retry={() => void load()} />}
        </View>
        {!loading && ordered.length === 0 && (
          <Card>
            <OwnerText muted>No consultation requests yet.</OwnerText>
          </Card>
        )}
        {ordered.map((request) => {
          const appointment = appointments.find((value) => value.id === request.appointment_id);
          const isOpen = expanded === request.id;
          return (
            <Card
              style={{ gap: 14, borderColor: request.status === "new" ? c.brandAccent : c.border }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isOpen ? "Close" : "View"} request from ${request.client_name}`}
                onPress={() => setExpanded(isOpen ? "" : request.id)}
                style={{ gap: 10 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <OwnerText size={25} bold>
                      {request.client_name}
                    </OwnerText>
                    <OwnerText muted>
                      {request.selected_services.map((value) => value.name).join(", ")}
                    </OwnerText>
                    <OwnerText size={16} muted>
                      {appointment
                        ? `${dateLabel(appointment.starts_at, { year: "numeric" })} at ${timeLabel(appointment.starts_at)}`
                        : dateLabel(request.created_at, { year: "numeric" })}
                    </OwnerText>
                  </View>
                  <OwnerStatus status={request.status} />
                </View>
                <OwnerText>{request.summary}</OwnerText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <OwnerText size={16} bold>
                    {isOpen ? "Close Request" : "View Request"}
                  </OwnerText>
                  <Icon
                    name={isOpen ? "ChevronUp" : "ChevronDown"}
                    size={21}
                    color={c.foreground}
                  />
                </View>
              </Pressable>
              {isOpen && (
                <View style={{ gap: 14 }}>
                  <Detail label="Client details">
                    {request.client_email}
                    {"\n"}
                    {request.whatsapp_phone}
                  </Detail>
                  <Detail label="Selected services">
                    {request.selected_services.map((value) => value.name).join(", ")}
                    {"\n"}Primary: {request.primary_service.name}
                  </Detail>
                  <Detail label="Desired outcome">
                    {(Array.isArray(request.desired_outcomes) ? request.desired_outcomes : []).join(
                      ", ",
                    ) || "Not provided"}
                  </Detail>
                  <Detail label="What makes this visit special">{request.visit_special}</Detail>
                  <Detail label="Occasion">
                    {request.occasion}
                    {request.event_date ? ` · ${request.event_date}` : ""}
                  </Detail>
                  <Detail label="Previous experience">{request.previous_experience}</Detail>
                  <Detail label="Preferred availability">
                    {(Array.isArray(request.availability_days)
                      ? request.availability_days
                      : []
                    ).join(", ") || "No days provided"}{" "}
                    ·{" "}
                    {(Array.isArray(request.availability_times)
                      ? request.availability_times
                      : []
                    ).join(", ") || "No times provided"}
                    {request.preferred_date ? ` · Preferred date ${request.preferred_date}` : ""}
                  </Detail>
                  <Detail label="General comments">{request.additional_notes}</Detail>
                  {!!appointment && (
                    <Detail label="Consultation appointment">
                      {dateLabel(appointment.starts_at, { year: "numeric" })} at{" "}
                      {timeLabel(appointment.starts_at)} · {appointment.status}
                    </Detail>
                  )}
                  <Card
                    style={{ gap: 12, backgroundColor: c.goldSurface, borderColor: c.goldBorder }}
                  >
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <Icon name="ShieldCheck" size={22} color={c.warning} />
                      <OwnerText bold>Private Comfort &amp; Safety</OwnerText>
                    </View>
                    <Detail privateValue label="Visit comfort">
                      {request.comfort_private ? "Client prefers a private discussion. " : ""}
                      {request.comfort_note}
                    </Detail>
                    <Detail privateValue label="Allergies or health considerations">
                      {request.allergy_status}
                      {request.allergy_details ? ` · ${request.allergy_details}` : ""}
                    </Detail>
                    <Detail privateValue label="Accessibility">
                      {request.accessibility_needs.join(", ")}
                      {request.accessibility_details ? ` · ${request.accessibility_details}` : ""}
                    </Detail>
                    {Object.entries(request.screening).map(([key, value]) => (
                      <Detail privateValue key={key} label={key.replace(/_/g, " ")}>
                        {value}
                      </Detail>
                    ))}
                  </Card>
                  <View style={{ gap: 8 }}>
                    <OwnerText bold>Private Inspiration Photos</OwnerText>
                    <PhotoStrip paths={request.inspiration_paths} />
                  </View>
                  <View style={{ gap: 8 }}>
                    <OwnerText bold>Personalized WhatsApp Follow-up</OwnerText>
                    <TextInput
                      multiline
                      value={followups[request.id] || ""}
                      onChangeText={(value) =>
                        setFollowups((current) => ({ ...current, [request.id]: value }))
                      }
                      style={{
                        minHeight: 140,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 12,
                        padding: 14,
                        backgroundColor: c.background,
                        color: c.foreground,
                        fontSize: 18,
                        textAlignVertical: "top",
                      }}
                    />
                    <OwnerButton
                      fill
                      icon="MessageCircle"
                      label="Message Client"
                      onPress={() => {
                        openMessage(request, followups[request.id] || "");
                        if (request.status === "new")
                          void update(request, "contact", async () =>
                            check(
                              await db().rpc("lj_update_consultation_status", {
                                p_id: request.id,
                                p_status: "contacted",
                              }),
                            ),
                          );
                      }}
                    />
                  </View>
                  <Txt size={15} color={c.mutedForeground}>
                    Owner WhatsApp alert:{" "}
                    {request.owner_alert_status === "sent"
                      ? "delivered automatically"
                      : request.owner_alert_status === "queued"
                        ? "queued for automatic delivery"
                        : request.owner_alert_status === "draft_opened"
                          ? "manual draft opened; delivery not confirmed"
                          : "automatic delivery needs attention; the secure request remains available"}
                    . Private safety answers and photos are excluded.
                  </Txt>
                  {!clientId && (
                    <OwnerButton
                      fill
                      secondary
                      label="Open Manual Owner Alert Draft"
                      onPress={() => {
                        const dashboardLink =
                          Platform.OS === "web" && typeof globalThis.location !== "undefined"
                            ? `${globalThis.location.origin}/owner?tab=Business&consultation=${request.id}`
                            : `lady-j://owner?tab=Business&consultation=${request.id}`;
                        const url = whatsappContactUrl(
                          salon.settings?.whatsapp_phone,
                          safeConsultationWhatsApp(request, dashboardLink),
                        );
                        if (!url) {
                          setError(
                            "Configure the salon WhatsApp number before opening a manual owner alert draft. The secure dashboard alert remains active.",
                          );
                          return;
                        }
                        void Linking.openURL(url)
                          .then(() =>
                            update(request, "alert", async () =>
                              check(
                                await db().rpc("lj_mark_consultation_alert_opened", {
                                  p_id: request.id,
                                }),
                              ),
                            ),
                          )
                          .catch(() =>
                            setError("WhatsApp could not open. The alert was not marked as sent."),
                          );
                      }}
                    />
                  )}
                  <View style={{ gap: 9 }}>
                    {!request.appointment_id &&
                      !["completed", "converted", "cancelled"].includes(request.status) && (
                        <View style={{ flexDirection: "row", gap: 9 }}>
                          <View style={{ flex: 1 }}>
                            <OwnerButton
                              fill
                              accent
                              label="Approve"
                              icon="CalendarPlus"
                              onPress={() => {
                                setStart(localStart());
                                setEditor({ request, mode: "schedule" });
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <OwnerButton
                              fill
                              secondary
                              label="Decline"
                              icon="CalendarX2"
                              busy={busy === request.id + "cancel"}
                              onPress={() =>
                                Alert.alert(
                                  "Decline this consultation?",
                                  "No consultation appointment will be created.",
                                  [
                                    { text: "Keep request", style: "cancel" },
                                    {
                                      text: "Decline",
                                      style: "destructive",
                                      onPress: () =>
                                        void update(request, "cancel", async () =>
                                          check(
                                            await db().rpc("lj_cancel_consultation", {
                                              p_id: request.id,
                                            }),
                                          ),
                                        ),
                                    },
                                  ],
                                )
                              }
                            />
                          </View>
                        </View>
                      )}
                    {!!request.appointment_id && request.status === "scheduled" && (
                      <OwnerButton
                        fill
                        secondary
                        label="Reschedule"
                        icon="CalendarClock"
                        onPress={() => {
                          const value = appointment
                            ? new Date(Date.parse(appointment.starts_at) - 4 * 3600000)
                                .toISOString()
                                .slice(0, 16)
                            : localStart();
                          setStart(value);
                          setEditor({ request, mode: "reschedule" });
                        }}
                      />
                    )}
                    {!!request.appointment_id &&
                      !["completed", "converted", "cancelled"].includes(request.status) && (
                        <OwnerButton
                          fill
                          secondary
                          label="Cancel"
                          icon="CalendarX2"
                          onPress={() =>
                            void update(request, "cancel", async () =>
                              check(await db().rpc("lj_cancel_consultation", { p_id: request.id })),
                            )
                          }
                          busy={busy === request.id + "cancel"}
                        />
                      )}
                    {request.status === "scheduled" && (
                      <OwnerButton
                        fill
                        secondary
                        label="Mark Consultation Completed"
                        icon="CircleCheckBig"
                        onPress={() =>
                          void update(request, "complete", async () =>
                            check(
                              await db().rpc("lj_update_consultation_status", {
                                p_id: request.id,
                                p_status: "completed",
                              }),
                            ),
                          )
                        }
                      />
                    )}
                    {request.status === "completed" && (
                      <OwnerButton
                        fill
                        label="Convert to Service Booking"
                        icon="Sparkles"
                        onPress={() => {
                          setStart(localStart());
                          setServiceId(request.primary_service.id);
                          setEditor({ request, mode: "convert" });
                        }}
                      />
                    )}
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </View>
      {!!editor && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setEditor(null)}
        >
          <SafeAreaView
            edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
            style={{ flex: 1, backgroundColor: c.background }}
          >
            <View
              style={{
                flex: 1,
                width: "100%",
                maxWidth: 760,
                alignSelf: "center",
                padding: 22,
                gap: 18,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <OwnerText size={28} bold>
                    {editor.mode === "convert"
                      ? "Convert to Service Booking"
                      : editor.mode === "reschedule"
                        ? "Reschedule Consultation"
                        : "Approve Consultation"}
                  </OwnerText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setEditor(null)}
                  style={{ padding: 12 }}
                >
                  <Icon name="X" size={25} color={c.foreground} />
                </Pressable>
              </View>
              <DateTimeField label="Date and Time" value={start} onChange={setStart} />
              {editor.mode === "convert" && (
                <View style={{ flex: 1, minHeight: 0, gap: 10 }}>
                  <OwnerText bold>Service</OwnerText>
                  <FlatList
                    data={services.filter(
                      (service) =>
                        service.active &&
                        service.bookable !== false &&
                        !/^free consultation$/i.test(service.name),
                    )}
                    keyExtractor={(service) => service.id}
                    renderItem={({ item }) => (
                      <OwnerButton
                        fill
                        compact
                        label={item.name}
                        secondary={serviceId !== item.id}
                        onPress={() => setServiceId(item.id)}
                      />
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  />
                </View>
              )}
              <OwnerText muted>
                {editor.mode === "convert"
                  ? "This creates the client’s service appointment using the existing booking and payment workflow."
                  : "15 minutes · TT$0 · No deposit. Availability is validated before confirmation."}
              </OwnerText>
              <OwnerButton
                fill
                accent
                busy={busy === editor.request.id + editor.mode}
                disabled={editor.mode === "convert" && !serviceId}
                label={
                  editor.mode === "convert"
                    ? "Create Service Booking"
                    : editor.mode === "reschedule"
                      ? "Save New Time"
                      : "Confirm Consultation"
                }
                onPress={() =>
                  void update(editor.request, editor.mode, async () => {
                    const p_start = toIso(start);
                    if (editor.mode === "schedule")
                      check(
                        await db().rpc("lj_schedule_consultation", {
                          p_id: editor.request.id,
                          p_start,
                        }),
                      );
                    else if (editor.mode === "reschedule")
                      check(
                        await db().rpc("lj_reschedule_consultation", {
                          p_id: editor.request.id,
                          p_start,
                        }),
                      );
                    else
                      check(
                        await db().rpc("lj_convert_consultation", {
                          p_id: editor.request.id,
                          p_service: serviceId,
                          p_start,
                          p_note: `Converted from consultation ${editor.request.id}`,
                        }),
                      );
                    setEditor(null);
                  })
                }
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
