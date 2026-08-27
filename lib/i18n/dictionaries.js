import en from "./locales/en";
import hi from "./locales/hi";
import te from "./locales/te";
import ta from "./locales/ta";
import { EXTRA_MESSAGES } from "./extras";
import { CONDITION_MESSAGES } from "./conditionMessages";
import { RELEASE_MESSAGES } from "./releaseMessages";
import { GENERATED_DICTIONARIES } from "./generated";

const MANUAL_DICTIONARIES = { en, hi, te, ta };

const ENGLISH = {
  ...en,
  ...(EXTRA_MESSAGES.en || {}),
  ...(CONDITION_MESSAGES.en || {}),
  ...(RELEASE_MESSAGES.en || {}),
};

// Manual hi/te/ta dictionaries are retained as high-quality seeds. The generated
// dictionary is merged last so a changed English source string can receive a fresh
// machine translation without a stale manual value overriding it forever.
const localeSet = new Set([
  ...Object.keys(MANUAL_DICTIONARIES),
  ...Object.keys(GENERATED_DICTIONARIES),
]);

const DICTIONARIES = Object.fromEntries(
  Array.from(localeSet).map((locale) => [
    locale,
    {
      ...ENGLISH,
      ...(MANUAL_DICTIONARIES[locale] || {}),
      ...(EXTRA_MESSAGES[locale] || {}),
      ...(CONDITION_MESSAGES[locale] || {}),
      ...(RELEASE_MESSAGES[locale] || {}),
      ...(GENERATED_DICTIONARIES[locale] || {}),
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
