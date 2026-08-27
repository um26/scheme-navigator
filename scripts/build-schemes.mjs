// scripts/build-schemes.mjs
//
// Build-time catalog generator. Structured eligibility remains deterministic.
// Eligibility conditions detected only in narrative text are tagged for verification,
// never silently converted into pass/fail rules.

import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { writeFileSync, mkdirSync, existsSync, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createHash } from "crypto";
import path from "path";

const PARQUET_URL =
  "https://huggingface.co/datasets/smartduketech/indian-government-schemes-2025/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet";
const PROD_BASE = "https://scheme-navigator-ten.vercel.app";

const TMP_FILE = path.join(process.cwd(), ".schemes-tmp.parquet");
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "schemes.json");
const META_OUT_FILE = path.join(OUT_DIR, "data-meta.json");
const SNAPSHOT_OUT_FILE = path.join(OUT_DIR, "scheme-snapshot.json");
const CHANGES_OUT_FILE = path.join(OUT_DIR, "scheme-changes.json");
const HISTORY_OUT_FILE = path.join(OUT_DIR, "scheme-change-history.json");

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
    for (const code of CASTE_CODES) if (s === code || s.includes(code)) out.add(code);
  }
  return Array.from(out);
}

const NARRATIVE_CONDITION_RULES = [
  { key: "student", label: "Student / enrolment status", re: /\b(student|students|studying|enrolled|enrolment|school|college|university|class\s*(?:i|v|x|\d)|course)\b/i },
  { key: "occupation", label: "Occupation / worker status", re: /\b(worker|labourer|laborer|artisan|weaver|fisher|vendor|entrepreneur|self[- ]employed|occupation|profession)\b/i },
  { key: "farmer_land", label: "Farmer / landholding status", re: /\b(farmer|cultivator|agricultur|landholder|land holding|landholding|tenant farmer|sharecropper)\b/i },
  { key: "marital", label: "Marital / family status", re: /\b(unmarried|married|widow|widower|divorc|deserted|single parent|orphan)\b/i },
  { key: "employment", label: "Employment status", re: /\b(unemployed|employment|employed|job seeker|government employee|service holder)\b/i },
  { key: "education", label: "Education / qualification", re: /\b(qualification|graduate|graduation|postgraduate|diploma|degree|matric|10th|12th|higher secondary|education level)\b/i },
  { key: "domicile", label: "Domicile / residence duration", re: /\b(domicile|domiciled|resident for|residing for|permanent resident|residence certificate|years of residence)\b/i },
  { key: "minority", label: "Minority / community status", re: /\b(minority|muslim|christian|sikh|buddhist|jain|parsi)\b/i },
  { key: "institution", label: "Institution / organisation status", re: /\b(institution|institute|ngo|self help group|shg|cooperative|society|organisation|organization)\b/i },
];

