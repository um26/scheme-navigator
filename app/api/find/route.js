import { NextResponse } from "next/server";
import { extractProfile, explainMatches } from "../../../lib/groq";
import { filterEligible, explainChecks } from "../../../lib/ruleEngine";
import { rankByRelevance } from "../../../lib/relevanceRank";
import { validateExplanation } from "../../../lib/guardrail";
import { isValidLocale } from "../../../lib/i18n/config";
import { translate } from "../../../lib/i18n/dictionaries";
import schemes from "../../../public/data/schemes.json";

const MAX_EXPLAINED = 8;
const MAX_RANK_TEXT = "additional context for ranking";

export async function POST(request) {
  try {
    const body = await request.json();
    const language = isValidLocale(body.language) ? body.language : "en";

    let profile;
    let rankingText;

    if (body.mode === "guided" && body.profile) {
      // Guided flow: the person answered structured questions directly, so we skip
      // the LLM extraction step entirely — the profile IS already structured. Only
      // free-text "additionalContext" (optional) goes anywhere near the LLM, and
      // only for the write-up, never for the eligibility decision.
      profile = body.profile;
      rankingText = [profile.occupation, body.additionalContext].filter(Boolean).join(" ") || MAX_RANK_TEXT;
    } else if (body.text && typeof body.text === "string") {
      if (body.text.trim().length < 5) {
        return NextResponse.json(
          { error: "Please describe your situation in a sentence or two." },
          { status: 400 }
        );
      }
      profile = await extractProfile(body.text);
      rankingText = body.text;
    } else {
      return NextResponse.json({ error: "No input provided." }, { status: 400 });
    }

    // Deterministic rule engine decides eligibility. Zero LLM involvement.
    const eligible = filterEligible(profile, schemes);
    const ranked = rankByRelevance(rankingText, eligible);

    if (ranked.length === 0) {
      return NextResponse.json({
        profile,
        matches: [],
        explanation: null,
        totalEligible: eligible.length,
        message:
          eligible.length > 0
            ? translate(language, "results_no_confident_match")
            : translate(language, "results_none_eligible"),
      });
    }

    const topMatches = ranked.slice(0, MAX_EXPLAINED);
    const explanation = await explainMatches(profile, topMatches, language);

    // Broader candidate pool (beyond the top 8 explained matches) for the client-side
    // on-device semantic re-ranker — trimmed fields only, this is not meant to be
    // displayed directly, just embedded in-browser. Capped at 60 to keep in-browser
    // WASM inference from ranked.slice(0, 8) results feeling slow if someone tries it.
    const candidatePool = ranked.slice(0, 60).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      level: s.level,
      state: s.state,
    }));

    const allNames = schemes.map((s) => s.name).filter(Boolean);
    const approvedNames = topMatches.map((s) => s.name).filter(Boolean);
    const guardrailResult = validateExplanation(explanation, approvedNames, allNames);

    // Transparency layer: plain-language reasons per match, straight from the rule
    // engine's own checks — not generated or paraphrased by the LLM.
    const matchesWithChecks = topMatches.map((s) => ({
      ...s,
      _checks: explainChecks(profile, s),
    }));

    return NextResponse.json({
      profile,
      matches: matchesWithChecks,
      explanation,
      guardrail: guardrailResult,
      totalEligible: eligible.length,
      candidatePool,
    });
  } catch (err) {
    console.error("[/api/find] error:", err);
    return NextResponse.json(
      { error: "Something went wrong processing your request. Please try again." },
      { status: 500 }
    );
  }
}
