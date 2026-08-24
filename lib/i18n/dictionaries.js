import en from "./locales/en";
import hi from "./locales/hi";
import te from "./locales/te";
import ta from "./locales/ta";
import { EXTRA_MESSAGES } from "./extras";
import { GENERATED_DICTIONARIES } from "./generated";

const BASE_DICTIONARIES = {
  en,
  hi,
  te,
  ta,
  ...GENERATED_DICTIONARIES,
};

const ENGLISH = { ...en, ...(EXTRA_MESSAGES.en || {}) };

// Merge English first so a missing generated/manual key never leaks a raw key.
// Existing hand-reviewed hi/te/ta messages win over any generated copy.
const DICTIONARIES = Object.fromEntries(
  Object.entries(BASE_DICTIONARIES).map(([locale, dict]) => [
    locale,
    {
      ...ENGLISH,
      ...(GENERATED_DICTIONARIES[locale] || {}),
      ...dict,
      ...(EXTRA_MESSAGES[locale] || {}),
    },
  ])
);

export function getDictionary(locale) {
  return DICTIONARIES[locale] || ENGLISH;
}

export function translate(locale, key, vars) {
  const dict = getDictionary(locale);
  let text = dict[key] ?? ENGLISH[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
