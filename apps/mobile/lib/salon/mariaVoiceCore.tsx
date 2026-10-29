import React, { useCallback, useMemo, useRef } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react-native";
import type { MariaVoice, MariaVoiceOptions } from "./mariaVoice.types";

export const MariaVoiceProvider = ({ children }: { children: React.ReactNode }) => (
  <ConversationProvider>{children}</ConversationProvider>
);

/** ElevenLabs Conversational AI session (WebRTC). Shared by web and native builds. */
export function useMariaVoice(options: MariaVoiceOptions, beforeStart?: () => Promise<void>): MariaVoice {
  const latest = useRef(options);
  latest.current = options;
  const conversation = useConversation({
    onDisconnect: () => latest.current.onEnded(),
    onError: (message: string) => latest.current.onError(message || "Voice connection problem."),
    onMessage: ({ source, message }: { source: string; message: string }) => {
      if (!message) return;
      if (source === "user") latest.current.onUserText(message);
      else latest.current.onAgentText(message);
    },
  });
  const connected = conversation.status === "connected";
  // Control functions from the SDK are stable; keep ours stable too so effects that clean up
  // the session (unmount/background) never end a live conversation on an ordinary re-render.
  const controls = useRef(conversation);
  controls.current = conversation;
  const live = useRef(connected);
  live.current = connected;
  const speakingRef = useRef(conversation.isSpeaking);
  speakingRef.current = conversation.isSpeaking;

  const start = useCallback(
    async (token: string) => {
      await beforeStart?.();
      const clientTools = Object.fromEntries(
        Object.keys(latest.current.tools).map((name) => [
          name,
          (params: Record<string, unknown>) => latest.current.tools[name](params ?? {}),
        ]),
      );
      controls.current.startSession({ conversationToken: token, connectionType: "webrtc", clientTools });
    },
    [beforeStart],
  );
  const end = useCallback(() => {
    if (controls.current.status !== "disconnected") controls.current.endSession();
  }, []);
  const say = useCallback((text: string) => {
    if (live.current) controls.current.sendUserMessage(text);
  }, []);
  const level = useCallback(() => {
    try {
      return speakingRef.current ? controls.current.getOutputVolume() : controls.current.getInputVolume();
    } catch {
      return 0;
    }
  }, []);

  return useMemo(
    () => ({ supported: true, connected, speaking: conversation.isSpeaking, start, end, say, level }),
    [connected, conversation.isSpeaking, start, end, say, level],
  );
}
