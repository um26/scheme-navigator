import en from "./locales/en";
import hi from "./locales/hi";
import te from "./locales/te";
import ta from "./locales/ta";

const DICTIONARIES = { en, hi, te, ta };

// Falls back to English for any key missing in a non-English dictionary — keeps a
// half-translated locale from ever showing a raw key instead of readable text.
export function getDictionary(locale) {
  return DICTIONARIES[locale] || DICTIONARIES.en;
}

// t(locale, key, vars) — simple {placeholder} interpolation, no external i18n
// library needed for a dictionary this size.
export function translate(locale, key, vars) {
  const dict = getDictionary(locale);
  let text = dict[key] ?? DICTIONARIES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
