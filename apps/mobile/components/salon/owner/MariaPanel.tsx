import React, { useState } from "react";
import { View, Pressable } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { Card, useColors } from "../ui";
import { OwnerButton, OwnerText } from "./OwnerUI";
export default function MariaPanel({ demo }: { demo: boolean }) {
  const c = useColors();
  const [voiceHint, setVoiceHint] = useState(false);
  const [spanish, setSpanish] = useState(false);
  return (
    <View style={{ gap: 20, maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
        <OwnerButton
          label="English"
          secondary={spanish}
          onPress={() => {
            setSpanish(false);
          }}
        />
        <OwnerButton
          label="Español"
          secondary={!spanish}
          onPress={() => {
            setSpanish(true);
          }}
        />
      </View>
      <Card style={{ gap: 18, alignItems: "center", paddingVertical: 30 }}>
        <View style={{ borderWidth: 2, borderColor: c.goldBorder, borderRadius: 104, padding: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Hablar con Maria" : "Talk to Maria"}
            accessibilityHint={
              spanish ? "La voz todavía no está conectada" : "Voice is not connected yet"
            }
            onPress={() => setVoiceHint(true)}
            style={({ pressed }) => ({
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: c.primary,
              borderWidth: 3,
              borderColor: c.tertiary,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Icon name="Mic" size={54} color={c.primaryForeground} />
          </Pressable>
        </View>
        <OwnerText size={28} bold>
          {spanish ? "Habla con Maria" : "Talk to Maria"}
        </OwnerText>
        <OwnerText>
          {spanish
            ? "La conexión de voz estará disponible más adelante."
            : "Your voice connection is coming later."}
        </OwnerText>
        {voiceHint && (
          <OwnerText size={17} muted>
            {spanish
              ? "OpenAI Realtime todavía no está conectado. No se graba audio."
              : "OpenAI Realtime is not connected yet. No audio is being recorded."}
          </OwnerText>
        )}
        <OwnerText size={17} muted>
          {demo
            ? spanish
              ? "Datos ficticios de demostración."
              : "Demo workspace · Fictional records."
            : spanish
              ? "Usa los registros cargados de tu salón."
              : "Uses the loaded records from your private workspace."}
        </OwnerText>
      </Card>
    </View>
  );
}
