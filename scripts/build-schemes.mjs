// scripts/build-schemes.mjs
//
// Fetches the scheme dataset at BUILD TIME. Eligibility decisions remain fully
// deterministic: structured dataset columns are used directly, with narrow regex
// fallback only when a structured value is genuinely absent.

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
const META_OUT_FILE = path.join(OUT_DIR, "data-meta.json");

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

function extractAgeFallback(text) {
  if (!text) return { minAge: null, maxAge: null };
  const range = text.match(/(\d{1,3})\s*(?:to|-|–|and)\s*(\d{1,3})\s*years?/i);
  if (range) return { minAge: Number(range[1]), maxAge: Number(range[2]) };
  return { minAge: null, maxAge: null };
}

function extractIncomeFallback(text) {
  if (!text) return null;
  const match = text.match(/(?:income)[^.\n]{0,40}?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)?/i);
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

function percent(count, total) {
  return total ? Math.round((count / total) * 1000) / 10 : 0;
}

function validHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim().replace(/\s+/g, " ");
}

function safeDate(value) {
  if (value == null) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function buildDataMeta(rows, schemes) {
  const total = schemes.length;
  const textFields = ["name", "description", "benefits", "eligibilityText", "applicationProcess", "documentsRequired", "ministry", "officialUrl", "applyUrl"];
  const coverage = Object.fromEntries(textFields.map((field) => {
    const count = schemes.filter((scheme) => typeof scheme[field] === "string" && scheme[field].trim().length > 0).length;
    return [field, { count, percent: percent(count, total) }];
  }));

  const coreCompletenessFields = ["name", "description", "benefits", "eligibilityText", "applicationProcess", "documentsRequired", "officialUrl"];
  const completenessNumerator = coreCompletenessFields.reduce((sum, field) => sum + coverage[field].count, 0);
  const completenessPercent = percent(completenessNumerator, total * coreCompletenessFields.length);

  const suspiciousIncome = schemes.filter((scheme) => {
    const value = scheme.eligibility?.maxIncome;
    return value != null && (Number(value) < 1000 || Number(value) > 100000000);
  });
  const invalidAge = schemes.filter((scheme) => {
    const min = scheme.eligibility?.minAge;
    const max = scheme.eligibility?.maxAge;
    return (min != null && (min < 0 || min > 120)) || (max != null && (max < 0 || max > 120)) || (min != null && max != null && min > max);
  });
  const missingState = schemes.filter((scheme) => scheme.level === "State" && !scheme.state);
  const malformedUrls = [];
  for (const scheme of schemes) {
    for (const field of ["officialUrl", "applyUrl"]) {
      if (scheme[field] && !validHttpUrl(scheme[field])) malformedUrls.push({ id: scheme.id, name: scheme.name, field, value: String(scheme[field]).slice(0, 160) });
    }
  }

  const idCounts = new Map();
  const nameGroups = new Map();
  for (const scheme of schemes) {
    idCounts.set(scheme.id, (idCounts.get(scheme.id) || 0) + 1);
    const normalized = normalizeName(scheme.name);
    if (normalized) nameGroups.set(normalized, [...(nameGroups.get(normalized) || []), scheme]);
  }
  const duplicateIds = schemes.filter((scheme) => (idCounts.get(scheme.id) || 0) > 1);
  const duplicateNameGroups = Array.from(nameGroups.values()).filter((group) => group.length > 1);

  const scrapedDates = rows.map((row) => safeDate(row.scraped_at)).filter(Boolean).sort((a, b) => a - b);
  const oldestScrapedAt = scrapedDates.length ? scrapedDates[0].toISOString() : null;
  const freshestScrapedAt = scrapedDates.length ? scrapedDates[scrapedDates.length - 1].toISOString() : null;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceDataset: PARQUET_URL,
    sourceRecords: {
      oldestScrapedAt,
      freshestScrapedAt,
      scrapedTimestampCoverage: { count: scrapedDates.length, percent: percent(scrapedDates.length, rows.length) },
    },
    counts: {
      total,
      central: schemes.filter((scheme) => scheme.level === "Central").length,
      state: schemes.filter((scheme) => scheme.level === "State").length,
      uniqueStates: new Set(schemes.filter((scheme) => scheme.state).map((scheme) => scheme.state)).size,
    },
    completeness: {
      percent: completenessPercent,
      fields: coverage,
      definition: "Presence of seven core catalog fields; this measures completeness, not factual accuracy.",
    },
    structuredEligibility: {
      ageRestricted: schemes.filter((scheme) => scheme.eligibility?.minAge != null || scheme.eligibility?.maxAge != null).length,
      incomeCapped: schemes.filter((scheme) => scheme.eligibility?.maxIncome != null).length,
      genderRestricted: schemes.filter((scheme) => scheme.eligibility?.gender && scheme.eligibility.gender !== "any").length,
      categoryRestricted: schemes.filter((scheme) => scheme.eligibility?.categories?.length > 0).length,
      bplRequired: schemes.filter((scheme) => scheme.eligibility?.requiresBPL).length,
      disabilityRequired: schemes.filter((scheme) => scheme.eligibility?.requiresDisability).length,
    },
    anomalies: {
      suspiciousIncome: { count: suspiciousIncome.length, samples: suspiciousIncome.slice(0, 12).map((scheme) => ({ id: scheme.id, name: scheme.name, value: scheme.eligibility?.maxIncome })) },
      invalidAge: { count: invalidAge.length, samples: invalidAge.slice(0, 12).map((scheme) => ({ id: scheme.id, name: scheme.name, minAge: scheme.eligibility?.minAge, maxAge: scheme.eligibility?.maxAge })) },
      missingState: { count: missingState.length, samples: missingState.slice(0, 12).map((scheme) => ({ id: scheme.id, name: scheme.name })) },
      malformedUrls: { count: malformedUrls.length, samples: malformedUrls.slice(0, 12) },
      duplicateIds: { count: duplicateIds.length, samples: duplicateIds.slice(0, 12).map((scheme) => ({ id: scheme.id, name: scheme.name })) },
      duplicateNameGroups: { count: duplicateNameGroups.length, samples: duplicateNameGroups.slice(0, 8).map((group) => group.slice(0, 4).map((scheme) => ({ id: scheme.id, name: scheme.name }))) },
    },
    notes: [
      "URL health here means presence and parseable http(s) format only; the build does not issue thousands of live HEAD requests.",
      "Anomaly flags are review queues, not proof that the source record is wrong.",
      "Eligibility coverage describes structured fields available to the deterministic rule engine, not every condition that may exist in narrative scheme text.",
    ],
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

  const LITE_OUT_FILE = path.join(OUT_DIR, "schemes-lite.json");
  const lite = schemes.map((s) => ({ id: s.id, name: s.name, level: s.level, state: s.state, eligibility: s.eligibility }));
  writeFileSync(LITE_OUT_FILE, JSON.stringify(lite));
  console.log(`[build-schemes] wrote lite export to ${LITE_OUT_FILE}`);

  const meta = buildDataMeta(rows, schemes);
  writeFileSync(META_OUT_FILE, JSON.stringify(meta, null, 2));
  console.log(`[build-schemes] data completeness: ${meta.completeness.percent}%`);
  console.log(`[build-schemes] anomaly queues: income=${meta.anomalies.suspiciousIncome.count}, age=${meta.anomalies.invalidAge.count}, urls=${meta.anomalies.malformedUrls.count}, duplicate-name-groups=${meta.anomalies.duplicateNameGroups.count}`);
  console.log(`[build-schemes] wrote data health metadata to ${META_OUT_FILE}`);

  console.log(`[build-schemes] Central: ${meta.counts.central}, State: ${meta.counts.state}, unique states: ${meta.counts.uniqueStates}`);
}

main().catch((err) => {
  console.error("[build-schemes] FAILED:", err);
  process.exit(1);
});
