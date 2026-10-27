import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import * as Speech from "expo-speech";
import Icon from "@/lib/icons/LucideIcon";
import type { Appointment, Client } from "@/lib/salon/types";
import { mariaOpening, mariaReply, type MariaMemory } from "@/lib/salon/mariaConversation";
import { getMariaSpeechRecognition } from "@/lib/salon/mariaSpeechRecognition";
import type {
  MariaSpeechErrorEvent,
  MariaSpeechResultEvent,
  MariaSpeechVolumeEvent,
} from "@/lib/salon/mariaSpeechRecognition.types";
import { useReducedMotionPreference } from "@/lib/salon/useReducedMotionPreference";
import { Card, Txt, useColors } from "../ui";
import { OwnerText } from "./OwnerUI";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";
const stateColor: Record<VoiceState, string> = {
  idle: "#94A3B8",
  listening: "#10B981",
  processing: "#7C3AED",
  speaking: "#A855F7",
  error: "#F87171",
};
const description =
  "Maria is a private, local demonstration of a future voice companion for Lady J. She can discuss the isolated demo diary, business opportunities and wellness without changing real salon records.";

export default function MariaPanel({
  demo,
  appointments,
  clients,
  onAction,
}: {
  demo: boolean;
  appointments: Appointment[];
  clients: Client[];
  onAction: (action: {
    type: "tab" | "business" | "calendar" | "client" | "appointment";
    value?: string;
  }) => void;
}) {
  const c = useColors();
  const reducedMotion = useReducedMotionPreference();
  const [state, setState] = useState<VoiceState>("idle");
  const [status, setStatus] = useState("DEMO · Tap the ring when you’re ready");
  const [volume, setVolume] = useState(0);
  const active = useRef(false);
  const speaking = useRef(false);
  const processing = useRef(false);
  const lastFinal = useRef({ transcript: "", at: 0 });
  const memory = useRef<MariaMemory>({ turn: 0 });
  const motion = useRef(new Animated.Value(0)).current;
  const conversationRows = useMemo(
    () => (demo ? appointments.filter((item) => item.id.startsWith("demo-")) : appointments),
    [appointments, demo],
  );

  const stop = useCallback(async (message = "DEMO · Conversation paused") => {
    active.current = false;
    speaking.current = false;
    processing.current = false;
    getMariaSpeechRecognition()?.abort();
    await Speech.stop();
    setState("idle");
    setStatus(message);
  }, []);

  const listen = useCallback(async () => {
    if (!active.current || speaking.current) return;
    try {
      const recognition = getMariaSpeechRecognition();
      if (!recognition || !recognition.isRecognitionAvailable()) {
        throw new Error(
          Platform.OS === "web"
            ? "Voice recognition is unavailable in this browser."
            : "Voice listening needs a Draftbit native development or published build.",
        );
      }
      const permission = await recognition.requestPermissionsAsync();
      if (!permission.granted) throw new Error("Microphone and speech permission are required.");
      setState("listening");
      setStatus("Listening · Tap to stop");
      recognition.start({
        lang: "en-TT",
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        contextualStrings: ["Jaycee", "Lady J", "VIP", "appointment", "Trinidad"],
        iosVoiceProcessingEnabled: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
    } catch (reason) {
      active.current = false;
      setState("error");
      setStatus(reason instanceof Error ? reason.message : "Voice recognition is unavailable.");
    }
  }, []);

  const speak = useCallback(
    async (text: string, shouldEnd = false) => {
      getMariaSpeechRecognition()?.abort();
      await Speech.stop();
      speaking.current = true;
      setState("speaking");
      setStatus("Maria is speaking · Tap to interrupt");
      const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      const preferred =
        voices.find((voice) => /^en-TT$/i.test(voice.language)) ||
        voices.find(
          (voice) =>
            /^en-(GB|AU|IE|US)$/i.test(voice.language) &&
            /samantha|ava|karen|moira|serena|victoria|female/i.test(voice.name),
        ) ||
        voices.find((voice) => /^en/i.test(voice.language));
      Speech.speak(text, {
        language: preferred?.language || "en-US",
        voice: preferred?.identifier,
        pitch: 1,
        rate: 0.95,
        useApplicationAudioSession: false,
        onDone: () => {
          speaking.current = false;
          if (shouldEnd) {
            active.current = false;
            setState("idle");
            setStatus("DEMO · Conversation complete");
          } else void listen();
        },
        onStopped: () => {
          speaking.current = false;
        },
        onError: () => {
          speaking.current = false;
          active.current = false;
          setState("error");
          setStatus("Speech was interrupted. Tap to try again.");
        },
      });
    },
    [listen],
  );

  useEffect(() => {
    const recognition = getMariaSpeechRecognition();
    if (!recognition) return;
    const result = recognition.addListener("result", ((event: MariaSpeechResultEvent) => {
      const transcript = event.results[0]?.transcript?.trim();
      if (!transcript) return;
      setStatus(event.isFinal ? "Thinking…" : `Listening · ${transcript}`);
      if (!event.isFinal) return;
      const now = Date.now();
      if (
        processing.current ||
        speaking.current ||
        (lastFinal.current.transcript === transcript && now - lastFinal.current.at < 2500)
      ) {
        return;
      }
      processing.current = true;
      lastFinal.current = { transcript, at: now };
      setState("processing");
      const lower = transcript.toLowerCase();
      const day = /tomorrow/.test(lower) ? new Date(Date.now() + 86400000) : new Date();
      const dayValue = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Port_of_Spain",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(day);
      let actionReply = "";
      if (/\b(go home|owner home|today screen|go back)\b/.test(lower)) {
        onAction({ type: "tab", value: "Today" });
        actionReply = "I opened your Owner home.";
      } else if (/\b(report|reports)\b/.test(lower)) {
        onAction({ type: "business", value: "Reports" });
        actionReply = "I opened Business Reports.";
      } else if (/\b(backbar|low[- ]stock|inventory)\b/.test(lower)) {
        onAction({ type: "business", value: "Backbar" });
        actionReply = "I opened Backbar Management so you can review stock and alerts.";
      } else if (/\b(revenue|outstanding balance|balances)\b/.test(lower)) {
        onAction({
          type: "business",
          value: /outstanding|balance/.test(lower) ? "Balances" : "Revenue",
        });
        actionReply = "I opened the requested financial view. I did not change any payments.";
      } else if (/\b(vip|approval request)\b/.test(lower)) {
        onAction({ type: "calendar", value: dayValue });
        const count = conversationRows.filter((v) => v.approval_status === "pending").length;
        actionReply = `I opened the calendar. There ${count === 1 ? "is" : "are"} ${count} pending VIP request${count === 1 ? "" : "s"}; approval still requires your confirmation.`;
      } else if (/\b(availability|available time|open time|open slot)\b/.test(lower)) {
        onAction({ type: "calendar", value: dayValue });
        actionReply = `I opened ${/tomorrow/.test(lower) ? "tomorrow’s" : "today’s"} calendar so you can review live availability. I did not reserve a time.`;
      } else if (
        /\b(calendar|today'?s appointments?|tomorrow'?s appointments?|schedule)\b/.test(lower)
      ) {
        onAction({ type: "calendar", value: dayValue });
        actionReply = `I opened the calendar for ${/tomorrow/.test(lower) ? "tomorrow" : "today"}.`;
      } else if (/\b(open|find|show)\b.*\bappointment\b/.test(lower)) {
        const matchedClient = clients.find((client) =>
          client.full_name
            .toLowerCase()
            .split(/\s+/)
            .some((part) => part.length > 2 && lower.includes(part)),
        );
        const match = matchedClient
          ? conversationRows
              .filter(
                (item) =>
                  item.kind === "appointment" &&
                  (item.client_id === matchedClient.id ||
                    (!!matchedClient.customer_id &&
                      item.customer_id === matchedClient.customer_id)),
              )
              .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))[0]
          : undefined;
        if (match) {
          onAction({ type: "appointment", value: match.id });
          actionReply = `I opened ${matchedClient?.full_name}'s most recent appointment. Any change still requires your confirmation.`;
        } else {
          onAction({ type: "calendar", value: dayValue });
          actionReply = "I opened the calendar. I could not safely match that appointment by name.";
        }
      } else if (/\b(add|start|new) appointment\b/.test(lower)) {
        onAction({ type: "appointment" });
        actionReply =
          "I opened a new appointment with the available defaults. Review every detail before saving.";
      } else if (/\b(prepare|draft|write)\b.*\b(message|text|whatsapp)\b/.test(lower)) {
        const match = clients.find((client) =>
          client.full_name
            .toLowerCase()
            .split(/\s+/)
            .some((part) => part.length > 2 && lower.includes(part)),
        );
        if (match) {
          onAction({ type: "client", value: match.id });
          actionReply = `I opened ${match.full_name}'s profile. Tap Message Client to review a prepared message before sending it.`;
        } else {
          onAction({ type: "tab", value: "Clients" });
          actionReply = "I opened Clients. Say the client’s name so I can prepare the correct contact view.";
        }
      } else if (/\b(client|contact)\b/.test(lower)) {
        const match = clients.find(
          (client) =>
            lower.includes(client.full_name.toLowerCase()) ||
            client.full_name
              .toLowerCase()
              .split(/\s+/)
              .some((part) => part.length > 2 && lower.includes(part)),
        );
        if (match) {
          onAction({ type: "client", value: match.id });
          actionReply = `I opened ${match.full_name}'s profile. Private notes remain visible only to the Owner.`;
        } else {
          onAction({ type: "tab", value: "Clients" });
          actionReply = "I opened Clients. Say the client’s name to open a profile.";
        }
      }
      const response = actionReply
        ? {
            text: actionReply,
            memory: { ...memory.current, turn: memory.current.turn + 1 },
            end: false,
          }
        : mariaReply(transcript, memory.current, conversationRows);
      memory.current = response.memory;
      setTimeout(() => {
        processing.current = false;
        void speak(response.text, response.end);
      }, 400);
    }) as (event: never) => void);
    const volumeChange = recognition.addListener("volumechange", ((event: MariaSpeechVolumeEvent) =>
      setVolume(Math.max(0, event.value))) as (event: never) => void);
    const error = recognition.addListener("error", ((event: MariaSpeechErrorEvent) => {
      if (event.error === "aborted") return;
      active.current = false;
      speaking.current = false;
      processing.current = false;
      setState("error");
      setStatus(
        event.error === "no-speech" || event.error === "speech-timeout"
          ? "I didn’t hear anything. Tap to try again."
          : "Voice listening is unavailable. Check microphone permission and try again.",
      );
    }) as (event: never) => void);
    return () => {
      result.remove();
      volumeChange.remove();
      error.remove();
    };
  }, [clients, conversationRows, onAction, speak]);

  useEffect(() => {
    if (reducedMotion !== false) {
      motion.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: state === "error" ? 400 : state === "processing" ? 900 : 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: state === "error" ? 400 : state === "processing" ? 900 : 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      { iterations: state === "error" ? 2 : -1 },
    );
    animation.start();
    return () => animation.stop();
  }, [motion, reducedMotion, state]);

  useEffect(() => () => void stop(), [stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && (active.current || speaking.current)) {
        void stop("DEMO · Conversation paused while the app was in the background");
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const toggle = () => {
    if (active.current || speaking.current) {
      if (speaking.current) {
        void Speech.stop().then(() => {
          speaking.current = false;
          active.current = true;
          void listen();
        });
      } else void stop();
      return;
    }
    active.current = true;
    memory.current = { turn: 0 };
    void speak(mariaOpening(), false);
  };
  const scale =
    state === "speaking"
      ? 1 + Math.min(volume / 80, 0.06)
      : motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, state === "listening" ? 1.09 : 1.05],
        });

  return (
    <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <Card style={{ gap: 16, alignItems: "center", paddingVertical: 30, width: "100%" }}>
        <View style={{ padding: 14 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderWidth: state === "processing" ? 4 : 3,
                borderColor: stateColor[state],
                borderRadius: 104,
                opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                transform: [
                  { scale },
                  {
                    rotate:
                      state === "processing"
                        ? motion.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          })
                        : "0deg",
                  },
                ],
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === "idle" ? "Start Maria voice conversation" : "Stop Maria"}
            accessibilityHint="Maria speaks first and listens only while the conversation is active"
            onPress={toggle}
            style={({ pressed }) => ({
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: c.primary,
              borderWidth: 3,
              borderColor: stateColor[state],
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Icon
              name={
                state === "processing"
                  ? "LoaderCircle"
                  : state === "speaking"
                    ? "AudioLines"
                    : "Mic"
              }
              size={54}
              color={c.primaryForeground}
            />
          </Pressable>
        </View>
        <OwnerText size={28} bold>
          Talk to Maria
        </OwnerText>
        <Txt
          accessibilityLiveRegion="polite"
          size={15}
          bold
          color={stateColor[state]}
          style={{ textAlign: "center" }}
        >
          {status}
        </Txt>
        <View style={{ maxWidth: 610 }}>
          <OwnerText>{description}</OwnerText>
        </View>
      </Card>
    </View>
  );
}
