"use client";

import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import RichText from "./RichText";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

function EligibilityRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 py-2 border-b border-borderc/60 last:border-0">
      <dt className="text-sm text-muted font-body">{label}</dt>
      <dd className="text-sm text-ink font-body font-medium text-end">{value}</dd>
    </div>
  );
}

export default function SchemeDetailClient({ scheme }) {
  const { t, locale, localizeSchemeContent, translationLoading } = useLanguage();
  const displayScheme = localizeSchemeContent(scheme);
  const elig = scheme.eligibility || {};

  const ageText =
    elig.minAge != null || elig.maxAge != null
      ? `${elig.minAge ?? t("scheme_any_val")}${elig.maxAge != null ? `–${elig.maxAge}` : "+"} ${t("scheme_years")}`
      : t("scheme_no_restriction");

  const genderText =
    elig.gender === "any" || !elig.gender
      ? t("scheme_any_val")
      : elig.gender === "male"
      ? t("guided_gender_male")
      : t("guided_gender_female");

  return (
    <div className={`max-w-3xl mx-auto px-4 py-10 transition-opacity ${translationLoading ? "opacity-80" : "opacity-100"}`} aria-busy={translationLoading ? "true" : "false"}>
      <Link href="/browse" className="text-sm font-body text-bottle hover:underline">
        {t("scheme_back_to_browse")}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl md:text-3xl text-ledger">{displayScheme.name}</h1>
        <BookmarkButton schemeId={scheme.id} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bottle/10 text-bottle">
          {scheme.level === "Central" ? t("browse_central") : t("browse_state")}
          {scheme.state ? ` · ${localizeState(locale, scheme.state)}` : ""}
        </span>
        {displayScheme.ministry && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-saffron/10 text-saffron-dark">{displayScheme.ministry}</span>}
        {displayScheme.tags && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-ledger/10 text-ledger">{displayScheme.tags}</span>}
      </div>

      {displayScheme.description && <section className="mt-6"><h2 className="font-display text-lg text-ledger mb-2">{t("scheme_about")}</h2><RichText text={displayScheme.description} className="text-ink/85 font-body" /></section>}
      {displayScheme.benefits && <section className="mt-6 bg-saffron/10 border border-saffron/30 rounded-lg p-5"><h2 className="font-display text-lg text-ledger mb-2">{t("scheme_benefits")}</h2><RichText text={displayScheme.benefits} className="text-ink font-body" /></section>}

      <section className="mt-6 bg-white/60 border border-borderc rounded-lg p-5">
        <h2 className="font-display text-lg text-ledger mb-2">{t("scheme_eligibility_criteria")}</h2>
        <dl>
          <EligibilityRow label={t("scheme_age")} value={ageText} />
          <EligibilityRow label={t("scheme_gender_row")} value={genderText} />
          <EligibilityRow label={t("scheme_income_cap")} value={elig.maxIncome != null ? `₹${elig.maxIncome.toLocaleString("en-IN")}` : t("scheme_no_cap")} />
          <EligibilityRow label={t("scheme_category_row")} value={elig.categories && elig.categories.length > 0 ? elig.categories.join(", ") : t("scheme_any_val")} />
          <EligibilityRow label={t("scheme_bpl_required")} value={elig.requiresBPL ? t("guided_yes") : t("guided_no")} />
          <EligibilityRow label={t("scheme_disability_required")} value={elig.requiresDisability ? t("guided_yes") : t("guided_no")} />
        </dl>
        <p className="mt-3 text-xs text-muted font-body">{t("scheme_eligibility_note")}</p>
      </section>

      {displayScheme.applicationProcess && <section className="mt-6"><h2 className="font-display text-lg text-ledger mb-2">{t("scheme_how_to_apply")}</h2><RichText text={displayScheme.applicationProcess} className="text-ink/85 font-body" /></section>}
      {displayScheme.documentsRequired && <section className="mt-6"><h2 className="font-display text-lg text-ledger mb-2">{t("scheme_documents_required")}</h2><RichText text={displayScheme.documentsRequired} className="text-ink/85 font-body" /></section>}

      {(scheme.applyUrl || scheme.officialUrl) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {scheme.applyUrl && <a href={scheme.applyUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-lg bg-bottle text-white font-body font-semibold hover:bg-bottle-light transition-colors">{t("scheme_apply_now")}</a>}
          {scheme.officialUrl && <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-lg border border-borderc bg-white/60 font-body font-semibold hover:bg-white transition-colors">{t("scheme_official_page")}</a>}
        </div>
      )}

      <p className="mt-8 text-xs text-muted font-body border-t border-borderc pt-4">{t("scheme_source_note")}</p>
    </div>
  );
}
