import { displayDateTime } from "@/lib/salon/dates";
import React, { useState } from "react";
import { View, Switch } from "react-native";
import { Txt, ErrorBox, useColors } from "../ui";
import { OwnerButton } from "../owner/OwnerUI";
import { DateField } from "../DateFields";
import { MediaSheet, MediaField, ChoiceRow } from "./MediaPrimitives";
import { changeMedia } from "@/lib/salon/media/api";
import { db, check } from "@/lib/salon/client";
import type { MediaItem, MediaAlbum } from "@/lib/salon/media/types";
export default function MediaEditor({
  item,
  albums,
  consent,
  onClose,
  onSaved,
}: {
  item: MediaItem;
  albums: MediaAlbum[];
  consent: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = useColors();
  const [name, setName] = useState(item.name);
  const [caption, setCaption] = useState(item.caption);
  const [notes, setNotes] = useState(item.notes || "");
  const [tags, setTags] = useState(item.tags.join(", "));
  const [date, setDate] = useState(item.display_date);
  const [album, setAlbum] = useState(item.album_id || "");
  const [allow, setAllow] = useState(!!item.allow_client);
  const [favorite, setFavorite] = useState(!!item.favorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!name.trim()) throw new Error("Give this item a name.");
      await changeMedia([item.id], {
        name: name.trim(),
        caption,
        notes,
        tags: [
          ...new Set(
            tags
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ],
        display_date: date,
        album_id: album,
        allow_client: allow,
        favorite,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save media.");
    } finally {
      setBusy(false);
    }
  }
  const toggle = (
    label: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
    disabled = false,
  ) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Txt bold style={{ flex: 1 }}>
        {label}
      </Txt>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={busy || disabled}
        trackColor={{ false: c.mutedForeground, true: c.brandAccentFill }}
      />
    </View>
  );
  return (
    <MediaSheet title="Media details" onClose={onClose} busy={busy}>
      <MediaField label="Name" value={name} onChange={setName} />
      <DateField label="Display Date" value={date} onChange={setDate} calendar />
      <Txt size={14} color={c.mutedForeground}>
        Uploaded {displayDateTime(item.created_at)}. The original upload time is kept.
      </Txt>
      <MediaField
        label="Caption (Visible When Shared)"
        value={caption}
        onChange={setCaption}
        multiline
      />
      <MediaField label="Notes (Owner Only)" value={notes} onChange={setNotes} multiline />
      <MediaField label="Tags (Comma Separated)" value={tags} onChange={setTags} />
      <Txt size={16} bold>
        Album
      </Txt>
      <ChoiceRow
        values={[
          "No album",
          ...albums.filter((a) => a.client_id === item.client_id).map((a) => a.name),
        ]}
        value={albums.find((a) => a.id === album)?.name || "No album"}
        onChange={(v) =>
          setAlbum(albums.find((a) => a.client_id === item.client_id && a.name === v)?.id || "")
        }
      />
      {toggle("Favorite", favorite, setFavorite)}
      {toggle("Allow Client Access", allow, setAllow, !consent && !allow)}
      <Txt size={16} color={c.mutedForeground}>
        {consent
          ? "Only this client can view approved items. Owner notes are never shared."
          : "Record sharing consent and link this contact to a registered client before allowing access."}
      </Txt>
      {!!error && <ErrorBox message={error} />}
      <OwnerButton label="Save details" onPress={() => void save()} busy={busy} />
      {!!item.album_id && (
        <OwnerButton
          label="Use as album cover"
          secondary
          busy={busy}
          onPress={() => {
            const a = albums.find((v) => v.id === item.album_id);
            if (!a) return;
            setBusy(true);
            setError("");
            void (async () => {
              try {
                check(
                  await db().rpc("lj_media_album_save", {
                    p_client: item.client_id,
                    p_id: a.id,
                    p_values: {
                      name: a.name,
                      description: a.description,
                      display_date: a.display_date,
                      cover_id: item.id,
                    },
                  }),
                );
                await onSaved();
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to set cover.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </MediaSheet>
  );
}
export function AlbumEditor({
  clientId,
  album,
  onClose,
  onSaved,
}: {
  clientId: string;
  album?: MediaAlbum;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(album?.name || "");
  const [description, setDescription] = useState(album?.description || "");
  const [date, setDate] = useState(album?.display_date || new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  async function save(deleting = false) {
    setBusy(true);
    setError("");
    try {
      if (deleting && album) check(await db().rpc("lj_media_album_delete", { p_id: album.id }));
      else {
        if (!name.trim()) throw new Error("Give your album a name.");
        check(
          await db().rpc("lj_media_album_save", {
            p_client: clientId,
            p_id: album?.id || null,
            p_values: {
              name: name.trim(),
              description,
              display_date: date,
              cover_id: album?.cover_id || "",
            },
          }),
        );
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save album.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MediaSheet title={album ? "Edit album" : "New album"} onClose={onClose} busy={busy}>
      <MediaField label="Album Name" value={name} onChange={setName} />
      <DateField label="Album Date" value={date} onChange={setDate} calendar />
      <MediaField
        label="Description (Visible When Shared)"
        value={description}
        onChange={setDescription}
        multiline
      />
      <Txt>Albums never grant access. Each photo or video keeps its own sharing permission.</Txt>
      {!!error && <ErrorBox message={error} />}
      <OwnerButton label="Save album" onPress={() => void save()} busy={busy} />
      {album &&
        (!remove ? (
          <OwnerButton
            label="Delete album"
            destructive
            onPress={() => setRemove(true)}
            disabled={busy}
          />
        ) : (
          <>
            <Txt>
              Delete this album? Its photos and videos will remain in the gallery with their current
              permissions.
            </Txt>
            <OwnerButton
              label="Keep album"
              secondary
              onPress={() => setRemove(false)}
              disabled={busy}
            />
            <OwnerButton
              label="Confirm delete album"
              destructive
              onPress={() => void save(true)}
              busy={busy}
            />
          </>
        ))}
    </MediaSheet>
  );
}
