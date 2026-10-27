import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type { MariaSpeechRecognitionModule } from "./mariaSpeechRecognition.types";

export function getMariaSpeechRecognition(): MariaSpeechRecognitionModule | null {
  return ExpoSpeechRecognitionModule as unknown as MariaSpeechRecognitionModule;
}
