import React, { useState } from "react";
import { View, Pressable, FlatList, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Txt, useColors } from "../ui";
import Icon from "@/lib/icons/LucideIcon";
import { MediaField } from "./MediaPrimitives";
export default function MediaSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Txt size={16} bold>
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ": " + (options.find((v) => v.id === value)?.name || "Choose")}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={{
          minHeight: 54,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.card,
          borderRadius: 12,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Txt style={{ flex: 1 }}>{options.find((v) => v.id === value)?.name || "Choose"}</Txt>
        <Icon name="ChevronDown" size={20} color={c.foreground} />
      </Pressable>
      {open && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setOpen(false)}
        >
          <SafeAreaView
            edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
            style={{ flex: 1, backgroundColor: c.background }}
          >
            <View
              style={{
                padding: 20,
                gap: 16,
                maxWidth: 800,
                width: "100%",
                alignSelf: "center",
                flex: 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Txt size={24} bold style={{ flex: 1 }}>
                  {label}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close choices"
                  onPress={() => setOpen(false)}
                  style={{ padding: 12 }}
                >
                  <Icon name="X" size={24} color={c.foreground} />
                </Pressable>
              </View>
              <MediaField label="Search Choices" value={query} onChange={setQuery} />
              <FlatList
                data={options.filter((v) =>
                  String(v?.name ?? "")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(v) => v.id}
                ListEmptyComponent={<Txt>No matching choices.</Txt>}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === value }}
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    style={{
                      paddingVertical: 18,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <Txt style={{ flex: 1 }}>{item.name}</Txt>
                    {item.id === value && <Icon name="Check" size={22} color={c.brandAccent} />}
                  </Pressable>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}
