import React from "react";
import type { Appointment, Client } from "@/lib/salon/types";
import MariaLivePanel from "./MariaLivePanel";
import MariaRing from "./MariaRing";

export type MariaPanelProps = {
  demo: boolean;
  appointments: Appointment[];
  clients: Client[];
  onAction: (action: {
    type: "tab" | "business" | "calendar" | "client" | "appointment";
    value?: string;
  }) => void;
  /** Called after Maria's confirmed change is saved, so the dashboard reloads live data. */
  onChanged?: () => void;
};

const lockedDescription =
  "Maria talks with the verified salon owner using live salon records. Sign in with Jaycee’s owner account to start. There is no scripted or demo voice.";

// Maria is never simulated: without a verified owner session the ring stays inactive.
export default function MariaPanel(props: MariaPanelProps) {
  if (!props.demo) return <MariaLivePanel {...props} />;
  return (
    <MariaRing
      state="idle"
      volume={0}
      status="Owner sign-in required"
      description={lockedDescription}
      onPress={() => undefined}
    />
  );
}
