import type { ImageSource } from "expo-image";

const TEST_CLIENT_PATH = "demo-profile://test-client";
const CONTACT_PREFIX = "demo-profile://contact/";

const testClientSource = require("@/assets/salon/demo/test-client-profile.png") as ImageSource;
const contactAtlasSource = require("@/assets/salon/demo/contact-avatar-atlas.png") as ImageSource;

export type DemoProfilePhoto =
  | { source: ImageSource; atlasIndex?: undefined }
  | { source: ImageSource; atlasIndex: number };

export const demoTestClientPhotoPath = TEST_CLIENT_PATH;
export const demoContactPhotoPath = (index: number) => `${CONTACT_PREFIX}${index % 16}`;

export function demoProfilePhoto(path?: string | null): DemoProfilePhoto | null {
  if (path === TEST_CLIENT_PATH) return { source: testClientSource };
  if (!path?.startsWith(CONTACT_PREFIX)) return null;
  const index = Number(path.slice(CONTACT_PREFIX.length));
  if (!Number.isInteger(index) || index < 0 || index > 15) return null;
  return { source: contactAtlasSource, atlasIndex: index };
}
