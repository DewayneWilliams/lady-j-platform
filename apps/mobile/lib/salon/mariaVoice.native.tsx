import { PermissionsAndroid, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { MariaVoice, MariaVoiceOptions } from "./mariaVoice.types";
import * as fallback from "./mariaVoice";

type Core = {
  MariaVoiceProvider: typeof fallback.MariaVoiceProvider;
  useMariaVoice: (options: MariaVoiceOptions, beforeStart?: () => Promise<void>) => MariaVoice;
};

// WebRTC native modules exist only in a Draftbit development or published build, never in Expo Go.
let core: Core | null = null;
const expoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";
if (!expoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    core = require("./mariaVoiceCore") as Core;
  } catch {
    core = null;
  }
}

async function requestMicrophone() {
  if (Platform.OS !== "android") return;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result !== PermissionsAndroid.RESULTS.GRANTED)
    throw new Error("Microphone permission is required to talk with Maria.");
}

export const MariaVoiceProvider = core ? core.MariaVoiceProvider : fallback.MariaVoiceProvider;
export function useMariaVoice(options: MariaVoiceOptions): MariaVoice {
  // The platform is fixed for the app's lifetime, so this branch never changes between renders.
  if (core) return core.useMariaVoice(options, requestMicrophone);
  const stub = fallback.useMariaVoice(options);
  return {
    ...stub,
    unavailableReason:
      "Live voice needs a Draftbit development or published build; Expo Go cannot run it. You can type to Maria meanwhile.",
  };
}
