import React, { useEffect } from "react";
export default function DeviceViewport({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Correct the viewport at runtime, including phones with cached older HTML.
    const root = globalThis.document.getElementById("root");
    if (!root) return;
    const original = root.getAttribute("style");
    const update = () => {
      const height = globalThis.window.visualViewport?.height ?? globalThis.window.innerHeight;
      Object.assign(root.style, {
        display: "flex",
        width: "100%",
        height: height + "px",
        minHeight: "0",
        overflow: "hidden",
      });
    };
    update();
    globalThis.window.addEventListener("resize", update);
    globalThis.window.addEventListener("pageshow", update);
    globalThis.window.visualViewport?.addEventListener("resize", update);
    return () => {
      globalThis.window.removeEventListener("resize", update);
      globalThis.window.removeEventListener("pageshow", update);
      globalThis.window.visualViewport?.removeEventListener("resize", update);
      if (original === null) root.removeAttribute("style");
      else root.setAttribute("style", original);
    };
  }, []);
  return <>{children}</>;
}
