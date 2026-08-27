"use client";

import Link from "next/link";
import { useMemo } from "react";
import { evaluateEligibility } from "../lib/ruleEngine";
import { useProfile } from "../lib/useProfile";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

const STATUS_META = {
  likely_eligible: {
    labelKey: "elig_status_likely",
    icon: "✓",
    className: "border-bottle/30 bg-bottle/10 text-bottle",
  },
  needs_info: {
    labelKey: "elig_status_verify",
    icon: "?",
    className: "border-saffron/40 bg-saffron/10 text-saffron-dark",
  },
  not_eligible: {
    labelKey: "elig_status_no_match",
    icon: "×",
    className: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200",
  },
};

function formatNumber(locale, value) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-IN" : locale).format(value);
  } catch {
    return Number(value).toLocaleString("en-IN");
  }
}

function countText(t, counts) {
  const parts = [];
  if (counts.passed) parts.push(t("elig_count_passed", { n: counts.passed }));
  if (counts.unknown) parts.push(t("elig_count_verify", { n: counts.unknown }));
  if (counts.failed) parts.push(t("elig_count_failed", { n: counts.failed }));
  return parts.length ? parts.join(" · ") : t("elig_count_none");
}

function ageRange(t, elig) {
  if (elig.minAge != null && elig.maxAge != null) return t("elig_years_range", { min: elig.minAge, max: elig.maxAge });
  if (elig.minAge != null) return t("elig_years_min", { min: elig.minAge });
  if (elig.maxAge != null) return t("elig_years_max", { max: elig.maxAge });
  return t("scheme_no_restriction");
}

function genderLabel(t, value) {
  if (value === "male") return t("guided_gender_male");
  if (value === "female") return t("guided_gender_female");
  return value || t("scheme_any_val");
}

function localizeCheck(t, locale, check, scheme, profile) {
  const elig = scheme.eligibility || {};
  const key = String(check.key || "");

  if (key.startsWith("narrative:")) {
    return {
      label: t("elig_check_additional"),
      detail: t("elig_narrative_detail"),
    };
  }

  if (key === "age") {
    const range = ageRange(t, elig);
    return {
      label: t("elig_check_age"),
      detail: !check.constraint
        ? t("elig_age_none")
        : check.status === "unknown"
        ? t("elig_age_unknown", { range })
        : t("elig_age_known", { range, value: profile?.age ?? "" }),
    };
  }

  if (key === "gender") {
    const required = genderLabel(t, elig.gender);
    return {
      label: t("elig_check_gender"),
      detail: !check.constraint
        ? t("elig_gender_none")
        : check.status === "unknown"
        ? t("elig_gender_unknown", { value: required })
        : t("elig_gender_known", { value: required, profile: genderLabel(t, profile?.gender) }),
    };
  }

  if (key === "income") {
    const cap = elig.maxIncome != null ? `₹${formatNumber(locale, elig.maxIncome)}` : "";
    const value = profile?.annualIncome != null && profile?.annualIncome !== "" ? `₹${formatNumber(locale, profile.annualIncome)}` : "";
    return {
      label: t("elig_check_income"),
      detail: !check.constraint
        ? t("elig_income_none")
        : check.status === "unknown"
        ? t("elig_income_unknown", { cap })
        : t("elig_income_known", { cap, value }),
    };
  }

  if (key === "category") {
    const allowed = Array.isArray(elig.categories) ? elig.categories.join(", ") : "";
    return {
      label: t("elig_check_category"),
      detail: !check.constraint
        ? t("elig_category_none")
        : check.status === "unknown"
        ? t("elig_category_unknown", { value: allowed })
        : t("elig_category_known", { value: allowed, profile: profile?.category || "" }),
    };
  }

  if (key === "bpl") {
    return {
      label: t("elig_check_bpl"),
      detail: !check.constraint
        ? t("elig_bpl_none")
        : check.status === "unknown"
        ? t("elig_bpl_unknown")
        : t("elig_bpl_known", { value: profile?.isBPL ? t("elig_yes") : t("elig_no") }),
    };
  }

  if (key === "disability") {
    return {
      label: t("elig_check_disability"),
      detail: !check.constraint
        ? t("elig_disability_none")
        : check.status === "unknown"
        ? t("elig_disability_unknown")
        : t("elig_disability_known", { value: profile?.hasDisability ? t("elig_yes") : t("elig_no") }),
    };
  }

  if (key === "state") {
    const schemeState = scheme.state ? localizeState(locale, scheme.state) : "";
    const profileState = profile?.state ? localizeState(locale, profile.state) : "";
    return {
      label: t("elig_check_region"),
      detail: scheme.level === "Central"
        ? t("elig_region_central")
        : !check.constraint
        ? t("elig_region_none")
        : check.status === "unknown"
        ? t("elig_region_unknown", { state: schemeState })
        : t("elig_region_known", { state: schemeState, profile: profileState }),
    };
  }

  return { label: check.label, detail: check.detail };
}

export function ProfileEligibilityBadge({ scheme }) {
  const { t } = useLanguage();
  const { profile, hydrated, hasProfile, activeProfileLabel } = useProfile();
  const result = useMemo(() => (hydrated && hasProfile ? evaluateEligibility(profile, scheme) : null), [hydrated, hasProfile, profile, scheme]);
  if (!result) return null;
  const meta = STATUS_META[result.status];

  return (
    <div className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-body font-semibold ${meta.className}`} title={activeProfileLabel ? t("elig_based_on_profile", { name: activeProfileLabel }) : t("elig_based_on_active")}>
      <span aria-hidden="true">{meta.icon}</span>
      <span>{t(meta.labelKey)}</span>
      <span className="opacity-70">· {countText(t, result.counts)}</span>
    </div>
  );
}

export default function EligibilityEvidence({ scheme, profile, compact = false }) {
  const { t, locale } = useLanguage();
  const result = useMemo(() => evaluateEligibility(profile || {}, scheme), [profile, scheme]);
  const meta = STATUS_META[result.status];

  if (compact) {
    return (
      <div className={`rounded-xl border p-3 ${meta.className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-body text-sm font-semibold"><span aria-hidden="true">{meta.icon} </span>{t(meta.labelKey)}</p>
          <p className="text-xs font-body opacity-75">{countText(t, result.counts)}</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`mt-6 rounded-xl border p-5 ${meta.className}`} aria-label={t("elig_evidence_aria")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg"><span aria-hidden="true">{meta.icon} </span>{t(meta.labelKey)}</p>
          <p className="mt-1 text-xs font-body opacity-80">
            {countText(t, result.counts)}
            {result.counts.narrativeUnknown > 0 ? ` · ${t("elig_narrative_count", { n: result.counts.narrativeUnknown })}` : ""}
          </p>
        </div>
        <Link href="/profile" className="text-xs font-body font-semibold underline underline-offset-2">{t("elig_switch_profile")}</Link>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {result.checks.filter((check) => check.constraint || check.status !== "pass").map((check) => {
          const localized = localizeCheck(t, locale, check, scheme, profile || {});
          return (
            <li key={check.key} className="rounded-lg border border-current/15 bg-white/35 p-3 dark:bg-black/10">
              <div className="flex gap-2">
                <span aria-hidden="true" className="font-semibold">{check.status === "pass" ? "✓" : check.status === "fail" ? "×" : "?"}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-body font-semibold">{localized.label}</p>
                    {check.source === "narrative" && <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">{t("elig_full_text_condition")}</span>}
                  </div>
                  <p className="mt-0.5 text-xs font-body opacity-80">{localized.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] font-body opacity-70">{t("elig_disclaimer")}</p>
    </section>
  );
}
