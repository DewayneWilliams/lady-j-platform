import React, { useState } from "react";
import { View } from "react-native";
import { Field } from "../ui";
import { OwnerButton } from "./OwnerUI";

export default function ContactRemovalConfirmation({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [phrase, setPhrase] = useState("");
  const ready = phrase.trim().toUpperCase() === "DELETE" && !busy;
  return (
    <View style={{ gap: 24 }}>
      <OwnerButton label="Keep Client" fill disabled={busy} onPress={onCancel} />
      <Field
        large
        label="Type DELETE to confirm"
        value={phrase}
        onChangeText={(value) => {
          if (!busy) setPhrase(value);
        }}
      />
      <View style={{ paddingTop: 12 }}>
        <OwnerButton
          label={busy ? "Deleting" : "Delete Client"}
          icon="Trash2"
          fill
          destructive
          disabled={!ready}
          onPress={() => {
            if (ready) onConfirm();
          }}
        />
      </View>
    </View>
  );
}
