"use client";

import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";
import { stripMarkdown } from "../lib/markdownLite";

export default function CompareTable({ schemes }) {
  const { t, locale, localizeSchemeContent } = useLanguage();
  if (!schemes || schemes.length < 2) return null;
  const localized = schemes.map((scheme) => ({ canonical: scheme, display: localizeSchemeContent(scheme) }));

  const fmtIncome = (v) => v != null ? `₹${v.toLocaleString("en-IN")}` : t("scheme_no_cap");
  const fmtAge = (elig) => elig.minAge == null && elig.maxAge == null ? t("scheme_no_restriction") : `${elig.minAge ?? t("scheme_any_val")}${elig.maxAge != null ? `–${elig.maxAge}` : "+"} ${t("scheme_years")}`;
  const fmtRegion = (s) => `${s.level === "Central" ? t("browse_central") : t("browse_state")}${s.state ? ` · ${localizeState(locale, s.state)}` : ""}`;
  const fmtGender = (value) => !value || value === "any" ? t("scheme_any_val") : value === "male" ? t("guided_gender_male") : t("guided_gender_female");

  const rows = [
    { label: t("why_region"), get: fmtRegion },
    { label: t("scheme_age"), get: (s) => fmtAge(s.eligibility || {}) },
    { label: t("scheme_gender_row"), get: (s) => fmtGender(s.eligibility?.gender) },
    { label: t("scheme_income_cap"), get: (s) => fmtIncome(s.eligibility?.maxIncome) },
    { label: t("scheme_category_row"), get: (s) => s.eligibility?.categories?.length ? s.eligibility.categories.join(", ") : t("scheme_any_val") },
    { label: t("scheme_bpl_required"), get: (s) => s.eligibility?.requiresBPL ? t("guided_yes") : t("guided_no") },
    { label: t("scheme_disability_required"), get: (s) => s.eligibility?.requiresDisability ? t("guided_yes") : t("guided_no") },
  ];

  return (
    <div className="overflow-x-auto border border-borderc rounded-lg bg-white/60">
      <table className="w-full text-sm font-body">
        <thead><tr className="border-b border-borderc"><th className="text-start p-3 text-muted font-medium w-32">{t("scheme_eligibility_criteria")}</th>{localized.map(({ canonical, display }) => <th key={canonical.id} className="text-start p-3 font-display text-ledger font-normal">{display.name}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.label} className="border-b border-borderc/60 last:border-0"><td className="p-3 text-muted">{row.label}</td>{localized.map(({ canonical }) => <td key={canonical.id} className="p-3 text-ink">{row.get(canonical)}</td>)}</tr>)}
          <tr><td className="p-3 text-muted">{t("scheme_benefits")}</td>{localized.map(({ canonical, display }) => { const benefit = stripMarkdown(display.benefits || ""); return <td key={canonical.id} className="p-3 text-bottle text-xs">{benefit.slice(0,120)}{benefit.length > 120 ? "…" : ""}</td>; })}</tr>
        </tbody>
      </table>
    </div>
  );
}
