import React from "react";
import { mapEmbedUrl } from "@/lib/salon/location";

export default function SalonMap() {
  // createElement keeps Draftbit's JSX source marker from being forwarded to the DOM iframe.
  return React.createElement("iframe", {
    title: "Lady J Salon & Day Spa on Google Maps",
    src: mapEmbedUrl,
    loading: "lazy",
    allowFullScreen: true,
    referrerPolicy: "no-referrer-when-downgrade",
    style: { width: "100%", height: "100%", border: 0, display: "block" },
  });
}