function evidenceSnippet(text, matchIndex, matchLength) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return null;
  const start = Math.max(0, matchIndex - 65);
  const end = Math.min(source.length, matchIndex + matchLength + 105);
  const snippet = source.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < source.length ? "…" : ""}`.slice(0, 220);
}

function detectAdditionalConditions(text) {
  if (!text) return [];
  const source = String(text).replace(/\s+/g, " ");
  const found = [];
  for (const rule of NARRATIVE_CONDITION_RULES) {
    const match = rule.re.exec(source);
    if (match) found.push({ key: rule.key, label: rule.label, evidence: evidenceSnippet(source, match.index, match[0].length) });
  }
  return found;
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
  const eligibilityText = clean(row.eligibility_text);
  return {
    id: row.slug ? `scheme-${row.slug}` : `scheme-${index}`,
    name: clean(row.name),
    level: isCentral ? "Central" : "State",
    state: isCentral ? null : clean(row.state),
    ministry: clean(row.ministry) || clean(row.department),
    description: clean(row.description),
    benefits: clean(row.benefits),
    eligibilityText,
    applicationProcess: clean(row.application_process),
    documentsRequired: clean(row.documents_required),
    applyUrl: row.apply_url || null,
    officialUrl: row.official_url || null,
    tags: clean(row.category),
    eligibility: buildEligibility(row),
    additionalConditions: detectAdditionalConditions(eligibilityText),
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
  const narrativeCounts = Object.fromEntries(NARRATIVE_CONDITION_RULES.map((rule) => [rule.key, schemes.filter((scheme) => scheme.additionalConditions?.some((condition) => condition.key === rule.key)).length]));
  const schemesWithNarrativeConditions = schemes.filter((scheme) => scheme.additionalConditions?.length > 0).length;

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceDataset: PARQUET_URL,
    sourceRecords: {
      oldestScrapedAt: scrapedDates.length ? scrapedDates[0].toISOString() : null,
      freshestScrapedAt: scrapedDates.length ? scrapedDates[scrapedDates.length - 1].toISOString() : null,
      scrapedTimestampCoverage: { count: scrapedDates.length, percent: percent(scrapedDates.length, rows.length) },
    },
    counts: {
      total,
      central: schemes.filter((scheme) => scheme.level === "Central").length,
      state: schemes.filter((scheme) => scheme.level === "State").length,
      uniqueStates: new Set(schemes.filter((scheme) => scheme.state).map((scheme) => scheme.state)).size,
    },
    completeness: { percent: completenessPercent, fields: coverage, definition: "Presence of seven core catalog fields; this measures completeness, not factual accuracy." },
    structuredEligibility: {
      ageRestricted: schemes.filter((scheme) => scheme.eligibility?.minAge != null || scheme.eligibility?.maxAge != null).length,
      incomeCapped: schemes.filter((scheme) => scheme.eligibility?.maxIncome != null).length,
      genderRestricted: schemes.filter((scheme) => scheme.eligibility?.gender && scheme.eligibility.gender !== "any").length,
      categoryRestricted: schemes.filter((scheme) => scheme.eligibility?.categories?.length > 0).length,
      bplRequired: schemes.filter((scheme) => scheme.eligibility?.requiresBPL).length,
      disabilityRequired: schemes.filter((scheme) => scheme.eligibility?.requiresDisability).length,
    },
    narrativeEligibility: {
      schemesFlagged: schemesWithNarrativeConditions,
      percentFlagged: percent(schemesWithNarrativeConditions, total),
      byCondition: narrativeCounts,
      definition: "Pattern-detected conditions in eligibility text that are surfaced as verification-required, never auto-passed or auto-failed.",
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
      "URL health means presence and parseable http(s) format only; the build does not issue thousands of live HEAD requests.",
      "Anomaly flags are review queues, not proof that the source record is wrong.",
      "Narrative eligibility signals deliberately increase uncertainty rather than being guessed into structured eligibility.",
    ],
  };
}

function hash(value) {
  return createHash("sha1").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

function snapshotItem(scheme) {
  return {
    id: scheme.id,
    name: scheme.name,
    level: scheme.level,
    state: scheme.state,
    eligibility: scheme.eligibility,
    additionalConditionKeys: (scheme.additionalConditions || []).map((condition) => condition.key).sort(),
    officialUrl: scheme.officialUrl,
    applyUrl: scheme.applyUrl,
    textHashes: {
      description: hash(scheme.description),
      benefits: hash(scheme.benefits),
      eligibilityText: hash(scheme.eligibilityText),
      applicationProcess: hash(scheme.applicationProcess),
      documentsRequired: hash(scheme.documentsRequired),
    },
  };
}

async function fetchJsonMaybe(url) {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4500) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildChangeFields(before, after) {
  const fields = [];
  const scalarFields = [
    ["name", "Name"],
    ["level", "Level"],
    ["state", "State"],
    ["officialUrl", "Official URL"],
    ["applyUrl", "Application URL"],
  ];
  for (const [key, label] of scalarFields) if (!same(before[key], after[key])) fields.push({ field: label, before: before[key] ?? null, after: after[key] ?? null });

  const eligibilityFields = [
    ["minAge", "Minimum age"], ["maxAge", "Maximum age"], ["gender", "Gender"], ["maxIncome", "Income cap"],
    ["categories", "Categories"], ["requiresBPL", "BPL requirement"], ["requiresDisability", "Disability requirement"],
  ];
  for (const [key, label] of eligibilityFields) {
    if (!same(before.eligibility?.[key], after.eligibility?.[key])) fields.push({ field: label, before: before.eligibility?.[key] ?? null, after: after.eligibility?.[key] ?? null });
  }
  if (!same(before.additionalConditionKeys, after.additionalConditionKeys)) fields.push({ field: "Narrative eligibility signals", before: before.additionalConditionKeys || [], after: after.additionalConditionKeys || [] });

  const textLabels = { description: "Description", benefits: "Benefits", eligibilityText: "Eligibility text", applicationProcess: "Application process", documentsRequired: "Documents required" };
  for (const [key, label] of Object.entries(textLabels)) if (before.textHashes?.[key] !== after.textHashes?.[key]) fields.push({ field: label, before: "content changed", after: "content changed" });
  return fields;
}

function diffSnapshots(previous, current) {
  if (!previous?.items || !Array.isArray(previous.items)) {
    return { version: 1, generatedAt: current.generatedAt, comparedTo: null, baseline: true, counts: { added: 0, removed: 0, updated: 0 }, added: [], removed: [], updated: [] };
  }

  const prevMap = new Map(previous.items.map((item) => [item.id, item]));
  const currMap = new Map(current.items.map((item) => [item.id, item]));
  const added = current.items.filter((item) => !prevMap.has(item.id)).map((item) => ({ id: item.id, name: item.name, state: item.state, level: item.level }));
  const removed = previous.items.filter((item) => !currMap.has(item.id)).map((item) => ({ id: item.id, name: item.name, state: item.state, level: item.level }));
  const updated = [];

  for (const item of current.items) {
    const before = prevMap.get(item.id);
    if (!before) continue;
    const fields = buildChangeFields(before, item);
    if (fields.length) updated.push({ id: item.id, name: item.name, fields });
  }

  return {
    version: 1,
    generatedAt: current.generatedAt,
    comparedTo: previous.generatedAt || null,
    baseline: false,
    counts: { added: added.length, removed: removed.length, updated: updated.length },
    added: added.slice(0, 250),
    removed: removed.slice(0, 250),
    updated: updated.slice(0, 500),
  };
}

async function writeChangeTracking(schemes) {
  const generatedAt = new Date().toISOString();
  const current = { version: 1, generatedAt, items: schemes.map(snapshotItem) };
  const [previous, previousHistory] = await Promise.all([
    fetchJsonMaybe(`${PROD_BASE}/data/scheme-snapshot.json`),
    fetchJsonMaybe(`${PROD_BASE}/data/scheme-change-history.json`),
  ]);

  const changes = diffSnapshots(previous, current);
  const historyEntry = {
    generatedAt,
    comparedTo: changes.comparedTo,
    baseline: changes.baseline,
    counts: changes.counts,
    sampleAdded: changes.added.slice(0, 5),
    sampleRemoved: changes.removed.slice(0, 5),
    sampleUpdated: changes.updated.slice(0, 8).map((item) => ({ id: item.id, name: item.name, fields: item.fields.map((field) => field.field) })),
  };
  const priorEntries = Array.isArray(previousHistory?.entries) ? previousHistory.entries : [];
  const history = { version: 1, entries: [historyEntry, ...priorEntries.filter((entry) => entry.generatedAt !== generatedAt)].slice(0, 30) };

  writeFileSync(SNAPSHOT_OUT_FILE, JSON.stringify(current));
  writeFileSync(CHANGES_OUT_FILE, JSON.stringify(changes, null, 2));
  writeFileSync(HISTORY_OUT_FILE, JSON.stringify(history, null, 2));
  console.log(`[build-schemes] change tracking: baseline=${changes.baseline}, added=${changes.counts.added}, removed=${changes.counts.removed}, updated=${changes.counts.updated}`);
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
  const lite = schemes.map((s) => ({ id: s.id, name: s.name, level: s.level, state: s.state, tags: s.tags, eligibility: s.eligibility, additionalConditions: s.additionalConditions }));
  writeFileSync(LITE_OUT_FILE, JSON.stringify(lite));
  console.log(`[build-schemes] wrote lite export to ${LITE_OUT_FILE}`);

  const meta = buildDataMeta(rows, schemes);
  writeFileSync(META_OUT_FILE, JSON.stringify(meta, null, 2));
  console.log(`[build-schemes] data completeness: ${meta.completeness.percent}%`);
  console.log(`[build-schemes] narrative eligibility flags: ${meta.narrativeEligibility.schemesFlagged}/${meta.counts.total}`);
  console.log(`[build-schemes] anomaly queues: income=${meta.anomalies.suspiciousIncome.count}, age=${meta.anomalies.invalidAge.count}, urls=${meta.anomalies.malformedUrls.count}, duplicate-name-groups=${meta.anomalies.duplicateNameGroups.count}`);

  await writeChangeTracking(schemes);
  console.log(`[build-schemes] Central: ${meta.counts.central}, State: ${meta.counts.state}, unique states: ${meta.counts.uniqueStates}`);
}

main().catch((err) => {
  console.error("[build-schemes] FAILED:", err);
  process.exit(1);
});
