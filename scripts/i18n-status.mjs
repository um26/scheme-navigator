import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "public/i18n/ui-manifest.json");
const LOCALES = ["as","bn","brx","doi","gom","gu","hi","kn","ks","mai","ml","mni","mr","ne","or","pa","sa","sat","sd","ta","te","ur"];

async function importPlainJs(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(url);
}

function hash(text) {
  return createHash("sha256").update(`ui-v1|${text}`).digest("hex");
}

const [{ default: en }, extras, conditions, release, generated] = await Promise.all([
  importPlainJs("lib/i18n/locales/en.js"),
  importPlainJs("lib/i18n/extras.js"),
  importPlainJs("lib/i18n/conditionMessages.js"),
  importPlainJs("lib/i18n/releaseMessages.js"),
  importPlainJs("lib/i18n/generated.js"),
]);

const english = {
  ...en,
  ...(extras.EXTRA_MESSAGES?.en || {}),
  ...(conditions.CONDITION_MESSAGES?.en || {}),
  ...(release.RELEASE_MESSAGES?.en || {}),
};
const keys = Object.keys(english);
const dictionaries = generated.GENERATED_DICTIONARIES || {};
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) : { locales: {} };

console.log(`UI source keys: ${keys.length}`);
console.log(`Freshness manifest: ${existsSync(MANIFEST_PATH) ? "present" : "MISSING"}`);
console.log("");
console.log("Locale  translated  fresh  status");
console.log("------  ----------  -----  ------");

let needsWork = false;
for (const locale of LOCALES) {
  const dict = dictionaries[locale] || {};
  const translated = keys.filter((key) => typeof dict[key] === "string" && dict[key].trim()).length;
  const fresh = keys.filter((key) => manifest.locales?.[locale]?.[key] === hash(english[key])).length;
  const ok = translated === keys.length && fresh === keys.length;
  if (!ok) needsWork = true;
  console.log(`${locale.padEnd(6)}  ${String(translated).padStart(4)}/${keys.length}   ${String(fresh).padStart(4)}/${keys.length}  ${ok ? "✓ ready" : "△ refresh needed"}`);
}

console.log("");
console.log(needsWork ? "UI translation delta is not release-ready." : "All 22 locale dictionaries are complete and fresh.");
process.exitCode = needsWork ? 1 : 0;
