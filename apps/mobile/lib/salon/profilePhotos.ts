import { check, db } from "./client";
import { uploadFile } from "./media/upload";

export const PROFILE_PHOTO_BUCKET = "lj-profile-photos";

export async function signedProfilePhoto(path?: string | null) {
  if (!path) return null;
  const result = check(await db().storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(path, 600));
  return result?.signedUrl || null;
}

export async function uploadProfilePhoto(path: string, uri: string) {
  const { data, error } = await db().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Sign in to update a profile photo.");
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Salon connection is not configured.");
  const url =
    base +
    "/storage/v1/object/" +
    PROFILE_PHOTO_BUCKET +
    "/" +
    path.split("/").map(encodeURIComponent).join("/");
  await uploadFile(
    url,
    uri,
    "image/jpeg",
    { Authorization: "Bearer " + data.session.access_token, apikey: key },
    () => undefined,
    new AbortController().signal,
  );
}

export async function removeProfilePhotoObject(path?: string | null) {
  if (path) check(await db().storage.from(PROFILE_PHOTO_BUCKET).remove([path]));
}
