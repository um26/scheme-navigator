// lib/relevanceRank.js
//
// Lexical TF-IDF ranking, deliberately NOT embeddings (see project handoff notes:
// Voyage AI requires a card on file, HF Inference API embeddings were unreliable,
// on-device transformers.js is architecturally broken on Vercel's serverless runtime —
// three separate dead ends, documented rather than hidden).
//
// This only ranks schemes the rule engine has ALREADY approved — it never decides
// eligibility, only which of the eligible schemes are most worth showing first.
//
// Known, honest limitation: bag-of-words TF-IDF has a real ceiling at ~4.7k documents.
// It can't capture "wants to start a business" as a concept distinct from literal word
// overlap. That's a real ceiling of this design, not a bug — worth saying plainly in
// an interview rather than glossing over.

// Words that are redundant with what the rule engine already decided deterministically
// (age, gender, state, bare numbers). Scoring on these caused false positives — e.g.
// "23 yr old" lexically matching "Old Age Pension" schemes.
const STOPWORDS = new Set([
  "a", "an", "the", "i", "am", "is", "are", "was", "were", "my", "me", "of", "in",
  "on", "at", "to", "for", "and", "or", "with", "from", "as", "by", "this", "that",
  "old", "olds", "year", "years", "yr", "yrs", "age", "aged",
  "male", "female", "man", "woman", "men", "women", "boy", "girl",
  // All Indian state/UT names + common adjectival forms are excluded from scoring —
  // the rule engine already used state as a hard filter; scoring on it just biases
  // toward schemes that repeat the state name in their title.
  "andhra", "pradesh", "arunachal", "assam", "bihar", "chhattisgarh", "goa",
  "gujarat", "haryana", "himachal", "jharkhand", "karnataka", "kerala",
  "madhya", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
  "odisha", "punjab", "rajasthan", "sikkim", "tamil", "nadu", "telangana",
  "tripura", "uttar", "uttarakhand", "bengal", "delhi", "jammu", "kashmir",
  "ladakh", "puducherry", "chandigarh", "lakshadweep",
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w)); // strip bare numbers
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [k, v] of tf) tf.set(k, v / tokens.length);
  return tf;
}

/**
 * Builds document frequency counts across a corpus of scheme documents.
 * `docs` is an array of token arrays.
 */
function docFreq(docs) {
  const df = new Map();
  for (const tokens of docs) {
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return df;
}

const RELEVANCE_FLOOR = 0.15;

/**
 * Ranks `schemes` (already rule-engine-approved) against the user's free-text query.
 * Returns schemes sorted by score, annotated with `_score`, filtered to the floor.
 * If nothing clears the floor, returns an empty array — callers should show
 * "no confident match" rather than a weak/misleading result.
 */
export function rankByRelevance(queryText, schemes) {
  if (schemes.length === 0) return [];

  const queryTokens = tokenize(queryText);
  const schemeDocs = schemes.map((s) =>
    tokenize(`${s.name} ${s.description || ""} ${s.eligibilityText || ""}`)
  );
  const N = schemeDocs.length;
  const df = docFreq(schemeDocs);

  const idf = (term) => Math.log((N + 1) / ((df.get(term) || 0) + 1)) + 1;

  const scored = schemes.map((scheme, i) => {
    const tf = termFreq(schemeDocs[i]);
    let score = 0;
    for (const qt of queryTokens) {
      if (tf.has(qt)) score += tf.get(qt) * idf(qt);
    }
    // Normalize roughly into 0..1 range by query length so the floor is meaningful
    // regardless of how long the user's free text was.
    const normalized = queryTokens.length > 0 ? score / Math.sqrt(queryTokens.length) : 0;
    return { ...scheme, _score: normalized };
  });

  return scored
    .filter((s) => s._score >= RELEVANCE_FLOOR)
    .sort((a, b) => b._score - a._score);
}
