export type CelebrationSound = "service" | "payment";
export interface CelebrationPlayer {
  id: string;
  isLoaded: boolean;
  volume: number;
  loop: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
}

/** One audible celebration at a time, even when asynchronous seeks finish out of order. */
export function createCelebrationAudio(
  players: Record<string, CelebrationPlayer>,
  web: boolean,
  selections: Record<CelebrationSound, { id: string; volume: number }> = {
    service: { id: "service", volume: 0.9 },
    payment: { id: "payment", volume: 0.65 },
  },
) {
  const played = new Set<string>();
  const primed = new Set<string>();
  let generation = 0;
  let disposed = false;
  let active = true;
  const pauseAll = () => {
    for (const player of Object.values(players)) {
      try {
        player.pause();
      } catch {
        // Audio interruptions must never interrupt a successful salon operation.
      }
    }
  };
  const stop = () => {
    generation += 1;
    pauseAll();
  };
  return {
    activate() {
      disposed = false;
    },
    setActive(value: boolean) {
      active = value;
      if (!value) stop();
    },
    prepare(sound: CelebrationSound) {
      const player = players[selections[sound].id];
      if (!player) return;
      if (disposed || !active || !web || primed.has(player.id)) return;
      try {
        player.loop = false;
        player.volume = 0;
        // Called synchronously in the confirmation tap to unlock this web media element.
        player.play();
        primed.add(player.id);
      } catch {
        // A blocked or unavailable device stays silent; the operation remains available.
      }
    },
    play(sound: CelebrationSound, eventId: string) {
      const key = `${sound}:${eventId}`;
      if (disposed || !active || played.has(key)) return;
      played.add(key);
      stop();
      const request = generation;
      const choice = selections[sound];
      if (choice.id === "silent") return;
      const player = players[choice.id];
      if (!player) return;
      void (async () => {
        try {
          // Bundled sources preload on mount; allow a slow device to finish decoding.
          const deadline = Date.now() + 5000;
          while (!player.isLoaded && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            if (disposed || request !== generation) return;
          }
          if (!player.isLoaded || disposed || request !== generation) return;
          await player.seekTo(0);
          if (disposed || request !== generation) return;
          player.loop = false;
          player.volume = choice.volume;
          player.play();
        } catch {
          // Device mute, unavailable outputs and interrupted playback never fail completion.
        }
      })();
    },
    preview(id: string, volume: number) {
      if (disposed || !active || id === "silent") return;
      const player = players[id];
      if (!player) return;
      stop();
      const request = generation;
      void (async () => {
        try {
          await player.seekTo(0);
          if (disposed || request !== generation) return;
          player.loop = false;
          player.volume = Math.max(0, Math.min(1, volume));
          player.play();
        } catch {
          // Preview failures never block settings changes.
        }
      })();
    },
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}
