// Release gate for UI i18n.
// Fails on missing/stale translations, placeholder corruption, missing t() keys, or
// an incomplete 22-language selector. No model/API is used here, so Vercel can run it.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "public/i18n/ui-manifest.json");
const EXPECTED_LOCALES = [
  "as", "bn", "brx", "doi", "gom", "gu", "hi", "kn", "ks", "mai", "ml",
  "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta", "te", "ur",
];

async function importPlainJs(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(url);
}

function sourceHash(text) {
  return createHash("sha256").update(`ui-v1|${text}`).digest("hex");
}

function placeholders(text) {
  return Array.from(String(text || "").matchAll(/\{[A-Za-z0-9_]+\}/g), (m) => m[0]).sort();
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
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
const expectedKeys = Object.keys(english).sort();
const expectedKeySet = new Set(expectedKeys);
const generated = generatedModule.GENERATED_DICTIONARIES || {};
const ready = generatedModule.GENERATED_READY_LOCALES || [];
const manual = { hi, te, ta };

let failed = false;

const missingReady = EXPECTED_LOCALES.filter((locale) => !ready.includes(locale));
const unexpectedReady = ready.filter((locale) => !EXPECTED_LOCALES.includes(locale));
if (missingReady.length || unexpectedReady.length) {
  failed = true;
  if (missingReady.length) console.error(`[i18n] selector missing locale(s): ${missingReady.join(", ")}`);
  if (unexpectedReady.length) console.error(`[i18n] selector has unexpected locale(s): ${unexpectedReady.join(", ")}`);
}

let manifest = null;
if (existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch (error) {
    failed = true;
    console.error(`[i18n] invalid UI freshness manifest: ${error.message}`);
  }
} else {
  failed = true;
  console.error("[i18n] UI freshness manifest is missing.");
}

for (const locale of EXPECTED_LOCALES) {
  const effective = {
    ...(manual[locale] || {}),
    ...(extrasModule.EXTRA_MESSAGES?.[locale] || {}),
    ...(conditionModule.CONDITION_MESSAGES?.[locale] || {}),
    ...(releaseModule.RELEASE_MESSAGES?.[locale] || {}),
    ...(generated[locale] || {}),
  };

  const missing = expectedKeys.filter((key) => typeof effective[key] !== "string" || !effective[key].trim());
  const stale = manifest
    ? expectedKeys.filter((key) => manifest.locales?.[locale]?.[key] !== sourceHash(english[key]))
    : expectedKeys;
  const brokenPlaceholders = expectedKeys.filter((key) => {
    if (typeof effective[key] !== "string") return false;
    return JSON.stringify(placeholders(effective[key])) !== JSON.stringify(placeholders(english[key]));
  });

  if (missing.length || stale.length || brokenPlaceholders.length) {
    failed = true;
    console.error(`[i18n] ${locale}: ${missing.length} missing, ${stale.length} stale, ${brokenPlaceholders.length} placeholder mismatch(es)`);
    if (missing.length) console.error(`       missing: ${missing.slice(0, 14).join(", ")}${missing.length > 14 ? ", …" : ""}`);
    if (stale.length) console.error(`       stale: ${stale.slice(0, 14).join(", ")}${stale.length > 14 ? ", …" : ""}`);
    if (brokenPlaceholders.length) console.error(`       placeholders: ${brokenPlaceholders.slice(0, 14).join(", ")}${brokenPlaceholders.length > 14 ? ", …" : ""}`);
  }
}

// Catch t("typo_or_missing_key") before it can become a raw key or English fallback.
const referenced = new Map();
for (const root of [path.join(ROOT, "app"), path.join(ROOT, "components")]) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["'`]([^"'`]+)["'`]/g)) {
      const key = match[1];
      if (!referenced.has(key)) referenced.set(key, []);
      referenced.get(key).push(path.relative(ROOT, file));
    }
  }
}
const unknownKeys = Array.from(referenced.keys()).filter((key) => !expectedKeySet.has(key)).sort();
if (unknownKeys.length) {
  failed = true;
  console.error(`[i18n] ${unknownKeys.length} referenced t() key(s) are missing from English source:`);
  for (const key of unknownKeys.slice(0, 30)) console.error(`       ${key} <- ${referenced.get(key)[0]}`);
}

if (failed) {
  console.error("\n[i18n] Release blocked. Refresh only the UI delta, then rerun this check:");
  console.error("npm run i18n:translate-ui");
  process.exit(1);
}

console.log(`[i18n] release coverage OK: ${EXPECTED_LOCALES.length} locales × ${expectedKeys.length} UI keys, all fresh with valid placeholders.`);
