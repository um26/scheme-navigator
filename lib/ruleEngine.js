// lib/ruleEngine.js
//
// Deterministic eligibility engine — the "symbolic" half of the neuro-symbolic
// design. Never calls the LLM; output is 100% reproducible from the same inputs.

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalizeState(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function makeCheck(key, label, status, detail, constraint = true) {
  return { key, label, status, detail, constraint };
}

export function evaluateEligibility(profile = {}, scheme = {}) {
  const elig = scheme.eligibility || {};
  const checks = [];

  if (elig.minAge != null || elig.maxAge != null) {
    const range =
      elig.minAge != null && elig.maxAge != null
        ? `${elig.minAge}–${elig.maxAge} years`
        : elig.minAge != null
        ? `${elig.minAge}+ years`
        : `up to ${elig.maxAge} years`;
    if (!hasValue(profile.age)) {
      checks.push(makeCheck("age", "Age", "unknown", `Requires ${range}; your age is not saved`));
    } else {
      const ok = (elig.minAge == null || profile.age >= elig.minAge) && (elig.maxAge == null || profile.age <= elig.maxAge);
      checks.push(makeCheck("age", "Age", ok ? "pass" : "fail", `Requires ${range}; your profile says ${profile.age}`));
    }
  } else {
    checks.push(makeCheck("age", "Age", "pass", "No age restriction is structured in the dataset", false));
  }

  if (elig.gender && elig.gender !== "any") {
    if (!profile.gender) {
      checks.push(makeCheck("gender", "Gender", "unknown", `Open to ${elig.gender} applicants; your gender is not saved`));
    } else {
      const ok = profile.gender === elig.gender;
      checks.push(makeCheck("gender", "Gender", ok ? "pass" : "fail", `Open to ${elig.gender} applicants; your profile says ${profile.gender}`));
    }
  } else {
    checks.push(makeCheck("gender", "Gender", "pass", "Open to all genders in the structured fields", false));
  }

  if (elig.maxIncome != null) {
    const cap = `₹${Number(elig.maxIncome).toLocaleString("en-IN")}`;
    if (!hasValue(profile.annualIncome)) {
      checks.push(makeCheck("income", "Income", "unknown", `Annual family income must be ≤ ${cap}; your income is not saved`));
    } else {
      const ok = Number(profile.annualIncome) <= Number(elig.maxIncome);
      checks.push(makeCheck("income", "Income", ok ? "pass" : "fail", `Annual family income must be ≤ ${cap}; your profile says ₹${Number(profile.annualIncome).toLocaleString("en-IN")}`));
    }
  } else {
    checks.push(makeCheck("income", "Income", "pass", "No income cap is structured in the dataset", false));
  }

  if (Array.isArray(elig.categories) && elig.categories.length > 0) {
    if (!profile.category) {
      checks.push(makeCheck("category", "Category", "unknown", `Restricted to ${elig.categories.join(", ")}; your category is not saved`));
    } else {
      const ok = elig.categories.includes(profile.category);
      checks.push(makeCheck("category", "Category", ok ? "pass" : "fail", `Restricted to ${elig.categories.join(", ")}; your profile says ${profile.category}`));
    }
  } else {
    checks.push(makeCheck("category", "Category", "pass", "No social-category restriction is structured in the dataset", false));
  }

  if (elig.requiresBPL) {
    if (profile.isBPL == null) {
      checks.push(makeCheck("bpl", "BPL status", "unknown", "A BPL card is required; your BPL status is not saved"));
    } else {
      checks.push(makeCheck("bpl", "BPL status", profile.isBPL ? "pass" : "fail", `A BPL card is required; your profile says ${profile.isBPL ? "yes" : "no"}`));
    }
  } else {
    checks.push(makeCheck("bpl", "BPL status", "pass", "No BPL requirement is structured in the dataset", false));
  }

  if (elig.requiresDisability) {
    if (profile.hasDisability == null) {
      checks.push(makeCheck("disability", "Disability", "unknown", "Disability status is required; your status is not saved"));
    } else {
      checks.push(makeCheck("disability", "Disability", profile.hasDisability ? "pass" : "fail", `Disability status is required; your profile says ${profile.hasDisability ? "yes" : "no"}`));
    }
  } else {
    checks.push(makeCheck("disability", "Disability", "pass", "No disability requirement is structured in the dataset", false));
  }

  if (scheme.level === "Central") {
    checks.push(makeCheck("state", "Region", "pass", "Central scheme — available across India", false));
  } else if (scheme.state) {
    if (!profile.state) {
      checks.push(makeCheck("state", "Region", "unknown", `Available in ${scheme.state}; your state or UT is not saved`));
    } else {
      const ok = normalizeState(profile.state) === normalizeState(scheme.state);
      checks.push(makeCheck("state", "Region", ok ? "pass" : "fail", `Available in ${scheme.state}; your profile says ${profile.state}`));
    }
  } else {
    checks.push(makeCheck("state", "Region", "pass", "No state restriction is structured in the dataset", false));
  }

  const constrained = checks.filter((check) => check.constraint);
  const passed = constrained.filter((check) => check.status === "pass").length;
  const failed = constrained.filter((check) => check.status === "fail").length;
  const unknown = constrained.filter((check) => check.status === "unknown").length;
  const status = failed > 0 ? "not_eligible" : unknown > 0 ? "needs_info" : "likely_eligible";

  return {
    status,
    eligible: failed === 0,
    counts: { passed, failed, unknown, constrained: constrained.length },
    checks,
    failedChecks: checks.filter((check) => check.status === "fail").map((check) => check.key),
    unknownChecks: checks.filter((check) => check.status === "unknown").map((check) => check.key),
  };
}

export function checkEligibility(profile, scheme) {
  const result = evaluateEligibility(profile, scheme);
  return { eligible: result.eligible, failedChecks: result.failedChecks, unknownChecks: result.unknownChecks };
}

export function filterEligible(profile, schemes) {
  const results = [];
  for (const scheme of schemes) {
    if (evaluateEligibility(profile, scheme).eligible) results.push(scheme);
  }
  return results;
}

// Plain-language reasons come from the exact same deterministic checks as the filter.
export function explainChecks(profile, scheme) {
  return evaluateEligibility(profile, scheme).checks.map((check) => ({
    label: check.label,
    detail: check.detail,
    known: check.status !== "unknown",
    ok: check.status === "pass",
    status: check.status,
    constraint: check.constraint,
  }));
}
