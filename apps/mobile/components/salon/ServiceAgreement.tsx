import React, { useEffect, useState } from "react";
import { View, ScrollView, Linking } from "react-native";
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

export async function openAgreementPdf(path: string) {
  const result = check(
    await db()
      .storage.from("lj-service-agreements")
      .createSignedUrl(path, 60, { download: "Lady-J-Service-Agreement.pdf" }),
  );
  if (!result?.signedUrl) throw new Error("Unable to open this agreement. Please try again.");
  await Linking.openURL(result.signedUrl);
}
export default function ServiceAgreement({
  services,
  onReady,
}: {
  services: string[];
  onReady: (id: string) => void;
}) {
  const s = useSalon(),
    c = useColors();
  const [name, setName] = useState(s.profile?.full_name || "");
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<SignatureStroke[]>([]);
  const [saved, setSaved] = useState<Pick<
    SignedAgreement,
    "id" | "signed_at" | "object_path" | "signer_name"
  > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = [...services].sort().join(",");
  useEffect(() => {
    setSaved(null);
    onReady("");
  }, [key, name, signature, accepted, onReady]);
  const valid =
    accepted && name.trim().length >= 3 && signature.reduce((n, v) => n + v.length, 0) >= 6;
  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await db().functions.invoke("lj-sign-agreement", {
        body: {
          name: name.trim(),
          services,
          signature,
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
  return (
    <Card style={{ gap: 16, marginBottom: 24 }}>
      <Txt size={24} bold>
        Client service agreement
      </Txt>
      <Txt color={c.mutedForeground}>
        Review, agree and sign before payment. A dated PDF is saved privately to your account and
        Lady J’s owner records.
      </Txt>
      <ScrollView
        nestedScrollEnabled
        style={{ maxHeight: 310 }}
        contentContainerStyle={{ paddingRight: 10 }}
      >
        <Txt size={15}>{agreementText.replace(/^#+\s*/gm, "")}</Txt>
      </ScrollView>
      <Field
        label="Client name · First and Last"
        value={name}
        onChangeText={(v) => {
          if (!busy) setName(v);
        }}
      />
      <Check
        checked={accepted}
        onPress={() => {
          if (!busy) setAccepted((v) => !v);
        }}
        label="I Agree to the Service, Booking & Photography Policies."
      />
      <SignaturePad onChange={setSignature} disabled={busy} />
      {!!error && <ErrorBox message={error} />}
      {saved ? (
        <View style={{ gap: 8 }}>
          <Txt bold color={c.success}>
            Signed and saved ·{" "}
            {new Date(saved.signed_at).toLocaleString("en-TT", {
              timeZone: "America/Port_of_Spain",
            })}
          </Txt>
          <LinkText
            onPress={() => {
              void openAgreementPdf(saved.object_path).catch((e) => setError(e.message));
            }}
          >
            Download signed PDF
          </LinkText>
          <Txt size={13}>You can now continue to payment.</Txt>
        </View>
      ) : (
        <Action
          label="Sign & save my agreement"
          onPress={() => void save()}
          busy={busy}
          disabled={!valid}
          style={{ alignSelf: "stretch" }}
        />
      )}
    </Card>
  );
}
export function AgreementList({
  customerId,
  demo = false,
}: {
  customerId?: string;
  demo?: boolean;
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
        if (customerId) query = query.eq("customer_id", customerId);
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
          Service agreements
        </Txt>
        <Txt>
          Demo workspace · Signed PDFs appear here for real account-linked bookings. No fictional
          signatures are created.
        </Txt>
      </Card>
    );
  return (
    <View style={{ gap: 16 }}>
      {!!error && <ErrorBox message={error} retry={() => setVersion((v) => v + 1)} />}
      {busy ? (
        <Txt>Loading signed agreements…</Txt>
      ) : !rows.length ? (
        <Card>
          <Txt>No signed agreements yet.</Txt>
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
            <Txt>
              Signed{" "}
              {new Date(row.signed_at).toLocaleString("en-TT", {
                timeZone: "America/Port_of_Spain",
              })}
            </Txt>
            <Txt size={13} color={c.mutedForeground}>
              Client service agreement ·{" "}
              {row.appointment_id ? "Linked to appointment" : "Ready for booking"}
            </Txt>
            <Action
              label="Download signed PDF"
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
