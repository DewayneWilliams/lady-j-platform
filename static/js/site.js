"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const mobile = document.getElementById("mobileNav");
  if (toggle && mobile) {
    toggle.addEventListener("click", () => {
      const open = mobile.classList.toggle("open");
      mobile.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Theme from system if user chose system
  const root = document.documentElement;
  if (root.dataset.theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "dark" : "light";
  }
});
