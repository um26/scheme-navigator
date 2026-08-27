// Fails when a selector-ready locale would fall back to English for any known UI key.
// Run this after the offline UI translation pass. It is deliberately separate from
// the translator so normal Vercel builds never need a model or translation API.
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

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
  generatedModule,
] = await Promise.all([
  importPlainJs("lib/i18n/locales/en.js"),
  importPlainJs("lib/i18n/locales/hi.js"),
  importPlainJs("lib/i18n/locales/te.js"),
  importPlainJs("lib/i18n/locales/ta.js"),
  importPlainJs("lib/i18n/extras.js"),
  importPlainJs("lib/i18n/conditionMessages.js"),
  importPlainJs("lib/i18n/generated.js"),
]);

const english = {
  ...en,
  ...(extrasModule.EXTRA_MESSAGES?.en || {}),
  ...(conditionModule.CONDITION_MESSAGES?.en || {}),
};
const expectedKeys = Object.keys(english).sort();
const generated = generatedModule.GENERATED_DICTIONARIES || {};
const ready = generatedModule.GENERATED_READY_LOCALES || [];
const manual = { hi, te, ta };

let failed = false;
for (const locale of ready) {
  const effective = {
    ...(generated[locale] || {}),
    ...(manual[locale] || {}),
    ...(extrasModule.EXTRA_MESSAGES?.[locale] || {}),
    ...(conditionModule.CONDITION_MESSAGES?.[locale] || {}),
  };
  const missing = expectedKeys.filter((key) => typeof effective[key] !== "string" || !effective[key].trim());
  if (missing.length) {
    failed = true;
    console.error(`[i18n] ${locale}: ${missing.length} missing UI translation(s)`);
    console.error(`       ${missing.slice(0, 18).join(", ")}${missing.length > 18 ? ", …" : ""}`);
  }
}

if (failed) {
  console.error("\n[i18n] UI coverage incomplete. Run:");
  console.error("python scripts/translate-catalog-fast.py --locales all --tier ui --batch-size 64 --beams 1");
  process.exit(1);
}

console.log(`[i18n] coverage OK: ${ready.length} selector-ready locale(s), ${expectedKeys.length} UI keys each.`);
