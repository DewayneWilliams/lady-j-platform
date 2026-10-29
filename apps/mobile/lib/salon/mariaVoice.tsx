import type React from "react";
import type { MariaVoice, MariaVoiceOptions } from "./mariaVoice.types";

// Fallback used where live voice cannot run; platform files provide the real implementation.
export const MariaVoiceProvider = ({ children }: { children: React.ReactNode }) => children;
export function useMariaVoice(_options: MariaVoiceOptions): MariaVoice {
  return {
    supported: false,
    unavailableReason: "Live voice is not available on this device.",
    connected: false,
    speaking: false,
    start: async () => {},
    end: () => {},
    say: () => {},
    level: () => 0,
  };
}
