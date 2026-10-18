export type ClientLanguage = "en" | "es";

export const clientNavigationCopy = {
  en: {
    booking: "BOOK YOUR APPOINTMENT",
    language: "Header and menu language",
    languageScope: "Header and navigation only. Page content is in English.",
    theme: "Toggle color theme",
    home: "Home",
    services: "Services",
    products: "Products",
    workshops: "Workshops",
    contact: "Contact",
    account: "Account",
  },
  es: {
    booking: "RESERVA TU CITA",
    language: "Idioma del encabezado y menú",
    languageScope: "Solo el encabezado y la navegación. El contenido está en inglés.",
    theme: "Cambiar tema de color",
    home: "Inicio",
    services: "Servicios",
    products: "Productos",
    workshops: "Talleres",
    contact: "Contacto",
    account: "Cuenta",
  },
} as const;
