export type ClientLanguage = "en" | "es" | "fr" | "pt" | "de" | "it" | "nl";

export const supportedLanguages: { code: ClientLanguage; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];

const en = {
  booking: "BOOK YOUR APPOINTMENT",
  language: "Language",
  languageScope:
    "Choose your preferred language. English is used when a translation is unavailable.",
  searchLanguages: "Search languages",
  theme: "Toggle color theme",
  home: "Home",
  services: "Services",
  products: "Products",
  workshops: "Workshops",
  contact: "Contact",
  account: "Account",
};

export const clientNavigationCopy: Record<ClientLanguage, typeof en> = {
  en,
  es: {
    booking: "RESERVA TU CITA",
    language: "Idioma",
    languageScope: "Elige tu idioma. Se usa inglés cuando no hay traducción disponible.",
    searchLanguages: "Buscar idiomas",
    theme: "Cambiar tema de color",
    home: "Inicio",
    services: "Servicios",
    products: "Productos",
    workshops: "Talleres",
    contact: "Contacto",
    account: "Cuenta",
  },
  fr: {
    booking: "RÉSERVEZ VOTRE RENDEZ-VOUS",
    language: "Langue",
    languageScope: "Choisissez votre langue. L’anglais est utilisé si une traduction manque.",
    searchLanguages: "Rechercher une langue",
    theme: "Changer le thème",
    home: "Accueil",
    services: "Services",
    products: "Produits",
    workshops: "Ateliers",
    contact: "Contact",
    account: "Compte",
  },
  pt: {
    booking: "MARQUE O SEU HORÁRIO",
    language: "Idioma",
    languageScope: "Escolha o idioma. O inglês é usado quando uma tradução não está disponível.",
    searchLanguages: "Pesquisar idiomas",
    theme: "Alterar tema",
    home: "Início",
    services: "Serviços",
    products: "Produtos",
    workshops: "Workshops",
    contact: "Contato",
    account: "Conta",
  },
  de: { ...en, language: "Sprache", searchLanguages: "Sprachen suchen" },
  it: { ...en, language: "Lingua", searchLanguages: "Cerca lingue" },
  nl: { ...en, language: "Taal", searchLanguages: "Talen zoeken" },
};
