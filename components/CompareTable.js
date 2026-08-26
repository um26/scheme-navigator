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
    <div className="overflow-x-auto rounded-xl border border-borderc bg-white/60 shadow-sm">
      <table className="min-w-[720px] w-full text-sm font-body">
        <thead>
          <tr className="border-b border-borderc">
            <th className="sticky start-0 z-10 w-36 bg-khadi p-3 text-start font-medium text-muted">{t("scheme_eligibility_criteria")}</th>
            {localized.map(({ canonical, display }) => (
              <th key={canonical.id} className="min-w-[210px] p-3 text-start font-display font-normal text-ledger">{display.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-borderc/60 last:border-0">
              <td className="sticky start-0 z-10 bg-khadi p-3 text-muted">{row.label}</td>
              {localized.map(({ canonical }) => <td key={canonical.id} className="p-3 text-ink">{row.get(canonical)}</td>)}
            </tr>
          ))}
          <tr>
            <td className="sticky start-0 z-10 bg-khadi p-3 text-muted">{t("scheme_benefits")}</td>
            {localized.map(({ canonical, display }) => {
              const benefit = stripMarkdown(display.benefits || "");
              return <td key={canonical.id} className="p-3 text-xs text-bottle">{benefit.slice(0, 160)}{benefit.length > 160 ? "…" : ""}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
