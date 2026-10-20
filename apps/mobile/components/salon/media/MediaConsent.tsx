import { displayDateTime } from "@/lib/salon/dates";
import React, { useState } from "react";
import { Txt, ErrorBox, useColors } from "../ui";
import { MediaSheet, MediaField } from "./MediaPrimitives";
import { OwnerButton } from "../owner/OwnerUI";
import { db, check } from "@/lib/salon/client";
import type { Client } from "@/lib/salon/types";
import type { MediaConsent as Consent } from "@/lib/salon/media/types";
import { contactIsMinor } from "@/lib/salon/ownerPrep";
export default function MediaConsent({
  client,
  consent,
  onClose,
  onSaved,
}: {
  client: Client;
  consent?: Consent;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useColors();
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(granted: boolean) {
    setBusy(true);
    setError("");
    try {
      if (granted && source.trim().length < 5)
        throw new Error("Describe how and when permission was obtained.");
      check(
        await db().rpc("lj_media_set_consent", {
          p_client: client.id,
          p_granted: granted,
          p_source: source,
        }),
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record consent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MediaSheet title="Media consent" onClose={onClose} busy={busy}>
      <Txt size={22} bold>
        {client.full_name}
      </Txt>
      <Txt>
        Record permission to capture and retain salon media and make selected items available
        privately in this client’s account. This does not authorize public or marketing use.
      </Txt>
      {contactIsMinor(client.birthday, client.is_minor) && (
        <Txt bold>
          Obtain the guardian’s permission and include their name in the consent record.
        </Txt>
      )}
      {consent && (
        <Txt color={c.mutedForeground}>
          Last record: {consent.granted ? "Consent granted" : "Consent revoked"} on{" "}
          {displayDateTime(consent.recorded_at)}. {consent.source}
        </Txt>
      )}
      <MediaField label="Permission Details & Date" value={source} onChange={setSource} multiline />
      <Txt size={16} color={c.mutedForeground}>
        Turning consent off also switches off access for all this client’s items. Granting consent
        again will not reshare them automatically.
      </Txt>
      {!client.customer_id && (
        <Txt>
          Link this contact to their registered account before enabling client access. You can keep
          media private meanwhile.
        </Txt>
      )}
      {!!error && <ErrorBox message={error} />}
      <OwnerButton label="Record consent granted" onPress={() => void save(true)} busy={busy} />
      <OwnerButton
        label="Revoke consent & all access"
        destructive
        onPress={() => void save(false)}
        disabled={busy}
      />
    </MediaSheet>
  );
}
