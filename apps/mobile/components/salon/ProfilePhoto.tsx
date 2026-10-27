import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import Icon from "@/lib/icons/LucideIcon";
import { check, db } from "@/lib/salon/client";
import {
  removeProfilePhotoObject,
  signedProfilePhoto,
  uploadProfilePhoto,
} from "@/lib/salon/profilePhotos";
import { demoProfilePhoto } from "@/lib/salon/demoProfilePhotos";
import { Txt, ErrorBox, useColors } from "./ui";

export function ProfileAvatar({
  name,
  path,
  version,
  size = 82,
  transparent = false,
}: {
  name: string;
  path?: string | null;
  version?: string | null;
  size?: number;
  transparent?: boolean;
}) {
  const c = useColors();
  const [url, setUrl] = useState<string | null>(null);
  const demoPhoto = demoProfilePhoto(path);
  useEffect(() => {
    let active = true;
    setUrl(null);
    if (demoProfilePhoto(path)) return () => { active = false; };
    void signedProfilePhoto(path)
      .then((value) => active && setUrl(value))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [path, version]);
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: transparent ? "transparent" : c.goldSurface,
        borderWidth: transparent ? 0 : 1,
        borderColor: transparent ? "transparent" : c.goldBorder,
      }}
    >
      {demoPhoto?.atlasIndex != null ? (
        <Image
          source={demoPhoto.source}
          contentFit="fill"
          style={{
            position: "absolute",
            width: size * 4,
            height: size * 4,
            left: -(demoPhoto.atlasIndex % 4) * size,
            top: -Math.floor(demoPhoto.atlasIndex / 4) * size,
          }}
        />
      ) : demoPhoto ? (
        <Image source={demoPhoto.source} contentFit="cover" style={{ width: size, height: size }} />
      ) : url ? (
        <Image source={{ uri: url }} contentFit="cover" style={{ width: size, height: size }} />
      ) : initials ? (
        <Txt bold size={Math.max(16, size * 0.29)} color={c.brandAccent}>
          {initials}
        </Txt>
      ) : (
        <Icon name="UserRound" size={size * 0.42} color={c.mutedForeground} />
      )}
    </View>
  );
}

export function ProfilePhotoEditor({
  name,
  mode,
  clientId,
  clientPath,
  displayPath,
  ownerPath,
  useOwnerPhoto = false,
  updatedAt,
  disabled = false,
  size = 92,
  transparent = false,
  onChanged,
}: {
  name: string;
  mode: "client" | "owner";
  clientId?: string;
  clientPath?: string | null;
  displayPath?: string | null;
  ownerPath?: string | null;
  useOwnerPhoto?: boolean;
  updatedAt?: string | null;
  disabled?: boolean;
  size?: number;
  transparent?: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shownPath = displayPath || (useOwnerPhoto && ownerPath ? ownerPath : clientPath);
  const choose = async (camera: boolean) => {
    setError("");
    setBusy(true);
    try {
      if (camera && Platform.OS === "web") throw new Error("Use Choose from Library on web.");
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("Allow camera access in device settings to take a profile photo.");
      } else if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw new Error("Allow photo library access in device settings to choose a photo.");
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const side = Math.max(1, Math.min(asset.width || 1, asset.height || 1));
      const image = await manipulateAsync(
        asset.uri,
        [
          {
            crop: {
              originX: Math.max(0, Math.round(((asset.width || side) - side) / 2)),
              originY: Math.max(0, Math.round(((asset.height || side) - side) / 2)),
              width: side,
              height: side,
            },
          },
          { resize: { width: 640, height: 640 } },
        ],
        { compress: 0.84, format: SaveFormat.JPEG },
      );
      const user = mode === "client" ? check(await db().auth.getUser()).user : null;
      if (mode === "client" && !user) throw new Error("Sign in to update your profile photo.");
      const path =
        mode === "client" ? `client/${user!.id}/avatar.jpg` : `owner/${clientId}/avatar.jpg`;
      if (!clientId && mode === "owner") throw new Error("Client record not found.");
      await uploadProfilePhoto(path, image.uri);
      if (mode === "client") check(await db().rpc("lj_set_my_profile_photo", { p_path: path }));
      else
        check(
          await db().rpc("lj_set_owner_profile_photo", { p_client: clientId, p_path: path }),
        );
      await onChanged();
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update this photo.");
    } finally {
      setBusy(false);
    }
  };
  const removeClient = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "client") {
        const old = check(await db().rpc("lj_remove_my_profile_photo")) as string | null;
        await removeProfilePhotoObject(old);
      } else {
        const old = check(
          await db().rpc("lj_remove_owner_profile_photo", { p_client: clientId }),
        ) as string | null;
        await removeProfilePhotoObject(old);
      }
      await onChanged();
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove this photo.");
    } finally {
      setBusy(false);
    }
  };
  const useClient = async () => {
    setBusy(true);
    setError("");
    try {
      check(await db().rpc("lj_use_client_profile_photo", { p_client: clientId }));
      await onChanged();
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore the client photo.");
    } finally {
      setBusy(false);
    }
  };
  const item = (label: string, icon: string, onPress: () => void, danger = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 18,
      }}
    >
      <Icon name={icon as never} size={20} color={danger ? c.paymentPending : c.brandAccent} />
      <Txt bold={false} color={danger ? c.paymentPending : c.foreground}>
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === "client" ? "Change profile photo" : `Edit ${name} photo`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{ position: "relative" }}
      >
        <ProfileAvatar
          name={name}
          path={shownPath}
          version={updatedAt}
          size={size}
          transparent={transparent}
        />
        {!disabled && (
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: c.brandAccent,
              borderWidth: 2,
              borderColor: c.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="Camera" size={16} color="#ffffff" />
          </View>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => !busy && setOpen(false)}>
        <Pressable
          onPress={() => !busy && setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,.48)", justifyContent: "center", padding: 22 }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              alignSelf: "center",
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.goldBorder,
            }}
          >
            <View style={{ padding: 18, gap: 6, alignItems: "center" }}>
              <ProfileAvatar name={name} path={shownPath} version={updatedAt} size={78} />
              <Txt bold>{mode === "owner" ? `${name}'s profile photo` : "Profile photo"}</Txt>
              {busy && <ActivityIndicator color={c.brandAccent} />}
              {!!error && <ErrorBox message={error} />}
            </View>
            {Platform.OS !== "web" && item("Take Photo", "Camera", () => void choose(true))}
            {item(mode === "owner" ? "Upload Photo" : "Choose from Library", "Images", () =>
              void choose(false),
            )}
            {mode === "owner" && item("Use Client Photo", "UserRound", () => void useClient())}
            {((mode === "client" && clientPath) || (mode === "owner" && ownerPath)) &&
              item(
                mode === "owner" ? "Remove Owner Photo" : "Remove Photo",
                "Trash2",
                () => void removeClient(),
                true,
              )}
            {item("Cancel", "X", () => setOpen(false))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
