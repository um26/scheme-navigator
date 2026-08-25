// scripts/build-schemes.mjs
//
// Fetches the scheme dataset at BUILD TIME (see scripts/build-map.mjs header for why
// this pattern exists — large files silently truncate if typed directly into deploy
// calls).
//
// Dataset schema (confirmed via diagnostic build, 2026-08-19):
//   slug, name, description, ministry, department, state, category, beneficiary_type,
//   benefits, eligibility_text, application_process, documents_required, apply_url,
//   official_url, eligibility_age_min, eligibility_age_max, eligibility_gender,
//   eligibility_caste, eligibility_income_max, eligibility_residence, eligibility_state,
//   eligibility_disability, eligibility_bpl, scraped_at
//
// The dataset ALREADY provides structured eligibility columns (age/gender/income/caste/
// BPL/disability) — we use those directly rather than re-deriving them, and only fall
// back to regex extraction over eligibility_text when a structured column is genuinely
// absent (null/undefined). Still zero LLM calls in this script: the LLM never touches
// the scheme catalog, only the user's query-time free text (see lib/groq.js).
//
// Array-typed columns (eligibility_caste, eligibility_state) come through as JSON
// encoded as a string (e.g. "[\"SC\"]"), not a native array — parsed accordingly.

import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { writeFileSync, mkdirSync, existsSync, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const PARQUET_URL =
  "https://huggingface.co/datasets/smartduketech/indian-government-schemes-2025/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet";

const TMP_FILE = path.join(process.cwd(), ".schemes-tmp.parquet");
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "schemes.json");

function clean(s) {
  return typeof s === "string" ? s.trim() : s;
}

function parseJsonArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---- regex fallback, only used when a structured column is missing ----
function extractAgeFallback(text) {
  if (!text) return { minAge: null, maxAge: null };
  const range = text.match(/(\d{1,3})\s*(?:to|-|–|and)\s*(\d{1,3})\s*years?/i);
  if (range) return { minAge: Number(range[1]), maxAge: Number(range[2]) };
  return { minAge: null, maxAge: null };
}

function extractIncomeFallback(text) {
  if (!text) return null;
  const match = text.match(
    /(?:income)[^.\n]{0,40}?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)?/i
  );
  if (!match) return null;
  let value = parseFloat(match[1].replace(/,/g, ""));
  const unit = match[2]?.toLowerCase();
  if (unit?.startsWith("lakh")) value *= 100000;
  if (unit?.startsWith("crore")) value *= 10000000;
  return Number.isFinite(value) ? Math.round(value) : null;
}

function normalizeGender(raw, fallbackText) {
  if (raw == null) {
    if (fallbackText && /\bwomen\b|\bfemale\b/i.test(fallbackText)) return "female";
    if (fallbackText && /\bmen\b|\bmale\b/i.test(fallbackText)) return "male";
    return "any";
  }
  const s = String(raw).toLowerCase();
  if (s === "all" || s === "any" || s === "") return "any";
  if (s.includes("female")) return "female";
  if (s.includes("male")) return "male";
  return "any";
}

const CASTE_CODES = ["SC", "ST", "OBC", "EWS"];
function normalizeCastes(rawArray) {
  const out = new Set();
  for (const item of rawArray) {
    const s = String(item).toUpperCase();
    for (const code of CASTE_CODES) {
      if (s === code || s.includes(code)) out.add(code);
    }
  }
  return Array.from(out);
}

function buildEligibility(row) {
  const hasStructuredAge = row.eligibility_age_min != null || row.eligibility_age_max != null;
  const ageFallback = hasStructuredAge ? { minAge: null, maxAge: null } : extractAgeFallback(row.eligibility_text);

  return {
    minAge: row.eligibility_age_min ?? ageFallback.minAge,
    maxAge: row.eligibility_age_max ?? ageFallback.maxAge,
    gender: normalizeGender(row.eligibility_gender, row.eligibility_text),
    maxIncome: row.eligibility_income_max ?? extractIncomeFallback(row.eligibility_text),
    categories: normalizeCastes(parseJsonArray(row.eligibility_caste)),
    requiresBPL: row.eligibility_bpl === true,
    requiresDisability: row.eligibility_disability === true,
  };
}

function mapRow(row, index) {
  const isCentral = String(row.state || "").trim().toLowerCase() === "central";
  return {
    id: row.slug ? `scheme-${row.slug}` : `scheme-${index}`,
    name: clean(row.name),
    level: isCentral ? "Central" : "State",
    state: isCentral ? null : clean(row.state),
    ministry: clean(row.ministry) || clean(row.department),
    description: clean(row.description),
    benefits: clean(row.benefits),
    eligibilityText: clean(row.eligibility_text),
    applicationProcess: clean(row.application_process),
    documentsRequired: clean(row.documents_required),
    applyUrl: row.apply_url || null,
    officialUrl: row.official_url || null,
    tags: clean(row.category),
    eligibility: buildEligibility(row),
  };
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("[build-schemes] downloading dataset...");
  const res = await fetch(PARQUET_URL);
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(TMP_FILE));

  console.log("[build-schemes] parsing parquet...");
  const file = await asyncBufferFromFile(TMP_FILE);
  const rows = await parquetReadObjects({ file });
  console.log(`[build-schemes] read ${rows.length} raw rows`);

  const schemes = rows.map((row, i) => mapRow(row, i));

  writeFileSync(OUT_FILE, JSON.stringify(schemes));
  console.log(`[build-schemes] wrote ${schemes.length} schemes to ${OUT_FILE}`);

  // Compact client index for What-If, global command search, and map counts. It
  // intentionally excludes all long body text so it stays cheap to fetch.
  const LITE_OUT_FILE = path.join(OUT_DIR, "schemes-lite.json");
  const lite = schemes.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    state: s.state,
    ministry: s.ministry,
    tags: s.tags,
    eligibility: s.eligibility,
  }));
  writeFileSync(LITE_OUT_FILE, JSON.stringify(lite));
  console.log(`[build-schemes] wrote lite export to ${LITE_OUT_FILE}`);

  const central = schemes.filter((s) => s.level === "Central").length;
  const uniqueStates = new Set(schemes.filter((s) => s.state).map((s) => s.state));
  console.log(
    `[build-schemes] Central: ${central}, State: ${schemes.length - central}, unique states: ${uniqueStates.size}`
  );
}

main().catch((err) => {
  console.error("[build-schemes] FAILED:", err);
  process.exit(1);
});
