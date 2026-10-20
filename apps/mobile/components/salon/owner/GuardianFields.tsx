import React from "react";
import { View } from "react-native";
import { contactIsMinor } from "@/lib/salon/ownerPrep";
import { OwnerText } from "./OwnerUI";
import { Field } from "../ui";
export default function GuardianFields({
  values,
  onChange,
}: {
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  if (!contactIsMinor(String(values.birthday || ""), Boolean(values.is_minor))) return null;
  return (
    <View style={{ marginBottom: 24, gap: 12 }}>
      <OwnerText bold>Parent/Guardian</OwnerText>
      <Field
        label="Name"
        large
        value={String(values.guardian_name || "")}
        onChangeText={(guardian_name) => onChange({ ...values, guardian_name })}
      />
    </View>
  );
}
