import React, { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useSalon } from "@/lib/salon/SalonProvider";
import { Appointment } from "@/lib/salon/types";
import { db, check } from "@/lib/salon/client";
import { validReportDate } from "@/lib/salon/revenueReport";
import { money } from "@/lib/salon/types";
import { Action, Card, ErrorBox, Field, Txt, useColors } from "./ui";

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Port_of_Spain", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function bytes(asset: ImagePicker.ImagePickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();
  if (!asset.base64) throw new Error("Choose the proof image again.");
  return Uint8Array.from(atob(asset.base64), (value) => value.charCodeAt(0)).buffer;
}

export default function VipPaymentPanel({ appointment }: { appointment: Appointment }) {
  const s = useSalon();
  const c = useColors();
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [selection, setSelection] = useState<"full" | "deposit">(appointment.payment_selection || "full");
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(source: "camera" | "library") {
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(`${source === "camera" ? "Camera" : "Photo library"} permission is required.`);
      const options = { mediaTypes: ["images"] as ImagePicker.MediaType[], quality: 0.85, base64: true };
      const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      let asset = result.assets[0];
      if (/hei[cf]/i.test(asset.mimeType || asset.fileName || "")) {
        const converted = await manipulateAsync(asset.uri, [], { compress: 0.85, format: SaveFormat.JPEG, base64: true });
        asset = { ...asset, uri: converted.uri, base64: converted.base64 || null, mimeType: "image/jpeg", fileName: "vip-payment-proof.jpg" };
      }
      if (asset.fileSize && asset.fileSize>8*1024*1024) throw new Error("Choose a proof image smaller than 8 MB.");
      setReceipt(asset);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to choose proof of payment.");
    }
  }

  async function submit() {
    setError("");
    if (!s.session || !receipt || reference.trim().length<3 || !validReportDate(paymentDate) || paymentDate>todayKey()) {
      setError("Add a valid transaction reference, payment date and proof image.");
      return;
    }
    setBusy(true);
    const mime = receipt.mimeType || "image/jpeg";
    const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${s.session.user.id}/vip-${appointment.id}/receipt.${extension}`;
    try {
      check(await db().storage.from("lj-payment-receipts").upload(path, await bytes(receipt), { contentType: mime, upsert: true }));
      check(await db().rpc("lj_submit_vip_payment", {
        p_appointment: appointment.id,
        p_reference: reference.trim(),
        p_payment_date: paymentDate,
        p_receipt_path: path,
        p_receipt_filename: receipt.fileName || "VIP payment proof",
        p_receipt_mime: mime,
        p_payment_selection: selection,
      }));
      await s.refreshPrivate();
      s.notify("Payment proof submitted. It remains Pending Verification.");
    } catch (reason) {
      await db().storage.from("lj-payment-receipts").remove([path]);
      setError(reason instanceof Error ? reason.message : "Unable to submit payment proof.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12, marginTop: 14 }}>
      {!!error && <ErrorBox message={error} />}
      <Card style={{ gap: 12, borderColor: c.goldBorder, backgroundColor: c.goldSurface }}>
        <Txt size={18} bold>Complete Approved VIP Payment</Txt>
        {(["full", "deposit"] as const).map((value) => (
          <Action
            key={value}
            label={value === "full" ? `Pay in Full — ${money(appointment.total)}` : `Secure With 50% Deposit — ${money(appointment.deposit)}`}
            secondary={selection !== value}
            onPress={() => setSelection(value)}
            style={{ alignSelf: "stretch" }}
          />
        ))}
        <Txt size={13} color={c.mutedForeground}>
          {selection === "full" ? "Complete your payment and arrive ready to relax." : `Remaining balance at your visit: ${money(appointment.total-appointment.deposit)}`}
        </Txt>
        <Field label="Transaction Reference Number" value={reference} onChangeText={setReference} />
        <Field label="Payment Date" value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" />
        <Txt bold>Upload Proof of Payment</Txt>
        <Txt size={12} color={c.mutedForeground}>Upload your bank transfer proof here.</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Action label="Take Photo" secondary icon="Camera" onPress={() => void choose("camera")} />
          <Action label={receipt ? "Change Photo" : "Upload Photo"} secondary icon="Upload" onPress={() => void choose("library")} />
        </View>
        {!!receipt && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image
              source={{ uri: receipt.uri }}
              accessibilityLabel="Selected payment proof preview"
              style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: c.muted }}
            />
            <Txt size={13} color={c.success} style={{ flex: 1 }}>
              Selected: {receipt.fileName || "Payment proof image"}
            </Txt>
          </View>
        )}
      </Card>
      <Action label="Submit Proof for Verification" busy={busy} onPress={() => void submit()} style={{ alignSelf: "stretch" }} />
    </View>
  );
}
