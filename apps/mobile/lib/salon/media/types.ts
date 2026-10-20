import { displayDate } from "../dates";
export type MediaItem = {
  id: string;
  client_id: string;
  appointment_id: string | null;
  service_id: string | null;
  album_id: string | null;
  name: string;
  caption: string;
  notes?: string;
  tags: string[];
  kind: "photo" | "video";
  mime_type: string;
  object_path: string;
  thumbnail_path: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
  display_date: string;
  favorite?: boolean;
  allow_client?: boolean;
  status: "uploading" | "ready";
  album_name: string | null;
  service_name: string | null;
  appointment_date: string | null;
  group_label: string;
};
export type MediaAlbum = {
  id: string;
  client_id: string;
  name: string;
  description: string;
  display_date: string;
  cover_id: string | null;
  cover_path?: string | null;
};
export type MediaConsent = {
  client_id: string;
  granted: boolean;
  source: string;
  recorded_at: string;
};
export type GalleryFilters = {
  query: string;
  kind: "All" | "photo" | "video";
  favorites: boolean;
  shared: boolean;
  sort: "asc" | "desc";
  group: "Dates" | "Albums" | "Appointments" | "Services";
  album: string;
  appointment: string;
  service: string;
  from: string;
  to: string;
};
export const initialFilters: GalleryFilters = {
  query: "",
  kind: "All",
  favorites: false,
  shared: false,
  sort: "desc",
  group: "Dates",
  album: "",
  appointment: "",
  service: "",
  from: "",
  to: "",
};
export type PreparedMedia = {
  uri: string;
  thumbnail: string;
  mime: string;
  width: number;
  height: number;
  duration: number | null;
  warning?: string;
  cleanup: () => void;
};
export type UploadProgress = (fraction: number) => void;
export function mediaDate(date: string) {
  return displayDate(date);
}
