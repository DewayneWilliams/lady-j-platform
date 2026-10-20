import React, { useRef, useState } from "react";
import { View, Switch, Pressable, ActivityIndicator } from "react-native";
import { changeMedia } from "@/lib/salon/media/api";
import type { MediaItem } from "@/lib/salon/media/types";
import { Txt, useColors } from "../ui";

export default function MediaAccessToggle({
  item,
  disabled = false,
  compact = false,
  onSaved,
  onConsent,
}: {
  item: MediaItem;
  disabled?: boolean;
  compact?: boolean;
  onSaved: () => Promise<void>;
  onConsent?: () => void;
}) {
  const c = useColors();
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function update(allow: boolean) {
    if (lock.current || disabled || item.status !== "ready") return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await changeMedia([item.id], { allow_client: allow });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change access. Please retry.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <View style={{ padding: compact ? 8 : 16, gap: 8 }}>
      <View
        style={{
          flexDirection: compact ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Txt size={compact ? 13 : 17} bold style={{ textAlign: compact ? "center" : "left" }}>
          Allow Client Access
        </Txt>
        <View style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}>
          {saving ? (
            <ActivityIndicator accessibilityLabel="Saving client access" color={c.brandAccent} />
          ) : (
            <Switch
              accessibilityLabel={"Allow Client Access: " + item.name}
              value={!!item.allow_client}
              disabled={disabled || item.status !== "ready"}
              onValueChange={(value) => void update(value)}
              trackColor={{ false: c.mutedForeground, true: c.brandAccentFill }}
            />
          )}
        </View>
      </View>
      {!!error && (
        <>
          <Txt size={13} accessibilityRole="alert" color={c.destructive}>
            {error}
          </Txt>
          {!!onConsent && /consent/i.test(error) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError("");
                onConsent();
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Txt size={14} bold color={c.brandAccent}>
                Record Consent
              </Txt>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
