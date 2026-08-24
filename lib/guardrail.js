// lib/guardrail.js
//
// After the LLM writes an explanation (lib/groq.js explainMatches), this checks that
// it didn't mention any scheme outside the set the rule engine approved. This is the
// safety net for the neuro-symbolic design: even though the prompt constrains the
// LLM, prompts can be imperfectly followed, so we verify the output too rather than
// trusting the prompt alone.
//
// Approach: fuzzy substring/token-overlap match against the FULL scheme catalog
// (not just the approved ones), flagging any scheme name outside the approved set
// that appears to be referenced in the explanation text.

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(name) {
  const STOP = new Set(["scheme", "yojana", "the", "for", "of", "and", "a", "an"]);
  return normalize(name)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * @param {string} explanationText - the LLM's generated explanation
 * @param {string[]} approvedNames - names of schemes the rule engine approved
 * @param {string[]} allSchemeNames - the full catalog, to check for out-of-set mentions
 * @returns {{ safe: boolean, flaggedSchemes: string[] }}
 */
export function validateExplanation(explanationText, approvedNames, allSchemeNames) {
  const normalizedExplanation = normalize(explanationText);
  const approvedSet = new Set(approvedNames.map(normalize));

  const flagged = [];
  for (const candidateName of allSchemeNames) {
    const normalizedCandidate = normalize(candidateName);
    if (approvedSet.has(normalizedCandidate)) continue; // it's allowed, skip

    const tokens = significantTokens(candidateName);
    if (tokens.length === 0) continue;
    // Require most of the significant tokens to appear, in order to avoid
    // flagging on single common words (e.g. "pension") shared across many schemes.
    const matchedTokens = tokens.filter((t) => normalizedExplanation.includes(t));
    const overlapRatio = matchedTokens.length / tokens.length;
    if (overlapRatio >= 0.8 && tokens.length >= 2) {
      flagged.push(candidateName);
    }
  }

  return { safe: flagged.length === 0, flaggedSchemes: flagged };
}
