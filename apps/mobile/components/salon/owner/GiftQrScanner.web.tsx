import React from "react";
import { Modal, Pressable } from "react-native";
import { Action, Card, Txt, useColors } from "../ui";

export default function GiftQrScanner({ visible, onClose }: { visible: boolean; onCode: (code: string) => void; onClose: () => void }) {
  const c = useColors();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", padding: 22, justifyContent: "center" }}><Pressable onPress={() => undefined}><Card style={{ gap: 12 }}><Txt size={22} bold>QR scanning is available in the app</Txt><Txt color={c.mutedForeground}>Use an iOS or Android simulator or published app to scan. In the web preview, enter the secure gift code printed below the QR.</Txt><Action label="Enter Code Instead" secondary onPress={onClose} /></Card></Pressable></Pressable></Modal>;
}
