"use strict";

const I18N = {
  en: {
    lang_label: "Language",
    nav_home: "Home",
    nav_about: "About",
    nav_products: "Products",
    nav_workshops: "Workshops",
    nav_book: "Book Appointment",
    nav_book_short: "Book",
    nav_contact: "Contact",
    nav_menu: "Menu",
    nav_account: "Account",
    nav_signin: "Sign in",
    nav_signout: "Sign out",
    nav_services: "Services",
    step_service: "Service",
    step_datetime: "Date & Time",
    step_confirm: "Confirm",
    step_one: "Step 1",
    select_service: "Select Your Service",
    select_service_help: "Choose a category, then tap services to add.",
    inspire_title: "Need guidance? Upload an inspiration photo",
    inspire_photo: "Inspiration photo",
    inspire_btn: "Get suggestions",
    inspire_note: "Estimates only — a Lady J professional will confirm.",
    selected_hint: "Selected services stay with your booking.",
    continue: "Continue",
    group_hair: "Hair",
    group_skin: "Skin",
    group_nails: "Nails",
    group_lashes: "Lashes",
    services_title: "Our Menu",
    services_help: "Hair, skin, nails, and lashes — open a category to browse.",
  },
  es: {
    lang_label: "Idioma",
    nav_home: "Inicio",
    nav_about: "Nosotros",
    nav_products: "Productos",
    nav_workshops: "Talleres",
    nav_book: "Reservar Cita",
    nav_book_short: "Reservar",
    nav_contact: "Contacto",
    nav_menu: "Menú",
    nav_account: "Cuenta",
    nav_signin: "Entrar",
    nav_signout: "Salir",
    nav_services: "Servicios",
    step_service: "Servicio",
    step_datetime: "Fecha y Hora",
    step_confirm: "Confirmar",
    step_one: "Paso 1",
    select_service: "Elige tu servicio",
    select_service_help: "Abre una categoría y toca para agregar.",
    inspire_title: "¿Necesitas guía? Sube una foto de inspiración",
    inspire_photo: "Foto de inspiración",
    inspire_btn: "Obtener sugerencias",
    inspire_note: "Solo estimaciones — un profesional de Lady J confirmará.",
    selected_hint: "Los servicios seleccionados quedan en tu reserva.",
    continue: "Continuar",
    group_hair: "Cabello",
    group_skin: "Piel",
    group_nails: "Uñas",
    group_lashes: "Pestañas",
    services_title: "Nuestro menú",
    services_help: "Cabello, piel, uñas y pestañas — abre una categoría.",
  },
};

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const active = btn.getAttribute("data-lang") === lang;
    btn.setAttribute("aria-pressed", String(active));
  });
  try {
    localStorage.setItem("ladyj_lang", lang);
  } catch (_) {
    /* ignore */
  }
}

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

  const root = document.documentElement;
  if (root.dataset.theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "dark" : "light";
  }

  let lang = "en";
  try {
    lang = localStorage.getItem("ladyj_lang") || "en";
  } catch (_) {
    lang = "en";
  }
  applyLanguage(lang);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLanguage(btn.getAttribute("data-lang") || "en");
    });
  });
});
