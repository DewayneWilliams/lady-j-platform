import React from "react";
import { createPortal } from "react-dom";
import { useWebPortal } from "@/components/WebPortalContext";
export default function CelebrationPortal({ children }: { children: React.ReactNode }) {
  const { container } = useWebPortal();
  return container ? createPortal(children, container) : null;
}
