import { displayDateTime } from "@/lib/salon/dates";
import React, { useEffect, useState } from "react";
import { View, ScrollView, Linking, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check } from "@/lib/salon/client";
import {
  agreementText,
  agreementVersion,
  SignatureStroke,
  SignedAgreement,
} from "@/lib/salon/agreementPolicy";
import SignaturePad from "./SignaturePad";
import { Action, Card, Check, ErrorBox, Field, LinkText, Txt, useColors } from "./ui";

export type GuestAgreementDraft = {
  signerName: string;
  signature: SignatureStroke[];
  typedSignature?: string;
  signatureMethod: "drawn" | "typed";
  version: string;
  agreed: true;
};

export async function openAgreementPdf(path: string) {
  const result = check(
    await db()
      .storage.from("lj-service-agreements")
      .createSignedUrl(path, 60, { download: "Lady-J-Service-Agreement.pdf" }),
  );
  if (!result?.signedUrl) throw new Error("Unable to open this agreement. Please try again.");
  await Linking.openURL(result.signedUrl);
}
export function AppointmentAgreement({ appointmentId }: { appointmentId: string }) {
  const validAppointmentId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      appointmentId,
    );
  const [agreement, setAgreement] = useState<Pick<
    SignedAgreement,
    "object_path" | "signed_at"
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!validAppointmentId) return;
    let active = true;
    void (async () => {
      try {
        const link = check(
          await db()
            .from("lj_appointment_agreements")
            .select("agreement_id")
            .eq("appointment_id", appointmentId)
            .maybeSingle(),
        ) as { agreement_id: string } | null;
        let query = db()
          .from("lj_service_agreements")
          .select("object_path,signed_at")
          .eq("pdf_ready", true);
        query = link?.agreement_id
          ? query.eq("id", link.agreement_id)
          : query.eq("appointment_id", appointmentId);
        const row = check(await query.maybeSingle()) as Pick<
          SignedAgreement,
          "object_path" | "signed_at"
        > | null;
        if (active) setAgreement(row);
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : "Unable to load the agreement.");
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId, validAppointmentId]);
  if (!validAppointmentId) return null;
  if (!agreement) return error ? <ErrorBox message={error} /> : null;
  return (
    <Action
      label="View Signed Service Agreement"
      icon="FileCheck"
      secondary
      onPress={() =>
        void openAgreementPdf(agreement.object_path).catch((reason) => setError(reason.message))
      }
      style={{ alignSelf: "stretch" }}
    />
  );
}
export default function ServiceAgreement({
  services,
  onReady,
  noPaymentRequired: _noPaymentRequired = false,
  guest = false,
  guestName = "",
  onGuestReady,
}: {
  noPaymentRequired?: boolean;
  services: string[];
  onReady: (id: string) => void;
  guest?: boolean;
  guestName?: string;
  onGuestReady?: (draft: GuestAgreementDraft | null) => void;
}) {
  const s = useSalon(),
    c = useColors();
  const [name, setName] = useState(s.profile?.full_name || "");
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<SignatureStroke[]>([]);
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureMethod, setSignatureMethod] = useState<"drawn" | "typed">("drawn");
  const [open, setOpen] = useState(false);
  const [guestSaved, setGuestSaved] = useState(false);
  const [saved, setSaved] = useState<Pick<
    SignedAgreement,
    "id" | "signed_at" | "object_path" | "signer_name"
  > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = [...services].sort().join(",");
  useEffect(() => {
    setSaved(null);
    setGuestSaved(false);
    onReady("");
    onGuestReady?.(null);
  }, [key, onReady, onGuestReady]);
  useEffect(() => {
    if (guest && guestName && !name) setName(guestName);
  }, [guest, guestName, name]);
  useEffect(() => {
    if (guest || !s.session?.user.id) return;
    let active = true;
    void (async () => {
      try {
        const rows = check(
          await db()
            .from("lj_service_agreements")
            .select("id,signed_at,object_path,signer_name,services,policy_version,signature_method")
            .eq("customer_id", s.session!.user.id)
            .eq("policy_version", agreementVersion)
            .eq("pdf_ready", true)
            .contains("services", services)
            .order("signed_at", { ascending: false })
            .limit(10),
        ) as unknown as (SignedAgreement & { services: string[] })[];
        const current = rows.find(
          (row) =>
            row.services.length === services.length &&
            services.every((id) => row.services.includes(id)),
        );
        if (active && current) {
          setSaved(current);
          setName(current.signer_name);
          onReady(current.id);
        }
      } catch {
        // A new signature remains available when no reusable current agreement can be loaded.
      }
    })();
    return () => {
      active = false;
    };
  }, [guest, key, onReady, s.session?.user.id]);
  const valid =
    accepted &&
    name.trim().length >= 3 &&
    (signatureMethod === "typed"
      ? typedSignature.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()
      : signature.reduce((n, v) => n + v.length, 0) >= 6);
  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      if (guest) {
        onGuestReady?.({
          signerName: name.trim(),
          signature,
          typedSignature,
          signatureMethod,
          version: agreementVersion,
          agreed: true,
        });
        onReady("guest-signed");
        setGuestSaved(true);
        setOpen(false);
        return;
      }
      const response = await db().functions.invoke("lj-sign-agreement", {
        body: {
          name: name.trim(),
          services,
          signature,
          typedSignature,
          signatureMethod,
          version: agreementVersion,
          agreed: accepted,
        },
      });
      if (response.error) {
        let message = response.error.message;
        try {
          const detail = await response.error.context?.json();
          message = detail?.error || message;
        } catch {
          /* Keep the request error when the body is unavailable. */
        }
        throw new Error(message);
      }
      if (!response.data?.agreement?.id)
        throw new Error(response.data?.error || "The agreement was not saved. Please try again.");
      setSaved(response.data.agreement);
      onReady(response.data.agreement.id);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your agreement.");
      onReady("");
    } finally {
      setBusy(false);
    }
  }
  const isReady = guest ? guestSaved : !!saved;
  return (
    <>
      <Card style={{ gap: 12, padding: 18, borderColor: isReady ? c.success : c.goldBorder }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon
            name={isReady ? "BadgeCheck" : "Signature"}
            size={24}
            color={isReady ? c.success : c.brandAccent}
          />
          <View style={{ flex: 1 }}>
            <Txt size={19} bold>
              {isReady ? "Agreement Signed ✓" : "Review & Sign Agreement"}
            </Txt>
            <Txt size={13} color={c.mutedForeground}>
              {isReady
                ? `Current agreement · ${saved ? displayDateTime(saved.signed_at) : "ready for booking"}`
                : "Review the approved terms, consent, and add your legal signature."}
            </Txt>
          </View>
        </View>
        {saved?.object_path ? (
          <LinkText
            onPress={() =>
              void openAgreementPdf(saved.object_path).catch((e) => setError(e.message))
            }
          >
            View signed PDF
          </LinkText>
        ) : (
          <Action
            label="Review & Sign Agreement"
            secondary
            onPress={() => setOpen(true)}
            style={{ alignSelf: "stretch" }}
          />
        )}
        {!!error && <ErrorBox message={error} />}
      </Card>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => !busy && setOpen(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.background }}
          edges={["top", "right", "bottom", "left"]}
        >
          <View
            style={{
              minHeight: 60,
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderColor: c.goldBorder,
              paddingHorizontal: 16,
              gap: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close agreement"
              disabled={busy}
              onPress={() => setOpen(false)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="X" size={24} color={c.foreground} />
            </Pressable>
            <Txt size={20} bold style={{ flex: 1 }}>
              Service Agreement
            </Txt>
            <Txt size={12} color={c.mutedForeground}>
              {agreementVersion}
            </Txt>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              width: "100%",
              maxWidth: 760,
              alignSelf: "center",
              padding: 18,
              paddingBottom: 48,
              gap: 16,
            }}
          >
            <Txt size={15}>{agreementText.replace(/^#+\s*/gm, "")}</Txt>
            <Field label="Full Legal Name" value={name} onChangeText={(v) => !busy && setName(v)} />
            <Check
              checked={accepted}
              onPress={() => !busy && setAccepted((v) => !v)}
              label="I have reviewed and explicitly consent to this Service, Booking & Photography Agreement."
            />
            {!guest && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["typed", "drawn"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: signatureMethod === mode }}
                    onPress={() => setSignatureMethod(mode)}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: signatureMethod === mode ? c.primary : c.border,
                      backgroundColor: signatureMethod === mode ? c.brandAccentSurface : c.card,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 10,
                    }}
                  >
                    <Txt bold color={signatureMethod === mode ? c.brandAccent : c.foreground}>
                      {mode === "typed" ? "Type signature" : "Draw signature"}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            )}
            {signatureMethod === "typed" && !guest ? (
              <Field
                label="Type Your Full Legal Name"
                value={typedSignature}
                onChangeText={setTypedSignature}
                placeholder={name || "Your legal name"}
              />
            ) : (
              <SignaturePad onChange={setSignature} disabled={busy} />
            )}
            {!!error && <ErrorBox message={error} />}
            <Action
              label="Sign & Save Agreement"
              onPress={() => void save()}
              busy={busy}
              disabled={!valid}
              style={{ alignSelf: "stretch" }}
            />
            <Txt size={12} color={c.mutedForeground} style={{ textAlign: "center" }}>
              {guest
                ? "Your consent evidence is saved with this appointment."
                : "A dated, tamper-evident PDF and consent audit record are stored privately for you and authorized salon staff."}
            </Txt>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
