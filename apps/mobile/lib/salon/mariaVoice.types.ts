export type MariaVoiceOptions = {
  /** Client tools the voice agent may call; each runs in the owner's signed-in session. */
  tools: Record<string, (params: Record<string, unknown>) => Promise<string>>;
  onUserText: (text: string) => void;
  onAgentText: (text: string) => void;
  onError: (message: string) => void;
  onEnded: () => void;
};

export type MariaVoice = {
  supported: boolean;
  unavailableReason?: string;
  connected: boolean;
  speaking: boolean;
  start: (token: string) => Promise<void>;
  end: () => void;
  /** Sends text to the agent as if it had been said; used to report verified results. */
  say: (text: string) => void;
  level: () => number;
};
