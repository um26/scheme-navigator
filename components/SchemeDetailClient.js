"use client";

import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import RichText from "./RichText";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

function EligibilityRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 py-3 border-b border-borderc/60 last:border-0">
      <dt className="text-sm text-muted font-body">{label}</dt>
      <dd className="text-sm text-ink font-body font-semibold text-end">{value}</dd>
    </div>
  );
}

function RailLink({ href, children, primary = false }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={primary
        ? "detail-rail-primary"
        : "detail-rail-secondary"}
    >
      {children}
    </a>
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
    <div
      className={`max-w-6xl mx-auto px-4 py-8 md:py-12 transition-opacity page-enter ${translationLoading ? "opacity-70" : "opacity-100"}`}
      aria-busy={translationLoading ? "true" : "false"}
    >
      <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-body text-saffron-dark font-semibold hover:gap-2 transition-all">
        {t("scheme_back_to_browse")}
      </Link>

      <div className="mt-5 detail-hero relative overflow-hidden rounded-[1.75rem] border border-borderc bg-white/55 p-6 md:p-10 shadow-sm">
        <div className="detail-hero-motif" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-[0.1em] font-semibold px-3 py-1 rounded-full bg-saffron/10 text-saffron-dark border border-saffron/20">
              {scheme.level === "Central" ? t("browse_central") : t("browse_state")}
              {scheme.state ? ` · ${localizeState(locale, scheme.state)}` : ""}
            </span>
            {displayScheme.ministry && (
              <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-ledger/5 text-muted border border-borderc/60">
                {displayScheme.ministry}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-5xl lg:text-[3.5rem] leading-[1.08] text-ledger text-balance">
            {displayScheme.name}
          </h1>
          {displayScheme.description && (
            <RichText text={displayScheme.description} className="mt-5 text-base md:text-lg leading-relaxed text-ink/76 font-body max-w-3xl" />
          )}
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-10 items-start">
        <article className="min-w-0">
          {displayScheme.benefits && (
            <section className="benefit-callout">
              <div className="benefit-icon" aria-hidden="true">✦</div>
              <div>
                <div className="section-kicker">WHAT YOU GET</div>
                <h2 className="mt-1 font-display text-2xl md:text-3xl text-ledger">{t("scheme_benefits")}</h2>
                <RichText text={displayScheme.benefits} className="mt-3 text-ink/88 font-body leading-relaxed" />
              </div>
            </section>
          )}

          <section className="mt-7 bg-white/55 border border-borderc rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="section-kicker">DETERMINISTIC RULES</div>
                <h2 className="mt-1 font-display text-2xl text-ledger">{t("scheme_eligibility_criteria")}</h2>
              </div>
              <div className="eligibility-stamp" aria-hidden="true">✓</div>
            </div>
            <dl className="mt-3">
              <EligibilityRow label={t("scheme_age")} value={ageText} />
              <EligibilityRow label={t("scheme_gender_row")} value={genderText} />
              <EligibilityRow label={t("scheme_income_cap")} value={elig.maxIncome != null ? `₹${elig.maxIncome.toLocaleString("en-IN")}` : t("scheme_no_cap")} />
              <EligibilityRow label={t("scheme_category_row")} value={elig.categories && elig.categories.length > 0 ? elig.categories.join(", ") : t("scheme_any_val")} />
              <EligibilityRow label={t("scheme_bpl_required")} value={elig.requiresBPL ? t("guided_yes") : t("guided_no")} />
              <EligibilityRow label={t("scheme_disability_required")} value={elig.requiresDisability ? t("guided_yes") : t("guided_no")} />
            </dl>
            <p className="mt-4 text-xs text-muted font-body leading-relaxed">{t("scheme_eligibility_note")}</p>
          </section>

          {displayScheme.applicationProcess && (
            <section className="editorial-section mt-9">
              <div className="section-number">01</div>
              <div>
                <h2 className="font-display text-2xl text-ledger mb-3">{t("scheme_how_to_apply")}</h2>
                <RichText text={displayScheme.applicationProcess} className="text-ink/84 font-body leading-relaxed" />
              </div>
            </section>
          )}

          {displayScheme.documentsRequired && (
            <section className="editorial-section mt-9">
              <div className="section-number">02</div>
              <div>
                <h2 className="font-display text-2xl text-ledger mb-3">{t("scheme_documents_required")}</h2>
                <RichText text={displayScheme.documentsRequired} className="text-ink/84 font-body leading-relaxed" />
              </div>
            </section>
          )}

          <p className="mt-10 text-xs text-muted font-body border-t border-borderc pt-5 leading-relaxed">{t("scheme_source_note")}</p>
        </article>

        <aside className="detail-rail lg:sticky lg:top-32 rounded-2xl border border-borderc bg-white/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-borderc/60">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted font-body">Save for later</div>
              <div className="text-sm font-semibold text-ledger font-body">Keep this scheme handy</div>
            </div>
            <BookmarkButton schemeId={scheme.id} />
          </div>

          <div className="py-4 space-y-3">
            <RailLink href={scheme.applyUrl} primary>{t("scheme_apply_now")}</RailLink>
            <RailLink href={scheme.officialUrl}>{t("scheme_official_page")}</RailLink>
          </div>

          <div className="pt-4 border-t border-borderc/60 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-body">Coverage</div>
              <div className="mt-1 text-sm font-semibold text-ledger font-body">
                {scheme.level === "Central" ? t("browse_central") : localizeState(locale, scheme.state)}
              </div>
            </div>
            {displayScheme.tags && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-body">Category</div>
                <div className="mt-1 text-sm text-ink/80 font-body">{displayScheme.tags}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
