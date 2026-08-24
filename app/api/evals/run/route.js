import { NextResponse } from "next/server";
import { extractProfile } from "../../../../lib/groq";
import { EVAL_TEST_SET } from "../../../../data/evalTestSet";

const FIELDS = ["age", "gender", "annualIncome", "state", "category", "isBPL", "hasDisability"];

function normalize(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.trim().toLowerCase();
  return v;
}

function fieldMatch(extracted, expected) {
  return normalize(extracted) === normalize(expected);
}

// Confusion-matrix-style scoring per field, aggregated across the whole test set:
//   TP: expected a value, extracted the correct value
//   FP: extracted a value that's wrong or wasn't expected (including hallucinating
//       a value where the gold answer is deliberately null)
//   FN: expected a value, extraction returned null (missed it)
//   TN: both null (correctly abstained on an ambiguous case)
function scoreField(cases, field) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const c of cases) {
    const expected = c.expected[field];
    const extracted = c.extracted?.[field] ?? null;
    const expectedIsNull = expected == null;
    const extractedIsNull = extracted == null;

    if (expectedIsNull && extractedIsNull) tn++;
    else if (!expectedIsNull && !extractedIsNull && fieldMatch(extracted, expected)) tp++;
    else if (!extractedIsNull) fp++;
    else fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  return { field, tp, fp, fn, tn, precision, recall, f1 };
}

export async function POST() {
  try {
    const results = [];
    // Run sequentially (not Promise.all) to stay well under Groq's rate limits on
    // the free tier — this is a live eval, not a cached demo.
    for (const testCase of EVAL_TEST_SET) {
      try {
        const extracted = await extractProfile(testCase.text);
        results.push({ ...testCase, extracted, error: null });
      } catch (err) {
        results.push({ ...testCase, extracted: null, error: String(err.message || err) });
      }
    }

    const validResults = results.filter((r) => !r.error);
    const fieldScores = FIELDS.map((f) => scoreField(validResults, f));

    const macroF1 =
      fieldScores.filter((s) => s.f1 != null).reduce((sum, s) => sum + s.f1, 0) /
      (fieldScores.filter((s) => s.f1 != null).length || 1);

    return NextResponse.json({
      testSetSize: EVAL_TEST_SET.length,
      succeeded: validResults.length,
      failed: results.length - validResults.length,
      fieldScores,
      macroF1,
      results,
    });
  } catch (err) {
    console.error("[/api/evals/run] error:", err);
    return NextResponse.json({ error: "Eval run failed: " + String(err.message || err) }, { status: 500 });
  }
}
