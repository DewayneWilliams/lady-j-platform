import { check, db } from "../client";
import { uploadFile } from "./upload";
import type { GalleryFilters, MediaItem, MediaAlbum, PreparedMedia, UploadProgress } from "./types";
export async function listMedia(
  clientId: string | null,
  filters: GalleryFilters,
  offset = 0,
): Promise<{ items: MediaItem[]; total: number }> {
  return check(
    await db().rpc("lj_media_list", { p_client: clientId, p_filters: filters, p_offset: offset }),
  );
}
export async function listAlbums(clientId: string | null): Promise<MediaAlbum[]> {
  return check(await db().rpc("lj_media_album_list", { p_client: clientId }));
}
export async function changeMedia(ids: string[], values: Record<string, unknown>) {
  check(await db().rpc("lj_media_change", { p_ids: ids, p_values: values }));
}
export async function beginMedia(
  clientId: string,
  values: Record<string, unknown>,
): Promise<MediaItem> {
  return check(await db().rpc("lj_media_begin", { p_client: clientId, p_values: values }));
}
export async function uploadMedia(
  item: MediaItem,
  prepared: PreparedMedia,
  progress: UploadProgress,
  signal: AbortSignal,
) {
  const { data, error } = await db().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Sign in as the owner to upload media.");
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Salon connection is not configured.");
  const headers = { Authorization: "Bearer " + data.session.access_token, apikey: key };
  const url = (path: string) =>
    base +
    "/storage/v1/object/lj-client-media/" +
    path.split("/").map(encodeURIComponent).join("/");
  await uploadFile(
    url(item.object_path),
    prepared.uri,
    prepared.mime,
    headers,
    (p) => progress(p * 0.92),
    signal,
  );
  await uploadFile(
    url(item.thumbnail_path),
    prepared.thumbnail,
    "image/jpeg",
    headers,
    (p) => progress(0.92 + p * 0.07),
    signal,
  );
  if (signal.aborted) throw new Error("Upload cancelled.");
  check(
    await db().rpc("lj_media_finish", {
      p_id: item.id,
      p_values: { width: prepared.width, height: prepared.height, duration: prepared.duration },
    }),
  );
  progress(1);
}
export async function signedMedia(path: string) {
  const data = check(await db().storage.from("lj-client-media").createSignedUrl(path, 60));
  if (!data?.signedUrl) throw new Error("This media is unavailable.");
  return data.signedUrl;
}
export async function deleteMedia(items: MediaItem[]) {
  await changeMedia(
    items.map((m) => m.id),
    { delete: true },
  );
  const paths = items.flatMap((m) => [m.object_path, m.thumbnail_path]);
  check(await db().storage.from("lj-client-media").remove(paths));
  check(await db().rpc("lj_media_cleanup_done", { p_ids: items.map((m) => m.id) }));
}
export async function cleanupDeletedMedia() {
  // Tombstones survive network failures so storage removal is repeatable after reopening the gallery.
  let removed = 0;
  for (;;) {
    const rows = check(
      await db()
        .from("lj_client_media")
        .select("id,object_path,thumbnail_path")
        .not("deleted_at", "is", null)
        .is("storage_deleted_at", null)
        .limit(100),
    );
    if (!rows?.length) return removed;
    check(
      await db()
        .storage.from("lj-client-media")
        .remove(rows.flatMap((m) => [String(m.object_path), String(m.thumbnail_path)])),
    );
    check(await db().rpc("lj_media_cleanup_done", { p_ids: rows.map((m) => m.id) }));
    removed += rows.length;
  }
}
