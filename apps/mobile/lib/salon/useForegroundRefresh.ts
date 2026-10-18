import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
export function useForegroundRefresh(refresh: () => Promise<void>, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    let busy = false;
    let active = true;
    const run = () => {
      if (!active || busy || Date.now() - last < 5000 || AppState.currentState === "background")
        return;
      if (
        Platform.OS === "web" &&
        typeof globalThis.document !== "undefined" &&
        globalThis.document.visibilityState === "hidden"
      )
        return;
      last = Date.now();
      busy = true;
      void latest
        .current()
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    };
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") run();
    });
    const timer = setInterval(run, 60000);
    if (Platform.OS === "web" && typeof globalThis.window !== "undefined") {
      globalThis.window.addEventListener("focus", run);
      globalThis.window.addEventListener("online", run);
      globalThis.document.addEventListener("visibilitychange", run);
    }
    return () => {
      active = false;
      state.remove();
      clearInterval(timer);
      if (Platform.OS === "web" && typeof globalThis.window !== "undefined") {
        globalThis.window.removeEventListener("focus", run);
        globalThis.window.removeEventListener("online", run);
        globalThis.document.removeEventListener("visibilitychange", run);
      }
    };
  }, [enabled]);
}
