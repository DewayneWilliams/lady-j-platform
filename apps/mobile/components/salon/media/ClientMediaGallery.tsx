import { displayDateTime } from "@/lib/salon/dates";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check } from "@/lib/salon/client";
import { sessionStorage } from "@/lib/salon/sessionStorage";
import { fonts } from "@/lib/salon/design";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import {
  listMedia,
  listAlbums,
  changeMedia,
  deleteMedia,
  cleanupDeletedMedia,
} from "@/lib/salon/media/api";
import { initialFilters, mediaDate } from "@/lib/salon/media/types";
import type {
  GalleryFilters,
  MediaItem,
  MediaAlbum,
  MediaConsent as Consent,
} from "@/lib/salon/media/types";
import type { Client, Appointment, Service } from "@/lib/salon/types";
import { Txt, ErrorBox, useColors, Tag } from "../ui";
import { OwnerButton, OwnerEmpty } from "../owner/OwnerUI";
import {
  MediaThumbnail,
  MediaSheet,
  ChoiceRow,
  ConfirmMedia,
  PrivateAlbumCover,
} from "./MediaPrimitives";
import MediaSelect from "./MediaSelect";
import MediaUpload from "./MediaUpload";
import MediaAccessToggle from "./MediaAccessToggle";
import MediaEditor, { AlbumEditor } from "./MediaEditor";
import MediaConsent from "./MediaConsent";
import MediaViewer, { MediaComparison } from "./MediaViewer";
import { DateField } from "../DateFields";
type Props = {
  owner?: boolean;
  demo?: boolean;
  clientId?: string;
  appointmentId?: string;
  clients?: Client[];
  appointments?: Appointment[];
  services?: Service[];
  onClose: () => void;
};
type GridRow = { key: string; title?: string; items: MediaItem[] };
export default function ClientMediaGallery({
  owner = false,
  demo = false,
  clientId,
  appointmentId,
  clients = [],
  appointments = [],
  services = [],
  onClose,
}: Props) {
  const c = useColors();
  const s = useSalon();
  const { width } = useWindowDimensions();
  const columns = width > 1000 ? 6 : width > 650 ? 4 : 3;
  const [scope, setScope] = useState(clientId || "");
  const [filters, setFilters] = useState<GalleryFilters>({
    ...initialFilters,
    appointment: appointmentId || "",
  });
  const [query, setQuery] = useState("");
  const [prefsReady, setPrefsReady] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const moreLock = useRef(false);
  const mutation = useRef(false);
  const [panel, setPanel] = useState<
    "filters" | "upload" | "album" | "consent" | "move" | "audit" | null
  >(null);
  const [consentClient, setConsentClient] = useState<Client>();
  const [editAlbum, setEditAlbum] = useState<MediaAlbum>();
  const [edit, setEdit] = useState<MediaItem>();
  const [retry, setRetry] = useState<MediaItem>();
  const [selection, setSelection] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [viewer, setViewer] = useState<string>();
  const [compare, setCompare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moveAlbum, setMoveAlbum] = useState("");
  const [cleanupPending, setCleanupPending] = useState(false);
  const [audit, setAudit] = useState<
    { id: number; action: string; created_at: string; details: Record<string, unknown> }[]
  >([]);
  const [clientContacts, setClientContacts] = useState<{ id: string; granted: boolean }[]>([]);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const prefKey = "lj-media-sort:" + s.session?.user.id;
  useEffect(() => {
    let active = true;
    void sessionStorage.getItem(prefKey).then((value) => {
      if (active) {
        setFilters((v) => ({ ...v, sort: value === "asc" ? "asc" : "desc" }));
        setPrefsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [prefKey]);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((v) => ({ ...v, query: query.trim() })), 280);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(async () => {
    if (!prefsReady) return;
    const ticket = ++request.current;
    if (demo) {
      setItems([]);
      setAlbums([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    try {
      const [result, nextAlbums] = await Promise.all([
        listMedia(scope || null, filters),
        listAlbums(scope || null),
      ]);
      if (ticket !== request.current) return;
      setItems(result.items);
      setTotal(result.total);
      setAlbums(nextAlbums);
      setError("");
      if (owner) {
        const result = await db()
          .from("lj_media_consent")
          .select("*")
          .eq("client_id", scope || "00000000-0000-0000-0000-000000000000");
        if (ticket === request.current) setConsents(check(result) || []);
        const deleted = check(
          await db()
            .from("lj_client_media")
            .select("id")
            .not("deleted_at", "is", null)
            .is("storage_deleted_at", null)
            .limit(1),
        );
        if (ticket === request.current) setCleanupPending(!!deleted?.length);
      } else {
        const contacts = check(await db().rpc("lj_media_my_contacts"));
        if (ticket === request.current) setClientContacts(contacts || []);
      }
    } catch (e) {
      if (ticket === request.current) {
        setError(e instanceof Error ? e.message : "Unable to load your gallery.");
        if (!owner) {
          setItems([]);
          setAlbums([]);
          setViewer(undefined);
          setCompare(false);
        }
      }
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [prefsReady, demo, scope, filters, owner]);
  useEffect(() => {
    setLoading(true);
    setSelection([]);
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  useForegroundRefresh(load, !demo && prefsReady);
  useEffect(() => {
    if (owner || demo || !prefsReady) return;
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [owner, demo, prefsReady, load]);
  useEffect(() => {
    if (viewer && !items.some((m) => m.id === viewer)) setViewer(undefined);
    setSelection((old) => old.filter((id) => items.some((m) => m.id === id)));
  }, [items, viewer]);
  const client = clients.find((v) => v.id === scope);
  const selected = items.filter((m) => selection.includes(m.id));
  const ready = items.filter((m) => m.status === "ready");
  const viewerIndex = ready.findIndex((m) => m.id === viewer);
  const activeAlbum = albums.find((a) => a.id === filters.album);
  const rows = useMemo(() => {
    const result: GridRow[] = [];
    for (const item of items) {
      const last = result[result.length - 1];
      const group = item.group_label || "Photos";
      if (!last || last.items.length === columns || last.items[0].group_label !== item.group_label)
        result.push({
          key: item.id,
          title: !last || last.items[0].group_label !== item.group_label ? group : undefined,
          items: [item],
        });
      else last.items.push(item);
    }
    return result;
  }, [items, columns]);
  async function more() {
    if (moreLock.current || loading || items.length >= total || demo) return;
    moreLock.current = true;
    setLoadingMore(true);
    const ticket = request.current;
    try {
      const result = await listMedia(scope || null, filters, items.length);
      if (ticket === request.current) {
        setItems((old) => [...old, ...result.items.filter((m) => !old.some((v) => v.id === m.id))]);
        setTotal(result.total);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load more media.");
    } finally {
      moreLock.current = false;
      setLoadingMore(false);
    }
  }
  async function act(run: () => Promise<void>) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      await run();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update gallery.");
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function toggle(id: string) {
    setSelection((old) =>
      old.includes(id) ? old.filter((v) => v !== id) : old.length < 100 ? [...old, id] : old,
    );
  }
  function reset() {
    setQuery("");
    setFilters((v) => ({ ...initialFilters, sort: v.sort }));
  }
  const groupOptions = ["Dates", "Albums", "Appointments", "Services"] as const;
  const filterCount = [
    filters.kind !== "All",
    filters.favorites,
    filters.shared,
    !!filters.album,
    !!filters.appointment,
    !!filters.service,
    !!filters.from,
    !!filters.to,
  ].filter(Boolean).length;
  const sheetClose = () => {
    if (!busy) {
      setPanel(null);
      setEditAlbum(undefined);
      setRetry(undefined);
      setConsentClient(undefined);
    }
  };
  async function openAudit() {
    setPanel("audit");
    await act(async () => {
      let query = db()
        .from("lj_media_audit")
        .select("id,action,created_at,details")
        .order("id", { ascending: false })
        .limit(100);
      if (scope) query = query.eq("client_id", scope);
      setAudit(check(await query) || []);
    });
  }
  async function removeSelected() {
    await act(async () => {
      try {
        await deleteMedia(selected);
        setSelection([]);
        setSelecting(false);
        setDeleting(false);
      } catch (e) {
        setCleanupPending(true);
        setSelection([]);
        setDeleting(false);
        await load();
        throw e;
      }
    });
  }
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background }}
      >
        <View style={{ flex: 1, maxWidth: 1280, width: "100%", alignSelf: "center" }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderColor: c.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close gallery"
                disabled={busy}
                onPress={onClose}
                style={{ padding: 10 }}
              >
                <Icon name="ChevronLeft" size={26} color={c.brandAccent} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Txt size={28} bold>
                  {owner ? "Client media" : "My media"}
                </Txt>
                <Txt size={14} color={c.mutedForeground}>
                  {client?.full_name ||
                    (owner ? "Private salon library" : "Shared privately with you")}{" "}
                  · {total} {total === 1 ? "item" : "items"}
                </Txt>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selecting ? "Finish selection" : "Select media"}
                onPress={() => {
                  setSelecting((v) => !v);
                  setSelection([]);
                }}
                style={{ padding: 12 }}
              >
                <Txt bold color={c.brandAccent}>
                  {selecting ? "Done" : "Select"}
                </Txt>
              </Pressable>
            </View>
            {demo && <Tag>Sample data — real client media requires owner access</Tag>}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
                borderRadius: 14,
                paddingHorizontal: 14,
                backgroundColor: c.muted,
              }}
            >
              <Icon name="Search" size={20} color={c.mutedForeground} />
              <TextInput
                accessibilityLabel="Search media"
                placeholder="Search names, captions or tags"
                placeholderTextColor={c.mutedForeground}
                value={query}
                onChangeText={setQuery}
                style={{
                  flex: 1,
                  color: c.foreground,
                  fontFamily: fonts.body,
                  fontSize: 16,
                  minHeight: 48,
                }}
              />
              {!!query && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                  style={{ padding: 10 }}
                >
                  <Icon name="X" size={18} color={c.foreground} />
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sort media"
                onPress={() => {
                  const sort = filters.sort === "desc" ? "asc" : "desc";
                  setFilters((v) => ({ ...v, sort }));
                  void sessionStorage.setItem(prefKey, sort);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 99,
                }}
              >
                <Txt size={14} bold>
                  {filters.sort === "desc" ? "Newest–Oldest" : "Oldest–Newest"}
                </Txt>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter media"
                onPress={() => setPanel("filters")}
                style={{ padding: 10 }}
              >
                <Txt size={16} color={c.brandAccent}>
                  Filters{filterCount ? " (" + filterCount + ")" : ""}
                </Txt>
              </Pressable>
              {owner && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add media"
                  disabled={demo}
                  onPress={() => setPanel("upload")}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 99,
                    backgroundColor: demo ? c.muted : c.brandAccentFill,
                  }}
                >
                  <Txt bold size={16} color={demo ? c.mutedForeground : c.tertiaryForeground}>
                    + Add media
                  </Txt>
                </Pressable>
              )}
            </View>
            <ChoiceRow
              values={groupOptions}
              value={filters.group}
              onChange={(group) => setFilters((v) => ({ ...v, group }))}
            />
          </View>
          {!!error && (
            <View style={{ padding: 16 }}>
              <ErrorBox message={error} retry={() => void load()} />
            </View>
          )}
          {cleanupPending && (
            <View style={{ padding: 16, gap: 10 }}>
              <Txt size={16}>
                The items are hidden. Retry to finish removing their stored files.
              </Txt>
              <OwnerButton
                label="Finish storage cleanup"
                secondary
                busy={busy}
                onPress={() =>
                  void act(async () => {
                    await cleanupDeletedMedia();
                    setCleanupPending(false);
                  })
                }
              />
            </View>
          )}
          {selecting && (
            <View style={{ padding: 14, gap: 10, borderBottomWidth: 1, borderColor: c.border }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Txt bold>{selection.length} selected</Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Select loaded media"
                  onPress={() => setSelection(items.slice(0, 100).map((m) => m.id))}
                  style={{ padding: 10 }}
                >
                  <Txt size={16} color={c.brandAccent}>
                    Select loaded
                  </Txt>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                <OwnerButton
                  compact
                  secondary
                  label="Compare 2 photos"
                  disabled={
                    selected.length !== 2 ||
                    selected.some((v) => v.kind !== "photo" || v.status !== "ready")
                  }
                  onPress={() => setCompare(true)}
                />
                {owner && (
                  <>
                    <OwnerButton
                      compact
                      secondary
                      label="Favorite"
                      disabled={!selection.length || busy}
                      onPress={() => void act(() => changeMedia(selection, { favorite: true }))}
                    />
                    <OwnerButton
                      compact
                      secondary
                      label="Unfavorite"
                      disabled={!selection.length || busy}
                      onPress={() => void act(() => changeMedia(selection, { favorite: false }))}
                    />
                    <OwnerButton
                      compact
                      secondary
                      label="Add to album"
                      disabled={!selection.length || !scope || busy}
                      onPress={() => setPanel("move")}
                    />
                    <OwnerButton
                      compact
                      secondary
                      label="Allow client access"
                      disabled={!selection.length || busy}
                      onPress={() => void act(() => changeMedia(selection, { allow_client: true }))}
                    />
                    <OwnerButton
                      compact
                      secondary
                      label="Revoke access"
                      disabled={!selection.length || busy}
                      onPress={() =>
                        void act(() => changeMedia(selection, { allow_client: false }))
                      }
                    />
                    <OwnerButton
                      compact
                      destructive
                      label="Delete"
                      disabled={!selection.length || busy}
                      onPress={() => setDeleting(true)}
                    />
                  </>
                )}
              </ScrollView>
            </View>
          )}
          {loading ? (
            <View style={{ padding: 40 }}>
              <ActivityIndicator color={c.brandAccent} />
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(v) => v.key}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={() => void load()}
                  tintColor={c.brandAccent}
                />
              }
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              onEndReachedThreshold={0.6}
              onEndReached={() => void more()}
              ListHeaderComponent={
                <View style={{ gap: 14, padding: 8, marginBottom: 14 }}>
                  {filters.group === "Albums" && (
                    <>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <Txt size={22} bold>
                          Albums
                        </Txt>
                        {owner && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="New album"
                            disabled={!scope || demo}
                            onPress={() => {
                              setEditAlbum(undefined);
                              setPanel("album");
                            }}
                            style={{ padding: 10 }}
                          >
                            <Txt
                              size={16}
                              color={!scope || demo ? c.mutedForeground : c.brandAccent}
                            >
                              New album
                            </Txt>
                          </Pressable>
                        )}
                      </View>
                      {owner && !scope && (
                        <Txt size={14}>
                          Choose a client in Filters to create an album or manage consent.
                        </Txt>
                      )}
                      <FlatList
                        horizontal
                        data={albums}
                        keyExtractor={(a) => a.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12 }}
                        ListEmptyComponent={
                          <Txt size={16} color={c.mutedForeground}>
                            No albums yet. Standalone media appears in the library.
                          </Txt>
                        }
                        renderItem={({ item: a }) => {
                          return (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={"Open album " + a.name}
                              onPress={() =>
                                setFilters((v) => ({ ...v, album: v.album === a.id ? "" : a.id }))
                              }
                              style={{
                                width: 160,
                                gap: 7,
                                padding: 4,
                                borderWidth: 2,
                                borderColor: filters.album === a.id ? c.brandAccent : "transparent",
                                borderRadius: 14,
                              }}
                            >
                              <PrivateAlbumCover path={a.cover_path} />
                              <Txt size={16} bold>
                                {a.name}
                              </Txt>
                              <Txt size={13} color={c.mutedForeground}>
                                {mediaDate(a.display_date)}
                              </Txt>
                            </Pressable>
                          );
                        }}
                      />
                    </>
                  )}
                  {activeAlbum && (
                    <View style={{ gap: 10 }}>
                      <Txt size={22} bold>
                        {activeAlbum.name}
                      </Txt>
                      {!!activeAlbum.description && <Txt>{activeAlbum.description}</Txt>}
                      {owner && (
                        <OwnerButton
                          label="Edit album"
                          secondary
                          compact
                          onPress={() => {
                            setEditAlbum(activeAlbum);
                            setPanel("album");
                          }}
                        />
                      )}
                      <OwnerButton
                        label="Show all media"
                        secondary
                        compact
                        onPress={() => setFilters((v) => ({ ...v, album: "" }))}
                      />
                    </View>
                  )}
                  {owner && !!scope && !demo && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                      <OwnerButton
                        compact
                        secondary
                        label="Media consent"
                        icon="ShieldCheck"
                        onPress={() => setPanel("consent")}
                      />
                      <OwnerButton
                        compact
                        secondary
                        label="Sharing history"
                        icon="History"
                        onPress={() => void openAudit()}
                      />
                    </View>
                  )}
                  {!owner && clientContacts.some((v) => v.granted) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Withdraw media consent"
                      onPress={() => setRevokeConfirm(true)}
                      style={{ paddingVertical: 12 }}
                    >
                      <Txt size={16} color={c.brandAccent}>
                        Withdraw consent & remove my media access
                      </Txt>
                    </Pressable>
                  )}
                </View>
              }
              ListEmptyComponent={
                <OwnerEmpty
                  title={
                    query || filterCount
                      ? "No matching media"
                      : owner
                        ? "A private space for every transformation"
                        : "Your moments, shared with care"
                  }
                  body={
                    query || filterCount
                      ? "Try another search or clear your filters."
                      : owner
                        ? "Add appointment photos, before-and-after pairs or a short video. Everything starts owner-only."
                        : "Photos and videos approved by Lady J will appear here. Only you and the salon owner can view them."
                  }
                  action={
                    query || filterCount ? (
                      <OwnerButton label="Clear filters" secondary onPress={reset} />
                    ) : owner ? (
                      <OwnerButton
                        label="Add first photo or video"
                        icon="ImagePlus"
                        disabled={demo}
                        onPress={() => setPanel("upload")}
                      />
                    ) : undefined
                  }
                />
              }
              renderItem={({ item: row }) => (
                <View style={{ gap: 10, marginBottom: 5 }}>
                  {!!row.title && (
                    <Txt
                      size={22}
                      bold
                      style={{ paddingTop: 20, paddingBottom: 8, paddingHorizontal: 8 }}
                    >
                      {row.title}
                    </Txt>
                  )}
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    {row.items.map((m) => (
                      <View key={m.id} style={{ flex: 1, minWidth: 0 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            m.name +
                            ", " +
                            mediaDate(m.display_date) +
                            (m.allow_client ? ", client access allowed" : "") +
                            (m.status === "uploading" ? ", incomplete upload" : "")
                          }
                          accessibilityState={{ selected: selection.includes(m.id) }}
                          onLongPress={() => {
                            setSelecting(true);
                            toggle(m.id);
                          }}
                          onPress={() => {
                            if (selecting) toggle(m.id);
                            else if (m.status === "ready") setViewer(m.id);
                            else if (owner) {
                              setRetry(m);
                              setPanel("upload");
                            }
                          }}
                          style={{
                            width: "100%",
                            minWidth: 0,
                            borderRadius: 8,
                            overflow: "hidden",
                            borderWidth: selection.includes(m.id) ? 3 : 0,
                            borderColor: c.brandAccent,
                          }}
                        >
                          <MediaThumbnail item={m} style={{ width: "100%", aspectRatio: 1 }} />
                          {selecting && (
                            <View
                              style={{
                                position: "absolute",
                                bottom: 8,
                                right: 8,
                                borderRadius: 99,
                                backgroundColor: c.card,
                                padding: 5,
                              }}
                            >
                              <Icon
                                name={selection.includes(m.id) ? "CircleCheck" : "Circle"}
                                size={22}
                                color={selection.includes(m.id) ? c.brandAccent : c.foreground}
                              />
                            </View>
                          )}
                          {owner && m.allow_client && (
                            <View
                              style={{
                                position: "absolute",
                                top: 6,
                                left: 6,
                                borderRadius: 99,
                                backgroundColor: c.card,
                                padding: 5,
                              }}
                            >
                              <Icon name="UserRoundCheck" size={15} color={c.brandAccent} />
                            </View>
                          )}
                          {m.status === "uploading" && (
                            <View style={{ padding: 6, backgroundColor: c.card }}>
                              <Txt size={12}>Retry upload</Txt>
                            </View>
                          )}
                        </Pressable>
                        {owner && (
                          <MediaAccessToggle
                            item={m}
                            compact
                            disabled={busy || demo}
                            onSaved={load}
                            onConsent={() => {
                              const contact = clients.find((v) => v.id === m.client_id);
                              if (contact) {
                                setConsentClient(contact);
                                setPanel("consent");
                              }
                            }}
                          />
                        )}
                      </View>
                    ))}
                    {Array.from({ length: columns - row.items.length }, (_, index) => (
                      <View key={"space-" + index} style={{ flex: 1 }} />
                    ))}
                  </View>
                </View>
              )}
              ListFooterComponent={
                <View style={{ alignItems: "center", padding: 20, gap: 10 }}>
                  {loadingMore ? (
                    <ActivityIndicator color={c.brandAccent} />
                  ) : items.length < total ? (
                    <OwnerButton label="Load more" secondary onPress={() => void more()} />
                  ) : (
                    !!items.length && (
                      <Txt size={14} color={c.mutedForeground}>
                        {total} {total === 1 ? "item" : "items"} · Private library
                      </Txt>
                    )
                  )}
                  {owner && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clean up deleted media files"
                      disabled={busy || demo}
                      onPress={() =>
                        void act(async () => {
                          await cleanupDeletedMedia();
                          s.notify("Deleted media files cleaned up.");
                        })
                      }
                      style={{ padding: 12 }}
                    >
                      <Txt size={14} color={c.mutedForeground}>
                        Clean up deleted files
                      </Txt>
                    </Pressable>
                  )}
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
      {panel === "filters" && (
        <MediaSheet title="Gallery filters" onClose={sheetClose}>
          {owner && !clientId && (
            <MediaSelect
              label="Client"
              value={scope}
              options={[
                { id: "", name: "All clients" },
                ...clients.map((v) => ({ id: v.id, name: v.full_name })),
              ]}
              onChange={(v) => {
                setScope(v);
                setFilters((f) => ({ ...f, album: "", appointment: "" }));
              }}
            />
          )}
          <Txt size={16} bold>
            Media Type
          </Txt>
          <ChoiceRow
            values={["All", "Photos", "Videos"]}
            value={filters.kind === "All" ? "All" : filters.kind === "photo" ? "Photos" : "Videos"}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                kind: v === "All" ? "All" : v === "Photos" ? "photo" : "video",
              }))
            }
          />
          {owner && (
            <ChoiceRow
              values={["Everything", "Favorites", "Shared with client"]}
              value={
                filters.favorites
                  ? "Favorites"
                  : filters.shared
                    ? "Shared with client"
                    : "Everything"
              }
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  favorites: v === "Favorites",
                  shared: v === "Shared with client",
                }))
              }
            />
          )}
          <MediaSelect
            label="Album"
            value={filters.album}
            options={[
              { id: "", name: "All albums" },
              ...albums.map((a) => ({ id: a.id, name: a.name })),
            ]}
            onChange={(album) => setFilters((v) => ({ ...v, album }))}
          />
          {owner && (
            <>
              <MediaSelect
                label="Appointment"
                value={filters.appointment}
                options={[
                  { id: "", name: "All appointments" },
                  ...appointments
                    .filter(
                      (a) =>
                        a.kind === "appointment" &&
                        (!client?.customer_id || a.customer_id === client.customer_id),
                    )
                    .map((a) => ({
                      id: a.id,
                      name:
                        mediaDate(a.starts_at.slice(0, 10)) +
                        " — " +
                        a.services.map((v) => v.name).join(", "),
                    })),
                ]}
                onChange={(appointment) => setFilters((v) => ({ ...v, appointment }))}
              />
              <MediaSelect
                label="Service"
                value={filters.service}
                options={[
                  { id: "", name: "All services" },
                  ...services.map((v) => ({ id: v.id, name: v.name })),
                ]}
                onChange={(service) => setFilters((v) => ({ ...v, service }))}
              />
            </>
          )}
          <DateField
            label="From Date"
            value={filters.from}
            onChange={(from) => setFilters((v) => ({ ...v, from }))}
            calendar
          />
          <DateField
            label="To Date"
            value={filters.to}
            onChange={(to) => setFilters((v) => ({ ...v, to }))}
            calendar
          />
          <OwnerButton label="Show results" onPress={sheetClose} />
          <OwnerButton label="Clear filters" secondary onPress={reset} />
        </MediaSheet>
      )}
      {panel === "upload" && (
        <MediaUpload
          clients={clients}
          clientId={scope || undefined}
          appointmentId={filters.appointment || undefined}
          albums={albums}
          appointments={appointments}
          services={services}
          retry={retry}
          onClose={sheetClose}
          onDone={(complete) => {
            if (complete) sheetClose();
            void load();
          }}
        />
      )}
      {panel === "album" && (scope || editAlbum) && (
        <AlbumEditor
          clientId={editAlbum?.client_id || scope}
          album={editAlbum}
          onClose={sheetClose}
          onSaved={load}
        />
      )}
      {panel === "consent" && (consentClient || client) && (
        <MediaConsent
          client={(consentClient || client)!}
          consent={consents.find((v) => v.client_id === (consentClient || client)?.id)}
          onClose={sheetClose}
          onSaved={load}
        />
      )}
      {panel === "move" && (
        <MediaSheet title="Move to album" onClose={sheetClose} busy={busy}>
          <MediaSelect
            label="Album"
            value={moveAlbum}
            options={[
              { id: "", name: "No album" },
              ...albums
                .filter((v) => v.client_id === scope)
                .map((v) => ({ id: v.id, name: v.name })),
            ]}
            onChange={setMoveAlbum}
          />
          <OwnerButton
            label="Move selected items"
            busy={busy}
            onPress={() =>
              void act(async () => {
                await changeMedia(selection, { album_id: moveAlbum });
                setPanel(null);
                setSelection([]);
              })
            }
          />
        </MediaSheet>
      )}
      {panel === "audit" && (
        <MediaSheet title="Sharing & consent history" onClose={sheetClose} busy={busy}>
          <Txt size={16}>Most recent 100 events, recorded by the server.</Txt>
          {busy ? (
            <ActivityIndicator color={c.brandAccent} />
          ) : audit.length ? (
            audit.map((a) => (
              <View
                key={a.id}
                style={{ gap: 6, borderBottomWidth: 1, borderColor: c.border, paddingVertical: 12 }}
              >
                <Txt bold>{a.action.replace(/_/g, " ")}</Txt>
                <Txt size={14} color={c.mutedForeground}>
                  {displayDateTime(a.created_at)}
                </Txt>
                {typeof a.details.source === "string" && <Txt size={16}>{a.details.source}</Txt>}
              </View>
            ))
          ) : (
            <Txt>No sharing events yet.</Txt>
          )}
        </MediaSheet>
      )}
      {edit && (
        <MediaEditor
          item={edit}
          albums={albums}
          consent={
            !!clients.find((v) => v.id === edit.client_id)?.customer_id &&
            !!consents.find((v) => v.client_id === edit.client_id)?.granted
          }
          onClose={() => setEdit(undefined)}
          onSaved={load}
        />
      )}
      {viewerIndex >= 0 && !edit && (
        <MediaViewer
          items={ready}
          index={viewerIndex}
          owner={owner}
          accessControl={
            owner ? (
              <MediaAccessToggle
                key={ready[viewerIndex].id}
                item={ready[viewerIndex]}
                disabled={busy || demo}
                onSaved={load}
                onConsent={() => {
                  const contact = clients.find((v) => v.id === ready[viewerIndex].client_id);
                  if (contact) {
                    setViewer(undefined);
                    setConsentClient(contact);
                    setPanel("consent");
                  }
                }}
              />
            ) : undefined
          }
          onClose={() => setViewer(undefined)}
          onIndex={(i) => setViewer(ready[i]?.id)}
          onEdit={() => {
            const m = ready[viewerIndex];
            setEdit(m);
            void db()
              .from("lj_media_consent")
              .select("*")
              .eq("client_id", m.client_id)
              .then((r) => {
                if (!r.error) setConsents(r.data || []);
              });
          }}
          onFavorite={() =>
            void act(() =>
              changeMedia([ready[viewerIndex].id], { favorite: !ready[viewerIndex].favorite }),
            )
          }
        />
      )}
      {compare && selected.length === 2 && (
        <MediaComparison items={selected} onClose={() => setCompare(false)} />
      )}
      {deleting && (
        <ConfirmMedia
          title="Delete selected media?"
          body={
            "Permanently delete " +
            selected.length +
            " items and their stored files? Client access will be removed. This cannot be undone."
          }
          busy={busy}
          onCancel={() => setDeleting(false)}
          onConfirm={() => void removeSelected()}
          error={error}
        />
      )}
      {revokeConfirm && (
        <MediaSheet
          title="Withdraw media consent?"
          onClose={() => setRevokeConfirm(false)}
          busy={busy}
        >
          <Txt>
            This removes access to all your shared photos and videos. The salon keeps its private
            records. Ask the salon if you would also like those records deleted.
          </Txt>
          <OwnerButton
            label="Keep my access"
            secondary
            disabled={busy}
            onPress={() => setRevokeConfirm(false)}
          />
          <OwnerButton
            label="Withdraw consent & access"
            destructive
            busy={busy}
            onPress={() =>
              void act(async () => {
                for (const contact of clientContacts.filter((v) => v.granted))
                  check(
                    await db().rpc("lj_media_set_consent", {
                      p_client: contact.id,
                      p_granted: false,
                      p_source: "",
                    }),
                  );
                setRevokeConfirm(false);
                setViewer(undefined);
              })
            }
          />
        </MediaSheet>
      )}
    </Modal>
  );
}
