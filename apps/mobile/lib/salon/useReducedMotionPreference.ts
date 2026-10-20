import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        if (active) setReduced(true);
      });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
