export type MariaSpeechResultEvent = {
  isFinal: boolean;
  results: Array<{ transcript?: string }>;
};

export type MariaSpeechErrorEvent = { error: string };
export type MariaSpeechVolumeEvent = { value: number };
export type MariaSpeechSubscription = { remove: () => void };

export type MariaSpeechRecognitionModule = {
  abort: () => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  addListener: (
    event: "result" | "error" | "volumechange",
    listener: (event: never) => void,
  ) => MariaSpeechSubscription;
};
