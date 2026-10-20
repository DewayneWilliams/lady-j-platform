import { useEffect, useMemo } from "react";
import { AppState, Platform } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { createCelebrationAudio } from "./celebrationAudio";

/** Local, preloaded sounds. System volume, mute and output routing remain device-controlled. */
export function useCelebrationSounds() {
  const options = { downloadFirst: Platform.OS !== "web" };
  const fanfare = useAudioPlayer(
    require("@/assets/salon/sounds/royal-victory-fanfare.mp3"),
    options,
  );
  const cash = useAudioPlayer(require("@/assets/salon/sounds/cash-ching.wav"), options);
  const sounds = useMemo(
    () => createCelebrationAudio({ service: fanfare, payment: cash }, Platform.OS === "web"),
    [fanfare, cash],
  );
  useEffect(() => {
    sounds.activate();
    sounds.setActive(
      AppState.currentState !== "background" && AppState.currentState !== "inactive",
    );
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
    }).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      sounds.setActive(state === "active");
    });
    return () => {
      subscription.remove();
      sounds.dispose();
    };
  }, [sounds]);
  // useAudioPlayer releases its managed players on unmount.
  return sounds;
}
