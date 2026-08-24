// lib/i18n/config.js
//
// Central locale registry. Adding a new language (more Indian regional languages,
// or foreign languages later) is: (1) add one entry here, (2) add one file in
// lib/i18n/locales/. Everything else — the switcher, the server/client dictionary
// lookups, the Groq explanation language — reads from this list automatically.

export const LOCALES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "sn_lang";

export function isValidLocale(code) {
  return LOCALES.some((l) => l.code === code);
}

export function localeName(code) {
  return LOCALES.find((l) => l.code === code)?.name || "English";
}
