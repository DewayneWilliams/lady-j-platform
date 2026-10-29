import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import {
  describeChange,
  mariaChat,
  mariaConfirm,
  mariaDecline,
  mariaTool,
  mariaVoiceToken,
  spokenDecision,
  type MariaProposal,
  type MariaTurn,
} from "@/lib/salon/mariaAgent";
import { MARIA_TOOL_NAMES } from "@/lib/salon/mariaTools";
import { MariaVoiceProvider, useMariaVoice } from "@/lib/salon/mariaVoice";
import { Card, Field, Txt, useColors } from "../ui";
import MariaRing, { type VoiceState } from "./MariaRing";
import { OwnerButton, OwnerText } from "./OwnerUI";
import type { MariaPanelProps } from "./MariaPanel";

const description =
  "Maria is your executive assistant. She reads your live salon records and can prepare changes, but nothing is saved until you approve it.";

export default function MariaLivePanel(props: MariaPanelProps) {
  return (
    <MariaVoiceProvider>
      <LiveConversation {...props} />
    </MariaVoiceProvider>
  );
}

type Line = { id: number; who: "you" | "maria"; text: string };

function LiveConversation({ onChanged }: MariaPanelProps) {
  const c = useColors();
  const [status, setStatus] = useState("Tap the ring to talk, or type below");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<MariaProposal | null>(null);
  const [deciding, setDeciding] = useState(false);
  const pendingRef = useRef<MariaProposal | null>(null);
  const deciding_ = useRef(false);
  const history = useRef<MariaTurn[]>([]);
  const lineId = useRef(0);
  const [level, setLevel] = useState(0);
  const voiceRef = useRef<ReturnType<typeof useMariaVoice> | null>(null);

  const add = useCallback((who: Line["who"], text: string) => {
    setLines((current) => [...current.slice(-5), { id: ++lineId.current, who, text }]);
  }, []);
  const setProposal = useCallback((value: MariaProposal | null) => {
    pendingRef.current = value;
    setPending(value);
  }, []);

  const decide = useCallback(
    async (proposal: MariaProposal, approve: boolean) => {
      if (deciding_.current) return;
      deciding_.current = true;
      setDeciding(true);
      try {
        const result = approve
          ? await mariaConfirm(proposal)
          : { ...(await mariaDecline(proposal)), summary: proposal.summary };
        const note = describeChange(result as Parameters<typeof describeChange>[0]);
        setProposal(null);
        add("maria", note);
        history.current.push({
          role: "user",
          content: `[APP RESULT] ${JSON.stringify(result).slice(0, 1500)}`,
        });
        if (approve && result.status !== "failed") onChanged?.();
        // Maria reports the verified outcome aloud (or the app does, in text mode).
        voiceRef.current?.connected &&
          voiceRef.current.say(
            `[APP RESULT] Jaycee ${approve ? "approved" : "declined"} the change. Result: ${JSON.stringify(result).slice(0, 1500)}. Tell her the outcome in one or two sentences.`,
          );
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "That change could not be completed.";
        setProposal(null);
        add("maria", message);
        voiceRef.current?.connected &&
          voiceRef.current.say(`[APP RESULT] The change did not go through: ${message}`);
      } finally {
        deciding_.current = false;
        setDeciding(false);
      }
    },
    [add, onChanged, setProposal],
  );

  const tools = useRef<Record<string, (params: Record<string, unknown>) => Promise<string>>>({});
  tools.current = Object.fromEntries(
    MARIA_TOOL_NAMES.map((name) => [
      name,
      async (params: Record<string, unknown>) => {
        try {
          const out = await mariaTool(name, params);
          if (out.proposal) setProposal(out.proposal);
          return JSON.stringify(out.result).slice(0, 12000);
        } catch (reason) {
          return JSON.stringify({
            error: reason instanceof Error ? reason.message : "Tool failed",
          });
        }
      },
    ]),
  );

  const voice = useMariaVoice({
    tools: tools.current,
    onUserText: (text) => {
      add("you", text);
      const proposal = pendingRef.current;
      if (!proposal) return;
      const decision = spokenDecision(text);
      if (decision === "confirm") void decide(proposal, true);
      else if (decision === "decline") void decide(proposal, false);
    },
    onAgentText: (text) => add("maria", text),
    onError: (message) => {
      setConnecting(false);
      setError(true);
      setStatus(message);
    },
    onEnded: () => {
      setConnecting(false);
      setStatus("Conversation ended · Tap the ring to talk again");
    },
  });
  voiceRef.current = voice;

  const state: VoiceState = error
    ? "error"
    : busy || connecting
      ? "processing"
      : voice.connected
        ? voice.speaking
          ? "speaking"
          : "listening"
        : "idle";

  useEffect(() => {
    if (!voice.connected) {
      setLevel(0);
      return;
    }
    const timer = setInterval(() => setLevel(Math.round(voice.level() * 100)), 120);
    return () => clearInterval(timer);
  }, [voice]);

  useEffect(() => {
    if (state === "listening") setStatus("Listening · Tap to stop");
    else if (state === "speaking") setStatus("Maria is speaking");
  }, [state]);

  const endVoice = voice.end;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") endVoice();
    });
    return () => {
      subscription.remove();
      endVoice();
    };
  }, [endVoice]);

  const toggle = async () => {
    if (voice.connected || connecting) {
      voice.end();
      setConnecting(false);
      return;
    }
    setError(false);
    if (!voice.supported) {
      setError(true);
      setStatus(voice.unavailableReason ?? "Live voice is not available here.");
      return;
    }
    setConnecting(true);
    setStatus("Connecting to Maria…");
    try {
      const { token } = await mariaVoiceToken();
      await voice.start(token);
    } catch (reason) {
      setConnecting(false);
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "Maria could not connect.");
    }
  };

  useEffect(() => {
    if (voice.connected) setConnecting(false);
  }, [voice.connected]);

  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setError(false);
    add("you", message);
    const proposal = pendingRef.current;
    const decision = proposal ? spokenDecision(message) : "none";
    if (proposal && decision !== "none") {
      await decide(proposal, decision === "confirm");
      return;
    }
    setBusy(true);
    setStatus("Maria is thinking…");
    try {
      const out = await mariaChat(message, history.current);
      history.current.push({ role: "user", content: message }, { role: "assistant", content: out.reply });
      history.current = history.current.slice(-20);
      add("maria", out.reply);
      if (out.proposals.length) setProposal(out.proposals[out.proposals.length - 1]);
      setStatus("Tap the ring to talk, or type below");
    } catch (reason) {
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "Maria is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MariaRing
      state={state}
      volume={level}
      status={status}
      description={description}
      onPress={() => void toggle()}
    >
      {pending && (
        <Card
          style={{ alignSelf: "stretch", gap: 10, borderColor: c.brandAccent, borderWidth: 2 }}
        >
          <Txt size={14} bold color={c.brandAccent}>
            Waiting for your approval
          </Txt>
          <OwnerText>{pending.summary}</OwnerText>
          <OwnerText size={16} muted>
            Nothing has changed yet. Tap Approve or say “confirm”.
          </OwnerText>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <OwnerButton
                label="Not Now"
                secondary
                fill
                disabled={deciding}
                onPress={() => void decide(pending, false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <OwnerButton
                label="Approve"
                accent
                fill
                busy={deciding}
                disabled={deciding}
                onPress={() => void decide(pending, true)}
              />
            </View>
          </View>
        </Card>
      )}
      {lines.length > 0 && (
        <View style={{ alignSelf: "stretch", gap: 8 }} accessibilityLiveRegion="polite">
          {lines.map((line) => (
            <View
              key={line.id}
              style={{
                alignSelf: line.who === "you" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                backgroundColor: line.who === "you" ? c.primary : c.card,
                borderColor: c.border,
                borderWidth: line.who === "you" ? 0 : 1,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Txt size={16} color={line.who === "you" ? c.primaryForeground : c.foreground}>
                {line.text}
              </Txt>
            </View>
          ))}
        </View>
      )}
      <View style={{ alignSelf: "stretch" }}>
        <Field
          label="Type to Maria"
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about today’s schedule, stock, clients…"
        />
        <OwnerButton
          label="Send"
          icon="Send"
          fill
          busy={busy}
          disabled={busy || !draft.trim()}
          onPress={() => void send()}
        />
      </View>
    </MariaRing>
  );
}
