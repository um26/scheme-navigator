// Export the effective English UI dictionary for the offline translation job.
// This runs outside Next/Vercel and intentionally has zero runtime dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".translation-work", "ui-en.json");

async function importPlainJs(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(url);
}

const [{ default: en }, extrasModule] = await Promise.all([
  importPlainJs("lib/i18n/locales/en.js"),
  importPlainJs("lib/i18n/extras.js"),
]);

const effective = { ...en, ...(extrasModule.EXTRA_MESSAGES?.en || {}) };
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(effective, null, 2));
console.log(`[i18n] exported ${Object.keys(effective).length} English UI messages -> ${OUT}`);
