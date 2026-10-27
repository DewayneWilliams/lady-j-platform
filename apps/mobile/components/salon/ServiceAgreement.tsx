import { displayDateTime } from "@/lib/salon/dates";
import React, { useEffect, useState } from "react";
import { View, Linking, Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check, asRows } from "@/lib/salon/client";
import { saveDemoAgreement, useDemoAgreements } from "@/lib/salon/demoAgreements";
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

function AgreementCopy() {
  const c = useColors();
  return (
    <View style={{ gap: 10 }}>
      {agreementText.split("\n\n").map((paragraph, index) => {
        const heading = paragraph.startsWith("# ") || paragraph.startsWith("### ");
        const content = paragraph.replace(/^#{1,3}\s*/, "");
        return (
          <Txt
            key={`${index}-${content.slice(0, 16)}`}
            serif={heading}
            bold={heading}
            size={heading ? (paragraph.startsWith("# ") ? 22 : 17) : 13}
            color={heading ? c.foreground : c.mutedForeground}
            style={{ lineHeight: heading ? 24 : 19 }}
          >
            {content}
          </Txt>
        );
      })}
    </View>
  );
}

function CompactAgreement({
  name,
  setName,
  accepted,
  setAccepted,
  signature,
  setSignature,
  open,
  setOpen,
  busy,
  error,
  saved,
  isReady,
  valid,
  save,
}: {
  name: string;
  setName: (value: string) => void;
  accepted: boolean;
  setAccepted: React.Dispatch<React.SetStateAction<boolean>>;
  signature: SignatureStroke[];
  setSignature: (value: SignatureStroke[]) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  busy: boolean;
  error: string;
  saved: Pick<SignedAgreement, "id" | "signed_at" | "object_path" | "signer_name"> | null;
  isReady: boolean;
  valid: boolean;
  save: () => Promise<void>;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Review and confirm your experience"
        accessibilityState={{ expanded: open }}
        disabled={busy}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({
          minHeight: 46,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          paddingHorizontal: 13,
          borderWidth: 1,
          borderColor: isReady ? c.success : c.goldBorder,
          borderRadius: 12,
          backgroundColor: c.card,
          opacity: pressed ? 0.86 : 1,
        })}
      >
        <Icon
          name={isReady ? "BadgeCheck" : "Gem"}
          size={19}
          color={isReady ? c.success : c.brandAccent}
        />
        <Txt bold size={15} style={{ flex: 1 }}>
          {isReady ? "Service Agreement ✓ Signed" : "Review & Confirm Your Experience"}
        </Txt>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={20} color={c.mutedForeground} />
      </Pressable>
      {isReady && saved && !open && (
        <Txt size={12} color={c.mutedForeground} style={{ paddingHorizontal: 4 }}>
          Signed: {displayDateTime(saved.signed_at)}
        </Txt>
      )}
      {open && (
        <View style={{ gap: 13, paddingTop: 3 }}>
          <AgreementCopy />
          {isReady && saved ? (
            <View style={{ gap: 7 }}>
              <Txt bold color={c.success}>
                ✓ Agreement Signed Successfully
              </Txt>
              <Txt size={13} color={c.mutedForeground}>
                Signed: {displayDateTime(saved.signed_at)}
              </Txt>
              {!!saved.object_path && (
                <LinkText onPress={() => void openAgreementPdf(saved.object_path)}>
                  Download signed PDF
                </LinkText>
              )}
            </View>
          ) : (
            <>
              <Field
                label="Client Name"
                value={name}
                onChangeText={(value) => !busy && setName(value)}
              />
              <View style={{ gap: 7 }}>
                <Txt bold size={16}>
                  Digital Signature
                </Txt>
                <SignaturePad onChange={setSignature} disabled={busy} height={100} />
              </View>
              <Check
                checked={accepted}
                onPress={() => !busy && setAccepted((value) => !value)}
                label="I have read, understood, and agree to all terms and consent to signing electronically."
              />
              {!!error && <ErrorBox message={error} />}
              <Action
                label="Sign & Accept Agreement"
                onPress={() => void save()}
                busy={busy}
                disabled={!valid}
                style={{ alignSelf: "stretch", minHeight: 50 }}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

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
  const s = useSalon();
  const [name, setName] = useState(s.profile?.full_name || "");
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<SignatureStroke[]>([]);
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
        const rows = asRows<SignedAgreement & { services: string[] }>(
          check(
            await db()
              .from("lj_service_agreements")
              .select(
                "id,signed_at,object_path,signer_name,services,policy_version,signature_method",
              )
              .eq("customer_id", s.session!.user.id)
              .eq("policy_version", agreementVersion)
              .eq("pdf_ready", true)
              .contains("services", services)
              .order("signed_at", { ascending: false })
              .limit(10),
          ),
          "Service agreements",
        );
        const current = rows.find((row) => {
          const savedServices = Array.isArray(row?.services) ? row.services : [];
          return (
            savedServices.length === services.length &&
            services.every((id) => savedServices.includes(id))
          );
        });
        if (active && current) {
          setSaved(current);
          setName(String(current?.signer_name ?? ""));
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
    accepted && name.trim().length >= 3 && signature.reduce((n, v) => n + v.length, 0) >= 6;
  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      if (s.testMode && !s.session) {
        const demoAgreement = saveDemoAgreement({
          customer_id: "demo-client",
          signer_name: name.trim(),
          policy_version: agreementVersion,
          signature,
          services,
        });
        setSaved({ ...demoAgreement, object_path: "" });
        onReady(demoAgreement.id);
        return;
      }
      if (guest) {
        onGuestReady?.({
          signerName: name.trim(),
          signature,
          signatureMethod: "drawn",
          version: agreementVersion,
          agreed: true,
        });
        onReady("guest-signed");
        setGuestSaved(true);
        return;
      }
      const response = await db().functions.invoke("lj-sign-agreement", {
        body: {
          name: name.trim(),
          services,
          signature,
          typedSignature: "",
          signatureMethod: "drawn",
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your agreement.");
      onReady("");
    } finally {
      setBusy(false);
    }
  }
  const isReady = s.testMode && !s.session ? !!saved : guest ? guestSaved : !!saved;
  return (
    <CompactAgreement
      name={name}
      setName={setName}
      accepted={accepted}
      setAccepted={setAccepted}
      signature={signature}
      setSignature={setSignature}
      open={open}
      setOpen={setOpen}
      busy={busy}
      error={error}
      saved={saved}
      isReady={isReady}
      valid={valid}
      save={save}
    />
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
  const demoRows = useDemoAgreements();
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
        const records = asRows<SignedAgreement>(check(await query), "Service agreements");
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
      <View style={{ gap: 8 }}>
        {!!title && (
          <Txt size={20} bold>
            {title}
          </Txt>
        )}
        {!demoRows.length ? (
          <Card>
            <Txt>Signature status: Not signed.</Txt>
          </Card>
        ) : (
          demoRows.map((row) => (
            <Card key={row.id} style={{ gap: 5 }}>
              <Txt bold>Service Agreement ✓ Signed</Txt>
              <Txt size={13} color={c.mutedForeground}>
                {row.signer_name} · Signed {displayDateTime(row.signed_at)}
              </Txt>
              <Txt size={12} color={c.mutedForeground}>
                Demo record · Local only
              </Txt>
            </Card>
          ))
        )}
      </View>
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
