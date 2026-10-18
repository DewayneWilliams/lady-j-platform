import React from "react";
import { Pressable, View } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { contactIsMinor } from "@/lib/salon/ownerPrep";
import { Field, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";
export default function GuardianFields({
  values,
  onChange,
}: {
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  const c = useColors();
  const birthday = String(values.birthday || "");
  const minor = contactIsMinor(birthday, Boolean(values.is_minor));
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: c.border,
        paddingTop: 20,
        marginBottom: 24,
        gap: 16,
      }}
    >
      <OwnerText size={24} bold>
        Parent / guardian
      </OwnerText>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Contact is under 18"
        accessibilityState={{ checked: minor, disabled: !!birthday }}
        disabled={!!birthday}
        onPress={() => onChange({ ...values, is_minor: !minor })}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58 }}
      >
        <Icon name={minor ? "SquareCheck" : "Square"} size={26} color={c.primary} />
        <OwnerText>Contact is under 18</OwnerText>
      </Pressable>
      <OwnerText size={17} muted>
        {birthday
          ? "Minor status follows the date of birth."
          : "Select this for a minor when their date of birth is not recorded."}
      </OwnerText>
      {minor && (
        <View style={{ gap: 14 }}>
          <Field
            large
            label="Parent / guardian full name"
            value={String(values.guardian_name || "")}
            onChangeText={(guardian_name) => onChange({ ...values, guardian_name })}
          />
          <Field
            large
            label="Relationship to client"
            value={String(values.guardian_relationship || "")}
            onChangeText={(guardian_relationship) => onChange({ ...values, guardian_relationship })}
          />
          <Field
            large
            label="Parent / guardian phone"
            keyboardType="phone-pad"
            value={String(values.guardian_phone || "")}
            onChangeText={(guardian_phone) => onChange({ ...values, guardian_phone })}
          />
          <Field
            large
            label="Parent / guardian email (optional)"
            keyboardType="email-address"
            value={String(values.guardian_email || "")}
            onChangeText={(guardian_email) => onChange({ ...values, guardian_email })}
          />
          <OwnerText size={17} muted>
            Private salon contact details. Recording a guardian does not replace any required
            service consent.
          </OwnerText>
        </View>
      )}
    </View>
  );
}
