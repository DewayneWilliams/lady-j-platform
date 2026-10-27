import Constants, { ExecutionEnvironment } from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import type { MariaSpeechRecognitionModule } from "./mariaSpeechRecognition.types";

let cached: MariaSpeechRecognitionModule | null | undefined;

export function getMariaSpeechRecognition(): MariaSpeechRecognitionModule | null {
  if (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo"
  ) {
    return null;
  }
  if (cached !== undefined) return cached;
  if (!requireOptionalNativeModule<MariaSpeechRecognitionModule>("ExpoSpeechRecognition")) {
    cached = null;
    return cached;
  }
  try {
    // Loaded only in a custom development or published build that includes the config plugin.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const value = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: MariaSpeechRecognitionModule;
    };
    cached = value.ExpoSpeechRecognitionModule ?? null;
  } catch {
    cached = null;
  }
  return cached;
}
