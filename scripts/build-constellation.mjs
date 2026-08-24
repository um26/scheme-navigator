// scripts/build-constellation.mjs
//
// Projects all schemes into 2D based on their ELIGIBILITY CRITERIA (not text) using
// PCA, so schemes that serve similar populations cluster near each other regardless
// of which ministry wrote them. Run at build time (same reasoning as build-map.mjs —
// keeps this out of the client bundle and off the critical path) using the already-
// generated public/data/schemes.json, so this must run AFTER build-schemes.mjs.
//
// Feature vector per scheme (all numeric, all derived from eligibility.* fields
// that lib/ruleEngine.js already treats as the source of truth):
//   [minAgeNorm, maxAgeNorm, hasAgeLimit, genderMale, genderFemale, genderAny,
//    incomeCapNorm, hasIncomeCap, isSC, isST, isOBC, isEWS, hasNoCasteRestriction,
//    requiresBPL, requiresDisability, isCentral]
//
// PCA (via ml-pca, pure JS, no native deps) reduces this to 2 components for a
// scatter-plot "constellation" — schemes close together have similar eligibility
// shape, not similar wording.

import { PCA } from "ml-pca";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SCHEMES_FILE = path.join(process.cwd(), "public", "data", "schemes.json");
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "constellation.json");

const MAX_AGE_CAP = 100;
const MAX_INCOME_CAP = 1000000; // ₹10L — values above this clipped to 1.0

function toFeatureVector(scheme) {
  const e = scheme.eligibility || {};
  const cats = e.categories || [];

  return [
    e.minAge != null ? e.minAge / MAX_AGE_CAP : 0,
    e.maxAge != null ? e.maxAge / MAX_AGE_CAP : 1,
    e.minAge != null || e.maxAge != null ? 1 : 0,
    e.gender === "male" ? 1 : 0,
    e.gender === "female" ? 1 : 0,
    !e.gender || e.gender === "any" ? 1 : 0,
    e.maxIncome != null ? Math.min(e.maxIncome / MAX_INCOME_CAP, 1) : 1,
    e.maxIncome != null ? 1 : 0,
    cats.includes("SC") ? 1 : 0,
    cats.includes("ST") ? 1 : 0,
    cats.includes("OBC") ? 1 : 0,
    cats.includes("EWS") ? 1 : 0,
    cats.length === 0 ? 1 : 0,
    e.requiresBPL ? 1 : 0,
    e.requiresDisability ? 1 : 0,
    scheme.level === "Central" ? 1 : 0,
  ];
}

function main() {
  if (!existsSync(SCHEMES_FILE)) {
    throw new Error("schemes.json not found — build-constellation.mjs must run after build-schemes.mjs");
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const schemes = JSON.parse(readFileSync(SCHEMES_FILE, "utf-8"));
  console.log(`[build-constellation] projecting ${schemes.length} schemes...`);

  const vectors = schemes.map(toFeatureVector);
  // scale:false — features are already comparable 0..1 ranges, and z-score scaling
  // divides by each column's standard deviation, which blows up (divide-by-zero) on
  // any eligibility flag that's constant across the whole dataset (e.g. if literally
  // no scheme restricts by EWS). Centering alone avoids that failure mode.
  const pca = new PCA(vectors, { center: true, scale: false });
  const projected = pca.predict(vectors, { nComponents: 2 }).to2DArray();

  // Normalize to a friendly [-100, 100] range for easy client-side rendering.
  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const xMax = Math.max(...xs.map(Math.abs)) || 1;
  const yMax = Math.max(...ys.map(Math.abs)) || 1;

  const points = schemes.map((s, i) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    state: s.state,
    x: Math.round((projected[i][0] / xMax) * 1000) / 10,
    y: Math.round((projected[i][1] / yMax) * 1000) / 10,
  }));

  const explainedVariance = pca.getExplainedVariance().slice(0, 2);

  writeFileSync(
    OUT_FILE,
    JSON.stringify({ points, explainedVariance })
  );
  console.log(`[build-constellation] wrote ${points.length} points to ${OUT_FILE}`);
  console.log(`[build-constellation] explained variance (PC1, PC2): ${explainedVariance.map((v) => (v * 100).toFixed(1) + "%").join(", ")}`);
}

main();
