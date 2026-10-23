import { useEffect, useMemo } from "react";
import { AppState, Platform } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { createCelebrationAudio } from "./celebrationAudio";
import { useSalon } from "./SalonProvider";

export const serviceSoundOptions = [
  ["royal_fanfare", "Royal Fanfare"],
  ["luxury_chime", "Luxury Chime"],
  ["crystal_sparkle", "Crystal Sparkle"],
  ["piano_melody", "Piano Melody"],
  ["celebration", "Celebration"],
  ["classic_bell", "Classic Bell"],
  ["silent", "Silent"],
] as const;
export const paymentSoundOptions = [
  ["cha_ching", "Cha-Ching"],
  ["luxury_cash_register", "Luxury Cash Register"],
  ["golden_coins", "Golden Coins"],
  ["jackpot", "Jackpot"],
  ["elegant_success_chime", "Elegant Success Chime"],
  ["digital_payment", "Digital Payment"],
  ["silent", "Silent"],
] as const;

/** Bundled, preloaded sounds. System mute and output routing remain device-controlled. */
export function useCelebrationSounds() {
  const s = useSalon();
  const options = { downloadFirst: Platform.OS !== "web" };
  const royal = useAudioPlayer(require("@/assets/salon/sounds/royal-victory-fanfare.mp3"), options);
  const cash = useAudioPlayer(require("@/assets/salon/sounds/cash-ching.wav"), options);
  const luxuryChime = useAudioPlayer(require("@/assets/salon/sounds/luxury-chime.wav"), options);
  const crystal = useAudioPlayer(require("@/assets/salon/sounds/crystal-sparkle.wav"), options);
  const piano = useAudioPlayer(require("@/assets/salon/sounds/piano-melody.wav"), options);
  const celebration = useAudioPlayer(require("@/assets/salon/sounds/celebration.wav"), options);
  const bell = useAudioPlayer(require("@/assets/salon/sounds/classic-bell.wav"), options);
  const cashRegister = useAudioPlayer(
    require("@/assets/salon/sounds/luxury-cash-register.wav"),
    options,
  );
  const coins = useAudioPlayer(require("@/assets/salon/sounds/golden-coins.wav"), options);
  const jackpot = useAudioPlayer(require("@/assets/salon/sounds/jackpot.wav"), options);
  const success = useAudioPlayer(
    require("@/assets/salon/sounds/elegant-success-chime.wav"),
    options,
  );
  const digital = useAudioPlayer(require("@/assets/salon/sounds/digital-payment.wav"), options);
  const serviceId = s.settings?.service_completion_sound || "royal_fanfare";
  const paymentId = s.settings?.payment_confirmation_sound || "cha_ching";
  const serviceVolume = (s.settings?.service_completion_volume ?? 90) / 100;
  const paymentVolume = (s.settings?.payment_confirmation_volume ?? 65) / 100;
  const sounds = useMemo(
    () =>
      createCelebrationAudio(
        {
          royal_fanfare: royal,
          cha_ching: cash,
          luxury_chime: luxuryChime,
          crystal_sparkle: crystal,
          piano_melody: piano,
          celebration,
          classic_bell: bell,
          luxury_cash_register: cashRegister,
          golden_coins: coins,
          jackpot,
          elegant_success_chime: success,
          digital_payment: digital,
        },
        Platform.OS === "web",
        {
          service: { id: serviceId, volume: serviceVolume },
          payment: { id: paymentId, volume: paymentVolume },
        },
      ),
    [
      royal,
      cash,
      luxuryChime,
      crystal,
      piano,
      celebration,
      bell,
      cashRegister,
      coins,
      jackpot,
      success,
      digital,
      serviceId,
      paymentId,
      serviceVolume,
      paymentVolume,
    ],
  );
  useEffect(() => {
    sounds.activate();
    sounds.setActive(!["background", "inactive"].includes(AppState.currentState));
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
    }).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) =>
      sounds.setActive(state === "active"),
    );
    return () => {
      subscription.remove();
      sounds.dispose();
    };
  }, [sounds]);
  return sounds;
}

export type CelebrationSounds = ReturnType<typeof useCelebrationSounds>;
