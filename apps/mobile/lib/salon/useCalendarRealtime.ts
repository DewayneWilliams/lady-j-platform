import { useEffect, useRef, useState } from "react";
import { db } from "./client";
let channelSequence = 0;
export function useCalendarRealtime(refresh: () => Promise<void>, enabled: boolean) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const [status, setStatus] = useState("offline");
  useEffect(() => {
    if (!enabled) return;
    let active = true,
      busy = false,
      dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const drain = async () => {
      if (!active || busy) return;
      busy = true;
      dirty = false;
      try {
        await latest.current();
      } catch {
        /* The screen exposes its load error and retry action. */
      } finally {
        busy = false;
        if (active && dirty)
          timer = setTimeout(() => {
            void drain();
          }, 150);
      }
    };
    const changed = () => {
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void drain();
      }, 150);
    };
    const client = db();
    setStatus("connecting");
    const channel = client
      .channel("salon-calendar-" + ++channelSequence)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lj_calendar_availability" },
        changed,
      )
      .subscribe((next) => {
        if (!active) return;
        setStatus(next === "SUBSCRIBED" ? "live" : "reconnecting");
        if (next === "SUBSCRIBED") changed();
      });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [enabled]);
  return enabled ? status : "offline";
}
