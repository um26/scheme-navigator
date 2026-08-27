import { stripMarkdown } from "./markdownLite";

const ALIAS_GROUPS = [
  ["widow pension", "vidhwa pension", "विधवा पेंशन", "विधवा pension", "widow scheme"],
  ["old age pension", "vridh pension", " वृद्ध pension", "वृद्धावस्था पेंशन", "senior citizen pension"],
  ["scholarship", "scholrship", "scholar ship", "chatravritti", "छात्रवृत्ति", "student scholarship"],
  ["farmer", "kisan", "किसान", "krishi", "कृषि", "agriculture"],
  ["women", "woman", "mahila", "महिला", "female"],
  ["girl", "kanya", "beti", "कन्या", "बेटी"],
  ["housing", "awas", "आवास", "ghar", "घर", "home scheme"],
  ["disability", "disabled", "divyang", "दिव्यांग", "handicapped"],
  ["business", "udyam", "उद्यम", "enterprise", "self employment", "rozgar", "रोजगार"],
  ["education", "shiksha", "शिक्षा", "study", "school", "college"],
  ["maternity", "pregnancy", "prasuti", "प्रसूति", "pregnant", "mother benefit"],
  ["loan", "credit", "rin", "ऋण", "finance"],
  ["insurance", "bima", "बीमा"],
  ["minority", "अल्पसंख्यक", "alp sankhyak"],
  ["scheduled caste", "sc", "दलित", "dalit"],
  ["scheduled tribe", "st", "tribal", "adivasi", "आदिवासी"],
  ["obc", "backward class", "पिछड़ा वर्ग", "pichda varg"],
  ["pm kisan", "pmkisan", "प्रधानमंत्री किसान", "pradhan mantri kisan"],
  ["pm awas", "pmay", "प्रधानमंत्री आवास", "pradhan mantri awas"],
];

const CANONICAL_ALIASES = ALIAS_GROUPS.map((group) => ({
  canonical: group[0],
  terms: group.map((term) => normalizeText(term)),
}));

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function expandQuery(raw) {
  let normalized = normalizeText(raw);
  const additions = new Set();

  for (const group of CANONICAL_ALIASES) {
    if (group.terms.some((term) => term && normalized.includes(term))) {
      additions.add(group.canonical);
      for (const term of group.terms) additions.add(term);
    }
  }

  return normalizeText([normalized, ...additions].join(" "));
}

function trigrams(value) {
  const text = `  ${value}  `;
  const grams = new Set();
  for (let i = 0; i < text.length - 2; i += 1) grams.add(text.slice(i, i + 3));
  return grams;
}

function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = trigrams(a);
  const bb = trigrams(b);
  let overlap = 0;
  for (const gram of aa) if (bb.has(gram)) overlap += 1;
  return (2 * overlap) / Math.max(1, aa.size + bb.size);
}

function tokenScore(queryToken, fieldToken) {
  if (queryToken === fieldToken) return 1;
  if (fieldToken.startsWith(queryToken) || queryToken.startsWith(fieldToken)) return 0.86;
  if (fieldToken.includes(queryToken) || queryToken.includes(fieldToken)) return 0.72;
  const similarity = dice(queryToken, fieldToken);
  return similarity >= 0.58 ? similarity * 0.72 : 0;
}

function scoreField(queryTokens, normalizedField, weight) {
  if (!normalizedField) return 0;
  const fieldTokens = normalizedField.split(" ").filter(Boolean);
  let score = 0;
  for (const queryToken of queryTokens) {
    let best = 0;
    for (const fieldToken of fieldTokens) best = Math.max(best, tokenScore(queryToken, fieldToken));
    score += best * weight;
  }
  return score;
}

export function scoreScheme(query, scheme) {
  const expanded = expandQuery(query);
  if (!expanded) return 0;
  const queryTokens = expanded.split(" ").filter((token) => token.length > 1 || /^\d+$/.test(token));
  if (!queryTokens.length) return 0;

  const name = normalizeText(scheme.name);
  const tags = normalizeText(scheme.tags);
  const ministry = normalizeText(scheme.ministry);
  const description = normalizeText(stripMarkdown(scheme.description || ""));
  const benefits = normalizeText(stripMarkdown(scheme.benefits || ""));
  const state = normalizeText(scheme.state || scheme.level);

  let score = 0;
  if (name === expanded) score += 80;
  else if (name.includes(expanded)) score += 45;
  if (tags.includes(expanded)) score += 22;

  score += scoreField(queryTokens, name, 7);
  score += scoreField(queryTokens, tags, 4.5);
  score += scoreField(queryTokens, ministry, 2.5);
  score += scoreField(queryTokens, state, 1.8);
  score += scoreField(queryTokens, description, 1.2);
  score += scoreField(queryTokens, benefits, 1.0);

  return score;
}

export function searchSchemes(query, schemes, limit = 60) {
  const raw = String(query || "").trim();
  if (!raw) return [];

  return schemes
    .map((scheme) => ({ scheme, score: scoreScheme(raw, scheme) }))
    .filter((item) => item.score >= 1.15)
    .sort((a, b) => b.score - a.score || String(a.scheme.name || "").localeCompare(String(b.scheme.name || "")))
    .slice(0, Math.max(1, limit))
    .map((item) => item.scheme);
}

export const SEARCH_EXAMPLES = [
  "vidhwa pension",
  "pm kisan",
  "SC scholrship",
  "महिला loan",
  "farmer insurance",
  "student scholarship",
];