export function AgreementList({
  customerId,
  demo = false,
  title,
}: {
  customerId?: string;
  demo?: boolean;
  title?: string;
}) {
  const c = useColors();
  const [rows, setRows] = useState<SignedAgreement[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (demo) return;
    let active = true;
    setBusy(true);
    setError("");
    void (async () => {
      try {
        let query = db()
          .from("lj_service_agreements")
          .select(
            "id,customer_id,signer_name,signed_at,object_path,pdf_ready,appointment_id,policy_version",
          )
          .eq("pdf_ready", true)
          .order("signed_at", { ascending: false })
          .order("id")
          .range(page * 20, page * 20 + 19);
        if (customerId) query = query.or(`customer_id.eq.${customerId},client_id.eq.${customerId}`);
        const records = check(await query) as SignedAgreement[];
        if (active) setRows(records);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load agreements.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [customerId, demo, page, version]);
  if (demo)
    return (
      <Card>
        <Txt size={18} bold>
          {title || "Service agreements"}
        </Txt>
        <Txt>Signature status: Not signed.</Txt>
      </Card>
    );
  return (
    <View style={{ gap: 16 }}>
      {!!title && (
        <Txt size={20} bold>
          {title}
        </Txt>
      )}
      {!!error && <ErrorBox message={error} retry={() => setVersion((v) => v + 1)} />}
      {busy ? (
        <Txt>Loading signed agreements</Txt>
      ) : !rows.length ? (
        <Card>
          <Txt>Signature status: Not signed.</Txt>
          <Txt color={c.mutedForeground}>
            Your dated PDF appears here after you sign in booking Step 3.
          </Txt>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id} style={{ gap: 10 }}>
            <Txt size={20} bold>
              {row.signer_name}
            </Txt>
            <Txt>Signed {displayDateTime(row.signed_at)}</Txt>
            <Txt size={13} color={c.mutedForeground}>
              Client service agreement ·{" "}
              {row.appointment_id ? "Linked to appointment" : "Ready for booking"}
            </Txt>
            <Action
              label="View Agreement"
              secondary
              onPress={() => {
                void openAgreementPdf(row.object_path).catch((e) => setError(e.message));
              }}
            />
          </Card>
        ))
      )}
      {(page > 0 || rows.length === 20) && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Action
            label="Previous"
            secondary
            disabled={busy || page === 0}
            onPress={() => setPage((v) => v - 1)}
          />
          <Action
            label="Next"
            secondary
            disabled={busy || rows.length < 20}
            onPress={() => setPage((v) => v + 1)}
          />
        </View>
      )}
    </View>
  );
}
