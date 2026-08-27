"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import BookmarkButton from "./BookmarkButton";
import EligibilityEvidence from "./EligibilityEvidence";
import RichText from "./RichText";
import SchemeCard from "./SchemeCard";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";
import { useProfile } from "../lib/useProfile";
import { evaluateEligibility } from "../lib/ruleEngine";

const FIELD_LABEL_KEYS = {
  name: "scheme_field_name",
  description: "scheme_field_description",
  benefits: "scheme_field_benefits",
  ministry: "scheme_field_ministry",
  tags: "scheme_field_tags",
  applicationProcess: "scheme_field_applicationProcess",
  documentsRequired: "scheme_field_documentsRequired",
  eligibilityText: "scheme_field_eligibilityText",
  eligibility: "scheme_field_eligibility",
  state: "scheme_field_state",
  level: "scheme_field_level",
  applyUrl: "scheme_field_applyUrl",
  officialUrl: "scheme_field_officialUrl",
};

function EligibilityRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-borderc/60 py-2 last:border-0">
      <dt className="text-sm text-muted font-body">{label}</dt>
      <dd className="text-end text-sm font-body font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function SchemeDetailClient({ scheme, returnTo = null, relatedSchemes = [], changeInfo = null }) {
  const router = useRouter();
  const { t, locale, localizeSchemeContent, translationLoading } = useLanguage();
  const { profile, hydrated: profileHydrated, hasProfile, activeProfileLabel } = useProfile();
  const displayScheme = localizeSchemeContent(scheme);
  const elig = scheme.eligibility || {};

  const personalResult = useMemo(
    () => (profileHydrated && hasProfile ? evaluateEligibility(profile, scheme) : null),
    [profileHydrated, hasProfile, profile, scheme]
  );

  const relatedForDisplay = useMemo(() => {
    if (!Array.isArray(relatedSchemes)) return [];
    if (personalResult?.status === "not_eligible") {
      const fitting = relatedSchemes.filter((item) => evaluateEligibility(profile, item).status !== "not_eligible");
      if (fitting.length) return fitting.slice(0, 4);
    }
    return relatedSchemes.slice(0, 4);
  }, [relatedSchemes, personalResult, profile]);

  const ageText = elig.minAge != null || elig.maxAge != null
    ? `${elig.minAge ?? t("scheme_any_val")}${elig.maxAge != null ? `–${elig.maxAge}` : "+"} ${t("scheme_years")}`
    : t("scheme_no_restriction");
  const genderText = elig.gender === "any" || !elig.gender
    ? t("scheme_any_val")
    : elig.gender === "male" ? t("guided_gender_male") : t("guided_gender_female");
  const incomeText = elig.maxIncome != null ? `₹${elig.maxIncome.toLocaleString("en-IN")}` : t("scheme_no_cap");
  const hasActions = Boolean(scheme.applyUrl || scheme.officialUrl);
  const additionalConditions = Array.isArray(scheme.additionalConditions) ? scheme.additionalConditions : [];

  function backToBrowse() {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push("/browse");
  }

  function fieldLabel(field) {
    const key = FIELD_LABEL_KEYS[field];
    return key ? t(key) : field;
  }

  function conditionLabel(condition) {
    const key = condition?.key ? `elig_condition_${condition.key}` : null;
    return key ? t(key) : t("elig_check_additional");
  }

  const sectionLinks = [
    displayScheme.description && ["about", t("scheme_about")],
    displayScheme.benefits && ["benefits", t("scheme_benefits")],
    ["eligibility", t("scheme_eligibility_criteria")],
    displayScheme.applicationProcess && ["apply", t("scheme_how_to_apply")],
    displayScheme.documentsRequired && ["documents", t("scheme_documents_required")],
    relatedForDisplay.length > 0 && ["related", personalResult?.status === "not_eligible" ? t("scheme_section_alternatives") : t("scheme_section_similar")],
  ].filter(Boolean);

  const changedFieldText = Array.isArray(changeInfo?.fields)
    ? changeInfo.fields.slice(0, 4).map((field) => fieldLabel(field.field)).join(", ")
    : "";
  const changeMoreText = Array.isArray(changeInfo?.fields) && changeInfo.fields.length > 4
    ? t("scheme_catalog_more", { n: changeInfo.fields.length - 4 })
    : "";

  return (
    <div className={`mx-auto max-w-3xl px-4 py-10 transition-opacity ${hasActions ? "pb-28 md:pb-10" : ""} ${translationLoading ? "opacity-80" : "opacity-100"}`} aria-busy={translationLoading ? "true" : "false"}>
      <button type="button" onClick={backToBrowse} className="text-sm font-body text-bottle hover:underline">{t("scheme_back_to_browse")}</button>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl text-ledger md:text-3xl">{displayScheme.name}</h1>
        <BookmarkButton schemeId={scheme.id} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-bottle/10 px-3 py-1 text-xs font-semibold text-bottle">
          {scheme.level === "Central" ? t("browse_central") : t("browse_state")}{scheme.state ? ` · ${localizeState(locale, scheme.state)}` : ""}
        </span>
        {displayScheme.ministry && <span className="rounded-full bg-saffron/10 px-3 py-1 text-xs font-semibold text-saffron-dark">{displayScheme.ministry}</span>}
        {displayScheme.tags && <span className="rounded-full bg-ledger/10 px-3 py-1 text-xs font-semibold text-ledger">{displayScheme.tags}</span>}
      </div>

      {changeInfo && (
        <div className="mt-4 rounded-xl border border-saffron/35 bg-saffron/10 p-3 text-xs font-body text-ink/80">
          <span className="font-semibold text-saffron-dark">{t("scheme_catalog_update")}</span>{" "}
          {Array.isArray(changeInfo.fields) && changeInfo.fields.length
            ? t("scheme_catalog_changed", { fields: changedFieldText, more: changeMoreText })
            : t("scheme_catalog_new")}
          {" "}<Link href="/updates" className="font-semibold text-bottle hover:underline">{t("scheme_view_updates")}</Link>
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-borderc bg-white/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted font-body">{t("scheme_age")}</p><p className="mt-1 text-sm font-body font-semibold text-ledger">{ageText}</p></div>
        <div className="rounded-xl border border-borderc bg-white/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted font-body">{t("scheme_gender_row")}</p><p className="mt-1 text-sm font-body font-semibold text-ledger">{genderText}</p></div>
        <div className="rounded-xl border border-borderc bg-white/60 p-3"><p className="text-[11px] uppercase tracking-wide text-muted font-body">{t("scheme_income_cap")}</p><p className="rtl-isolate mt-1 text-sm font-body font-semibold text-ledger">{incomeText}</p></div>
      </div>

      {profileHydrated && hasProfile ? (
        <EligibilityEvidence scheme={scheme} profile={profile} />
      ) : profileHydrated ? (
        <div className="mt-6 rounded-xl border border-borderc bg-white/50 p-4 text-sm font-body text-ink/75">
          {t("scheme_personal_prompt")} <Link href="/profile" className="font-semibold text-bottle hover:underline">{t("scheme_add_profile")}</Link>
        </div>
      ) : null}

      <nav aria-label={t("scheme_sections_aria")} className="nav-scroll sticky top-[7.25rem] z-30 -mx-1 mt-5 flex gap-1 overflow-x-auto rounded-xl border border-borderc bg-khadi/95 p-1 shadow-sm backdrop-blur-md md:top-[5.75rem]">
        {sectionLinks.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-2 text-xs font-body font-semibold text-ledger transition-colors hover:bg-white/60 hover:text-saffron-dark">{label}</a>)}
      </nav>

      {displayScheme.description && <section id="about" className="mt-6"><h2 className="mb-2 font-display text-lg text-ledger">{t("scheme_about")}</h2><RichText text={displayScheme.description} className="text-ink/85 font-body" /></section>}

      {displayScheme.benefits && <section id="benefits" className="mt-6 rounded-xl border border-saffron/30 bg-saffron/10 p-5"><h2 className="mb-2 font-display text-lg text-ledger">{t("scheme_benefits")}</h2><RichText text={displayScheme.benefits} className="text-ink font-body" /></section>}

      <section id="eligibility" className="mt-6 rounded-xl border border-borderc bg-white/60 p-5">
        <h2 className="mb-2 font-display text-lg text-ledger">{t("scheme_eligibility_criteria")}</h2>
        <dl>
          <EligibilityRow label={t("scheme_age")} value={ageText} />
          <EligibilityRow label={t("scheme_gender_row")} value={genderText} />
          <EligibilityRow label={t("scheme_income_cap")} value={incomeText} />
          <EligibilityRow label={t("scheme_category_row")} value={elig.categories && elig.categories.length > 0 ? elig.categories.join(", ") : t("scheme_any_val")} />
          <EligibilityRow label={t("scheme_bpl_required")} value={elig.requiresBPL ? t("guided_yes") : t("guided_no")} />
          <EligibilityRow label={t("scheme_disability_required")} value={elig.requiresDisability ? t("guided_yes") : t("guided_no")} />
        </dl>

        {additionalConditions.length > 0 && (
          <div className="mt-4 rounded-lg border border-saffron/30 bg-saffron/10 p-3">
            <p className="text-xs font-body font-semibold text-saffron-dark">{t("scheme_additional_conditions_title")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {additionalConditions.map((condition) => <span key={condition.key} title={locale === "en" ? condition.evidence || undefined : undefined} className="rounded-full border border-saffron/30 bg-white/45 px-2 py-1 text-[11px] font-body text-ink/80">? {conditionLabel(condition)}</span>)}
            </div>
            <p className="mt-2 text-[11px] font-body text-muted">{t("scheme_additional_conditions_note")}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted font-body">{t("scheme_eligibility_note")}</p>
      </section>

      {displayScheme.applicationProcess && <section id="apply" className="mt-6"><details open={displayScheme.applicationProcess.length < 700} className="rounded-xl border border-borderc bg-white/50 p-5"><summary className="cursor-pointer font-display text-lg text-ledger">{t("scheme_how_to_apply")}</summary><RichText text={displayScheme.applicationProcess} className="mt-4 text-ink/85 font-body" /></details></section>}

      {displayScheme.documentsRequired && <section id="documents" className="mt-6"><details open={displayScheme.documentsRequired.length < 550} className="rounded-xl border border-borderc bg-white/50 p-5"><summary className="cursor-pointer font-display text-lg text-ledger">{t("scheme_documents_required")}</summary><RichText text={displayScheme.documentsRequired} className="mt-4 text-ink/85 font-body" /></details></section>}

      {relatedForDisplay.length > 0 && (
        <section id="related" className="mt-8 border-t border-borderc pt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-saffron-dark font-body font-semibold">{t("scheme_discovery")}</p>
              <h2 className="mt-1 font-display text-xl text-ledger">{personalResult?.status === "not_eligible" ? (activeProfileLabel ? t("scheme_alternatives_for", { name: activeProfileLabel }) : t("scheme_alternatives_profile")) : t("scheme_similar_explore")}</h2>
              <p className="mt-1 text-xs font-body text-muted">{t("scheme_related_explanation")}</p>
            </div>
            <Link href="/search" className="text-xs font-body font-semibold text-bottle hover:underline">{t("scheme_search_all")}</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {relatedForDisplay.map((item) => <SchemeCard key={item.id} scheme={item} returnTo={`/scheme/${scheme.id}`} />)}
          </div>
        </section>
      )}

      {hasActions && (
        <div className="mt-8 hidden flex-wrap gap-3 md:flex">
          {scheme.applyUrl && <a href={scheme.applyUrl} target="_blank" rel="noopener noreferrer" className="interactive-surface rounded-lg bg-bottle px-5 py-2.5 font-body font-semibold text-white hover:bg-bottle-light">{t("scheme_apply_now")}</a>}
          {scheme.officialUrl && <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer" className="interactive-surface rounded-lg border border-borderc bg-white/60 px-5 py-2.5 font-body font-semibold hover:bg-white">{t("scheme_official_page")}</a>}
        </div>
      )}

      <p className="mt-8 border-t border-borderc pt-4 text-xs text-muted font-body">{t("scheme_source_note")}</p>

      {hasActions && (
        <div className="fixed inset-x-0 bottom-3 z-40 mx-auto flex w-[min(92vw,34rem)] gap-2 rounded-2xl border border-borderc bg-white/95 p-2.5 shadow-2xl backdrop-blur-md md:hidden">
          {scheme.applyUrl && <a href={scheme.applyUrl} target="_blank" rel="noopener noreferrer" className="interactive-surface flex-1 rounded-xl bg-bottle px-4 py-3 text-center font-body font-semibold text-white hover:bg-bottle-light">{t("scheme_apply_now")}</a>}
          {scheme.officialUrl && <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer" className={`interactive-surface rounded-xl border border-borderc bg-white/70 px-4 py-3 text-center font-body font-semibold text-ledger hover:bg-white ${scheme.applyUrl ? "shrink-0" : "flex-1"}`}>{t("scheme_official_page")} ↗</a>}
        </div>
      )}
    </div>
  );
}
