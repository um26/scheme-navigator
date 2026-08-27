// Export the effective English UI source plus explicit existing locale translations.
// The translator uses the second file as a seed, so unchanged manual/generated copy
// is preserved and only missing/changed English strings go through IndicTrans2.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORK = path.join(ROOT, ".translation-work");
const EN_OUT = path.join(WORK, "ui-en.json");
const EXISTING_OUT = path.join(WORK, "ui-existing.json");

async function importPlainJs(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(url);
}

const [
  { default: en },
  { default: hi },
  { default: te },
  { default: ta },
  extrasModule,
  conditionModule,
  releaseModule,
  generatedModule,
] = await Promise.all([
  importPlainJs("lib/i18n/locales/en.js"),
  importPlainJs("lib/i18n/locales/hi.js"),
  importPlainJs("lib/i18n/locales/te.js"),
  importPlainJs("lib/i18n/locales/ta.js"),
  importPlainJs("lib/i18n/extras.js"),
  importPlainJs("lib/i18n/conditionMessages.js"),
  importPlainJs("lib/i18n/releaseMessages.js"),
  importPlainJs("lib/i18n/generated.js"),
]);

const english = {
  ...en,
  ...(extrasModule.EXTRA_MESSAGES?.en || {}),
  ...(conditionModule.CONDITION_MESSAGES?.en || {}),
  ...(releaseModule.RELEASE_MESSAGES?.en || {}),
};

const manual = { hi, te, ta };
const generated = generatedModule.GENERATED_DICTIONARIES || {};
const ready = generatedModule.GENERATED_READY_LOCALES || [];
const localeSet = new Set([...ready, ...Object.keys(manual)]);
const existing = {};

for (const locale of localeSet) {
  existing[locale] = {
    ...(manual[locale] || {}),
    ...(extrasModule.EXTRA_MESSAGES?.[locale] || {}),
    ...(conditionModule.CONDITION_MESSAGES?.[locale] || {}),
    ...(releaseModule.RELEASE_MESSAGES?.[locale] || {}),
    ...(generated[locale] || {}),
  };
}

mkdirSync(WORK, { recursive: true });
writeFileSync(EN_OUT, JSON.stringify(english, null, 2));
writeFileSync(EXISTING_OUT, JSON.stringify(existing, null, 2));

console.log(`[i18n] exported ${Object.keys(english).length} English UI messages -> ${EN_OUT}`);
console.log(`[i18n] exported explicit translation seeds for ${Object.keys(existing).length} locale(s) -> ${EXISTING_OUT}`);
