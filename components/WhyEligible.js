"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";

// The rule engine (lib/ruleEngine.js explainChecks) always returns English labels
// (Age/Gender/Income/...) since it's shared server-side logic — this maps them to
// the current UI language for display. The longer `detail` sentences (with numbers
// already interpolated) stay in English for now; translating those would mean
// making the rule engine itself locale-aware, which is a bigger change than
// translating the UI chrome around it.
const LABEL_KEYS = {
  Age: "why_age",
  Gender: "why_gender",
  Income: "why_income",
  Category: "why_category",
  "BPL status": "why_bpl",
  Disability: "why_disability",
  Region: "why_region",
};

export default function WhyEligible({ checks }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!checks || checks.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-body font-semibold text-bottle hover:text-bottle-light flex items-center gap-1"
      >
        {open ? t("card_hide") : t("card_why_eligible")}
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-xs font-body text-ink/75 bg-khadi-dark/40 rounded-lg p-3 border border-borderc">
          {checks.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className={c.known ? "text-bottle" : "text-muted"}>{c.known ? "✓" : "–"}</span>
              <span>
                <span className="font-semibold">{t(LABEL_KEYS[c.label] || c.label)}:</span> {c.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
