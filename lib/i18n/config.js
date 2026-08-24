// Central locale registry.
//
// English is kept as the canonical data/rule-engine language. The 22 Eighth
// Schedule languages are display locales only; their machine-generated UI/scheme
// translations are activated after an offline translation pack is committed.
import { GENERATED_READY_LOCALES } from "./generated";

export const ALL_LOCALES = [
  { code: "en",  name: "English",    native: "English",       dir: "ltr", indic: null },
  { code: "as",  name: "Assamese",   native: "অসমীয়া",       dir: "ltr", indic: "asm_Beng" },
  { code: "bn",  name: "Bengali",    native: "বাংলা",         dir: "ltr", indic: "ben_Beng" },
  { code: "brx", name: "Bodo",       native: "बड़ो",          dir: "ltr", indic: "brx_Deva" },
  { code: "doi", name: "Dogri",      native: "डोगरी",         dir: "ltr", indic: "doi_Deva" },
  { code: "gu",  name: "Gujarati",   native: "ગુજરાતી",       dir: "ltr", indic: "guj_Gujr" },
  { code: "hi",  name: "Hindi",      native: "हिन्दी",        dir: "ltr", indic: "hin_Deva" },
  { code: "kn",  name: "Kannada",    native: "ಕನ್ನಡ",         dir: "ltr", indic: "kan_Knda" },
  { code: "ks",  name: "Kashmiri",   native: "کٲشُر",         dir: "rtl", indic: "kas_Arab" },
  { code: "gom", name: "Konkani",    native: "कोंकणी",        dir: "ltr", indic: "gom_Deva" },
  { code: "mai", name: "Maithili",   native: "मैथिली",        dir: "ltr", indic: "mai_Deva" },
  { code: "ml",  name: "Malayalam",  native: "മലയാളം",       dir: "ltr", indic: "mal_Mlym" },
  { code: "mni", name: "Manipuri",   native: "ꯃꯤꯇꯩ ꯂꯣꯟ",   dir: "ltr", indic: "mni_Mtei" },
  { code: "mr",  name: "Marathi",    native: "मराठी",         dir: "ltr", indic: "mar_Deva" },
  { code: "ne",  name: "Nepali",     native: "नेपाली",        dir: "ltr", indic: "npi_Deva" },
  { code: "or",  name: "Odia",       native: "ଓଡ଼ିଆ",         dir: "ltr", indic: "ory_Orya" },
  { code: "pa",  name: "Punjabi",    native: "ਪੰਜਾਬੀ",        dir: "ltr", indic: "pan_Guru" },
  { code: "sa",  name: "Sanskrit",   native: "संस्कृतम्",     dir: "ltr", indic: "san_Deva" },
  { code: "sat", name: "Santali",    native: "ᱥᱟᱱᱛᱟᱲᱤ",      dir: "ltr", indic: "sat_Olck" },
  { code: "sd",  name: "Sindhi",     native: "سنڌي",          dir: "rtl", indic: "snd_Arab" },
  { code: "ta",  name: "Tamil",      native: "தமிழ்",         dir: "ltr", indic: "tam_Taml" },
  { code: "te",  name: "Telugu",     native: "తెలుగు",        dir: "ltr", indic: "tel_Telu" },
  { code: "ur",  name: "Urdu",       native: "اردو",           dir: "rtl", indic: "urd_Arab" },
];

const CURRENT_UI_LOCALES = new Set(["en", "hi", "te", "ta"]);
const generatedReady = new Set(GENERATED_READY_LOCALES);

// Keep the four already-shipped UI locales available while the full catalog packs
// are being generated. The remaining scheduled languages appear automatically once
// scripts/translate-catalog.py marks their pack ready.
export const LOCALES = ALL_LOCALES.filter(
  (locale) => CURRENT_UI_LOCALES.has(locale.code) || generatedReady.has(locale.code)
);

export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "sn_lang";

export function isValidLocale(code) {
  return LOCALES.some((l) => l.code === code);
}

export function localeName(code) {
  return ALL_LOCALES.find((l) => l.code === code)?.name || "English";
}

export function localeDirection(code) {
  return ALL_LOCALES.find((l) => l.code === code)?.dir || "ltr";
}

export function indicTransCode(code) {
  return ALL_LOCALES.find((l) => l.code === code)?.indic || null;
}
