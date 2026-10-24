import React, { useEffect, useRef } from "react";
import { Modal, Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Action, Card, Txt, useColors } from "../ui";

export default function GiftQrScanner({ visible, onCode, onClose }: { visible: boolean; onCode: (code: string) => void; onClose: () => void }) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  useEffect(() => { if (visible) { scanned.current = false; if (!permission?.granted) void requestPermission(); } }, [permission?.granted, requestPermission, visible]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", padding: 22, justifyContent: "center" }}>
      <Pressable onPress={() => undefined}><Card style={{ gap: 14 }}>
        <Txt size={22} bold style={{ textAlign: "center" }}>Scan Gift Card QR</Txt>
        {permission?.granted ? <View style={{ height: 330, overflow: "hidden", borderRadius: 16, borderWidth: 2, borderColor: c.goldBorder }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (scanned.current) return;
              const match = data.match(/[?&]gift=([^&]+)/i);
              const code = decodeURIComponent(match?.[1] || data).trim().toUpperCase();
              if (!code.startsWith("LJ-")) return;
              scanned.current = true; onCode(code); onClose();
            }}
          />
        </View> : <Txt color={c.mutedForeground} style={{ textAlign: "center" }}>Allow camera access to scan the secure QR code, or close this view and enter the code manually.</Txt>}
        <Action label="Close Scanner" secondary onPress={onClose} />
      </Card></Pressable>
    </Pressable>
  </Modal>;
}
