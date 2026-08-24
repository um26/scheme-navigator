// lib/ruleEngine.js
//
// Deterministic eligibility engine — the "symbolic" half of the neuro-symbolic
// design. Never calls the LLM; output is 100% reproducible from the same inputs.

function ageOk(profile, elig) {
  if (profile.age == null) return true;
  if (elig.minAge != null && profile.age < elig.minAge) return false;
  if (elig.maxAge != null && profile.age > elig.maxAge) return false;
  return true;
}
function genderOk(profile, elig) {
  if (!elig.gender || elig.gender === "any") return true;
  if (!profile.gender) return true;
  return profile.gender === elig.gender;
}
function incomeOk(profile, elig) {
  if (elig.maxIncome == null) return true;
  if (profile.annualIncome == null) return true;
  return profile.annualIncome <= elig.maxIncome;
}
function categoryOk(profile, elig) {
  if (!elig.categories || elig.categories.length === 0) return true;
  if (!profile.category) return true;
  return elig.categories.includes(profile.category);
}
function bplOk(profile, elig) {
  if (!elig.requiresBPL) return true;
  if (profile.isBPL == null) return true;
  return profile.isBPL === true;
}
function disabilityOk(profile, elig) {
  if (!elig.requiresDisability) return true;
  if (profile.hasDisability == null) return true;
  return profile.hasDisability === true;
}
function stateOk(profile, scheme) {
  if (scheme.level === "Central") return true;
  if (!scheme.state) return true;
  if (!profile.state) return true;
  return normalizeState(scheme.state) === normalizeState(profile.state);
}
function normalizeState(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

export function checkEligibility(profile, scheme) {
  const elig = scheme.eligibility || {};
  const checks = [
    { key: "age", ok: ageOk(profile, elig) },
    { key: "gender", ok: genderOk(profile, elig) },
    { key: "income", ok: incomeOk(profile, elig) },
    { key: "category", ok: categoryOk(profile, elig) },
    { key: "bpl", ok: bplOk(profile, elig) },
    { key: "disability", ok: disabilityOk(profile, elig) },
    { key: "state", ok: stateOk(profile, scheme) },
  ];
  const failed = checks.filter((c) => !c.ok).map((c) => c.key);
  return { eligible: failed.length === 0, failedChecks: failed };
}

export function filterEligible(profile, schemes) {
  const results = [];
  for (const scheme of schemes) {
    const { eligible } = checkEligibility(profile, scheme);
    if (eligible) results.push(scheme);
  }
  return results;
}

// ---- transparency layer: plain-language reasons the rule engine approved a scheme ----
// Purely descriptive, derived from the same deterministic checks above — this is what
// makes the rule engine's decision legible to the person, not just a pass/fail.
export function explainChecks(profile, scheme) {
  const elig = scheme.eligibility || {};
  const notes = [];

  if (elig.minAge != null || elig.maxAge != null) {
    const range =
      elig.minAge != null && elig.maxAge != null
        ? `${elig.minAge}\u2013${elig.maxAge} years`
        : elig.minAge != null
        ? `${elig.minAge}+ years`
        : `up to ${elig.maxAge} years`;
    notes.push({
      label: "Age",
      detail: profile.age != null ? `Requires ${range}; you said ${profile.age}` : `Requires ${range}`,
      known: profile.age != null,
    });
  } else {
    notes.push({ label: "Age", detail: "No age restriction", known: true });
  }

  if (elig.gender && elig.gender !== "any") {
    notes.push({
      label: "Gender",
      detail: `Open to ${elig.gender} applicants${profile.gender ? ` \u2014 you said ${profile.gender}` : ""}`,
      known: !!profile.gender,
    });
  } else {
    notes.push({ label: "Gender", detail: "Open to all genders", known: true });
  }

  if (elig.maxIncome != null) {
    notes.push({
      label: "Income",
      detail:
        profile.annualIncome != null
          ? `Annual income must be \u2264 \u20b9${elig.maxIncome.toLocaleString("en-IN")}; you said \u20b9${profile.annualIncome.toLocaleString("en-IN")}`
          : `Annual income must be \u2264 \u20b9${elig.maxIncome.toLocaleString("en-IN")}`,
      known: profile.annualIncome != null,
    });
  } else {
    notes.push({ label: "Income", detail: "No income cap specified", known: true });
  }

  if (elig.categories && elig.categories.length > 0) {
    notes.push({
      label: "Category",
      detail: `Restricted to ${elig.categories.join(", ")}${profile.category ? ` \u2014 you said ${profile.category}` : ""}`,
      known: !!profile.category,
    });
  } else {
    notes.push({ label: "Category", detail: "Open to all categories", known: true });
  }

  if (elig.requiresBPL) {
    notes.push({
      label: "BPL status",
      detail: profile.isBPL != null ? `Requires BPL card \u2014 you said ${profile.isBPL ? "yes" : "no"}` : "Requires a BPL card",
      known: profile.isBPL != null,
    });
  }

  if (elig.requiresDisability) {
    notes.push({
      label: "Disability",
      detail: profile.hasDisability != null ? `Requires disability status \u2014 you said ${profile.hasDisability ? "yes" : "no"}` : "Requires disability status",
      known: profile.hasDisability != null,
    });
  }

  if (scheme.level === "Central") {
    notes.push({ label: "Region", detail: "Central scheme \u2014 available across India", known: true });
  } else if (scheme.state) {
    notes.push({
      label: "Region",
      detail: profile.state ? `Available in ${scheme.state} \u2014 you said ${profile.state}` : `Available in ${scheme.state}`,
      known: !!profile.state,
    });
  }

  return notes;
}
