import { stripMarkdown } from "./markdownLite";

function tokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function overlapScore(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.max(1, Math.min(a.size, b.size));
}

function eligibilityShape(scheme) {
  const e = scheme.eligibility || {};
  return {
    age: e.minAge != null || e.maxAge != null,
    income: e.maxIncome != null,
    gender: e.gender && e.gender !== "any" ? e.gender : "any",
    category: Array.isArray(e.categories) && e.categories.length ? [...e.categories].sort().join("|") : "any",
    bpl: Boolean(e.requiresBPL),
    disability: Boolean(e.requiresDisability),
  };
}

function shapeScore(a, b) {
  let score = 0;
  if (a.age === b.age) score += 0.6;
  if (a.income === b.income) score += 0.6;
  if (a.gender === b.gender) score += 0.8;
  if (a.category === b.category) score += 0.8;
  if (a.bpl === b.bpl) score += 0.5;
  if (a.disability === b.disability) score += 0.5;
  return score;
}

export function similarityScore(source, candidate) {
  if (!source || !candidate || source.id === candidate.id) return -Infinity;
  let score = 0;

  if (source.tags && candidate.tags && String(source.tags).toLowerCase() === String(candidate.tags).toLowerCase()) score += 5;
  else score += overlapScore(tokens(source.tags), tokens(candidate.tags)) * 3.5;

  if (source.ministry && candidate.ministry && String(source.ministry).toLowerCase() === String(candidate.ministry).toLowerCase()) score += 2.5;
  if (source.level === candidate.level) score += 0.7;
  if (source.state && candidate.state && source.state === candidate.state) score += 1.2;

  score += overlapScore(tokens(source.name), tokens(candidate.name)) * 2.8;
  score += overlapScore(tokens(stripMarkdown(source.benefits || "")), tokens(stripMarkdown(candidate.benefits || ""))) * 2.2;
  score += overlapScore(tokens(stripMarkdown(source.description || "")), tokens(stripMarkdown(candidate.description || ""))) * 1.2;
  score += shapeScore(eligibilityShape(source), eligibilityShape(candidate));

  return score;
}

function compactScheme(scheme) {
  return {
    id: scheme.id,
    name: scheme.name,
    level: scheme.level,
    state: scheme.state,
    ministry: scheme.ministry,
    description: scheme.description,
    benefits: scheme.benefits,
    tags: scheme.tags,
    eligibility: scheme.eligibility,
    additionalConditions: scheme.additionalConditions || [],
  };
}

export function getSimilarSchemes(source, schemes, limit = 8) {
  return schemes
    .filter((candidate) => candidate.id !== source.id)
    .map((candidate) => ({ candidate, score: similarityScore(source, candidate) }))
    .filter((item) => Number.isFinite(item.score) && item.score > 1.5)
    .sort((a, b) => b.score - a.score || String(a.candidate.name || "").localeCompare(String(b.candidate.name || "")))
    .slice(0, limit)
    .map((item) => compactScheme(item.candidate));
}
