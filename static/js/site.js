"use strict";

const originalText = new WeakMap();
const originalPlaceholder = new WeakMap();
let languageRequest = 0;

function translatableTextEntries() {
  const entries = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        const value = node.nodeValue || "";
        if (
          !parent ||
          parent.closest("[data-no-translate], script, style, noscript, svg") ||
          !/[A-Za-z]/.test(value)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!originalText.has(node)) {
      originalText.set(node, node.nodeValue || "");
    }
    const source = originalText.get(node);
    const text = source.trim();
    if (text) entries.push({ node, source, text });
  }
  return entries;
}

function translatablePlaceholders() {
  return [...document.querySelectorAll("input[placeholder], textarea[placeholder]")]
    .filter((element) => !element.closest("[data-no-translate]"))
    .map((element) => {
      if (!originalPlaceholder.has(element)) {
        originalPlaceholder.set(element, element.getAttribute("placeholder") || "");
      }
      return { element, text: originalPlaceholder.get(element) };
    })
    .filter((entry) => entry.text);
}

async function translateBatch(texts, targetLanguage) {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_language: targetLanguage, texts }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Translation is temporarily unavailable");
  }
  return result.translations;
}

async function applyLanguage(language, name) {
  const status = document.getElementById("languageStatus");
  const code = document.getElementById("currentLanguageCode");
  const requestId = ++languageRequest;
  const textEntries = translatableTextEntries();
  const placeholderEntries = translatablePlaceholders();

  if (language === "en") {
    textEntries.forEach(({ node, source }) => {
      node.nodeValue = source;
    });
    placeholderEntries.forEach(({ element, text }) => {
      element.setAttribute("placeholder", text);
    });
    document.documentElement.lang = "en";
    code.textContent = "EN";
    status.textContent = "";
  } else {
    status.textContent = `Translating to ${name}…`;
    const unique = [
      ...new Set([
        ...textEntries.map((entry) => entry.text),
        ...placeholderEntries.map((entry) => entry.text),
      ]),
    ];
    const translations = [];
    for (let index = 0; index < unique.length; index += 30) {
      translations.push(
        ...(await translateBatch(unique.slice(index, index + 30), language))
      );
    }
    if (requestId !== languageRequest) return;
    const translated = new Map(unique.map((text, index) => [text, translations[index]]));
    textEntries.forEach(({ node, source, text }) => {
      node.nodeValue = source.replace(text, translated.get(text) || text);
    });
    placeholderEntries.forEach(({ element, text }) => {
      element.setAttribute("placeholder", translated.get(text) || text);
    });
    document.documentElement.lang = language;
    code.textContent = language.toUpperCase();
    status.textContent = `${name} selected`;
  }

  document.querySelectorAll(".language-option").forEach((button) => {
    button.setAttribute(
      "aria-selected",
      String(button.getAttribute("data-lang") === language)
    );
  });
  try {
    localStorage.setItem("ladyj_lang", language);
    localStorage.setItem("ladyj_lang_name", name);
  } catch (_) {
    /* Storage can be unavailable in private browser contexts. */
  }
}

async function initializeLanguagePicker() {
  const picker = document.getElementById("languagePicker");
  if (!picker) return;
  const trigger = document.getElementById("languageTrigger");
  const panel = document.getElementById("languagePanel");
  const close = document.getElementById("languageClose");
  const search = document.getElementById("languageSearch");
  const list = document.getElementById("languageList");
  const status = document.getElementById("languageStatus");
  let languages = [{ code: "en", name: "English" }];

  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) search.focus();
  };

  trigger.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => {
    setOpen(false);
    trigger.focus();
  });
  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });

  const selectLanguage = async (language, name) => {
    status.textContent = "";
    try {
      await applyLanguage(language, name);
      setOpen(false);
    } catch (error) {
      status.textContent = error.message;
    }
  };

  picker.querySelectorAll(".language-featured .language-option").forEach((button) => {
    button.addEventListener("click", () => {
      selectLanguage(
        button.getAttribute("data-lang"),
        button.querySelector("small").textContent
      );
    });
  });

  const renderLanguages = (query = "") => {
    const normalized = query.trim().toLowerCase();
    list.replaceChildren();
    languages
      .filter(
        ({ code, name }) =>
          !["es", "fr", "zh", "hi"].includes(code) &&
          (!normalized ||
            name.toLowerCase().includes(normalized) ||
            code.toLowerCase().includes(normalized))
      )
      .forEach(({ code, name }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "language-option";
        button.setAttribute("role", "option");
        button.setAttribute("data-lang", code);
        const label = document.createElement("span");
        label.textContent = name;
        const abbreviation = document.createElement("small");
        abbreviation.textContent = code.toUpperCase();
        button.append(label, abbreviation);
        button.addEventListener("click", () => selectLanguage(code, name));
        list.append(button);
      });
  };

  search.addEventListener("input", () => renderLanguages(search.value));
  try {
    const response = await fetch("/api/languages");
    if (!response.ok) throw new Error();
    languages = (await response.json()).languages;
    renderLanguages();
  } catch (_) {
    status.textContent = "Language list is temporarily unavailable";
  }

  let savedLanguage = "en";
  let savedName = "English";
  try {
    savedLanguage = localStorage.getItem("ladyj_lang") || "en";
    savedName = localStorage.getItem("ladyj_lang_name") || "English";
  } catch (_) {
    /* Storage can be unavailable in private browser contexts. */
  }
  if (savedLanguage !== "en") {
    try {
      await applyLanguage(savedLanguage, savedName);
    } catch (_) {
      await applyLanguage("en", "English");
    }
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

  initializeLanguagePicker();
});
