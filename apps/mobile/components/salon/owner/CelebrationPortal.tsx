import React from "react";
import { Portal } from "@rn-primitives/portal";
export default function CelebrationPortal({ children }: { children: React.ReactNode }) {
  return <Portal name="owner-completion-celebration">{children}</Portal>;
}
