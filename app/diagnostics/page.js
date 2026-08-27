"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

const FIELD_KEYS = {
  name: "scheme_field_name",
  description: "scheme_field_description",
  benefits: "scheme_field_benefits",
  ministry: "scheme_field_ministry",
  tags: "scheme_field_tags",
  applicationProcess: "scheme_field_applicationProcess",
  documentsRequired: "scheme_field_documentsRequired",
  eligibilityText: "scheme_field_eligibilityText",
  officialUrl: "scheme_field_officialUrl",
  applyUrl: "scheme_field_applyUrl",
};

const STRUCTURED_KEYS = {
  ageRestricted: "diagnostics_metric_ageRestricted",
  incomeCapped: "diagnostics_metric_incomeCapped",
  genderRestricted: "diagnostics_metric_genderRestricted",
  categoryRestricted: "diagnostics_metric_categoryRestricted",
  bplRequired: "diagnostics_metric_bplRequired",
  disabilityRequired: "diagnostics_metric_disabilityRequired",
};

function formatDate(value, locale, unavailable) {
  if (!value) return unavailable;
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-IN" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value, locale) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-IN" : locale).format(Number(value || 0));
  } catch {
    return Number(value || 0).toLocaleString("en-IN");
  }
}

function CoverageBar({ label, item, total, locale }) {
  const pct = item?.percent || 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs font-body">
        <span className="font-semibold text-ledger">{label}</span>
        <span className="text-muted">{formatNumber(item?.count || 0, locale)}/{formatNumber(total, locale)} · {pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-borderc/60"><div className="h-full rounded-full bg-bottle transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}

function IssueCard({ title, issue, description, samplesLabel }) {
  return (
    <div className="rounded-xl border border-borderc bg-white/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-body font-semibold text-ledger">{title}</h3><p className="mt-1 text-xs font-body text-muted">{description}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-body font-semibold ${issue?.count ? "bg-saffron/15 text-saffron-dark" : "bg-bottle/10 text-bottle"}`}>{issue?.count || 0}</span>
      </div>
      {Array.isArray(issue?.samples) && issue.samples.length > 0 && (
        <details className="mt-3"><summary className="cursor-pointer text-xs font-body font-semibold text-bottle">{samplesLabel}</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-borderc bg-khadi-dark/40 p-3 text-[11px] leading-relaxed text-ink/75">{JSON.stringify(issue.samples, null, 2)}</pre></details>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const { t, locale } = useLanguage();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/data-meta.json", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setMeta)
      .catch((err) => setError(err.message || "load-error"));
  }, []);

  const anomalyTotal = useMemo(() => {
    if (!meta?.anomalies) return 0;
    return Object.values(meta.anomalies).reduce((sum, issue) => sum + (Number(issue?.count) || 0), 0);
  }, [meta]);

  const fieldLabel = (field) => FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field;
  const structuredLabel = (key) => STRUCTURED_KEYS[key] ? t(STRUCTURED_KEYS[key]) : key;
  const conditionLabel = (key) => t(`elig_condition_${key}`);
  const unavailable = t("diagnostics_unavailable");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">{t("diagnostics_eyebrow")}</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">{t("diagnostics_title")}</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">{t("diagnostics_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/updates" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">{t("diagnostics_scheme_changes")}</Link>
          <Link href="/evals" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">{t("diagnostics_llm_evals")}</Link>
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-5 text-sm font-body text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{t("diagnostics_could_not_load", { error })}</div>
      ) : !meta ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-borderc bg-white/60 p-4"><p className="text-[11px] uppercase tracking-wide text-muted font-body">{t("diagnostics_catalog")}</p><p className="mt-1 font-display text-3xl text-ledger">{formatNumber(meta.counts.total, locale)}</p><p className="mt-1 text-xs text-muted font-body">{t("diagnostics_catalog_detail", { central: formatNumber(meta.counts.central, locale), state: formatNumber(meta.counts.state, locale) })}</p></div>
            <div className="rounded-xl border border-bottle/25 bg-bottle/5 p-4"><p className="text-[11px] uppercase tracking-wide text-bottle font-body">{t("diagnostics_completeness")}</p><p className="mt-1 font-display text-3xl text-bottle">{meta.completeness.percent}%</p><p className="mt-1 text-xs text-ink/60 font-body">{t("diagnostics_completeness_detail")}</p></div>
            <div className="rounded-xl border border-saffron/35 bg-saffron/10 p-4"><p className="text-[11px] uppercase tracking-wide text-saffron-dark font-body">{t("diagnostics_narrative_verification")}</p><p className="mt-1 font-display text-3xl text-saffron-dark">{formatNumber(meta.narrativeEligibility?.schemesFlagged || 0, locale)}</p><p className="mt-1 text-xs text-ink/60 font-body">{t("diagnostics_narrative_detail")}</p></div>
            <div className="rounded-xl border border-saffron/35 bg-saffron/10 p-4"><p className="text-[11px] uppercase tracking-wide text-saffron-dark font-body">{t("diagnostics_review_flags")}</p><p className="mt-1 font-display text-3xl text-saffron-dark">{formatNumber(anomalyTotal, locale)}</p><p className="mt-1 text-xs text-ink/60 font-body">{t("diagnostics_review_flags_detail")}</p></div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-xl border border-borderc bg-white/60 p-5">
              <h2 className="font-display text-xl text-ledger">{t("diagnostics_core_coverage")}</h2>
              <p className="mt-1 text-xs font-body text-muted">{t("diagnostics_core_coverage_detail")}</p>
              <div className="mt-5 space-y-4">{Object.entries(meta.completeness.fields).map(([field, item]) => <CoverageBar key={field} label={fieldLabel(field)} item={item} total={meta.counts.total} locale={locale} />)}</div>
            </section>

            <section className="space-y-5">
              <div className="rounded-xl border border-borderc bg-white/60 p-5">
                <h2 className="font-display text-xl text-ledger">{t("diagnostics_structured_eligibility")}</h2>
                <p className="mt-1 text-xs font-body text-muted">{t("diagnostics_structured_eligibility_detail")}</p>
                <dl className="mt-4 space-y-2">
                  {Object.entries(meta.structuredEligibility).map(([key, count]) => <div key={key} className="flex items-center justify-between gap-4 rounded-lg bg-khadi-dark/30 px-3 py-2"><dt className="text-xs font-body text-ink/70">{structuredLabel(key)}</dt><dd className="text-sm font-body font-semibold text-ledger">{formatNumber(count, locale)}</dd></div>)}
                </dl>
              </div>

              {meta.narrativeEligibility && (
                <div className="rounded-xl border border-saffron/30 bg-saffron/5 p-5">
                  <h2 className="font-display text-xl text-ledger">{t("diagnostics_engine_coverage")}</h2>
                  <p className="mt-1 text-xs font-body text-muted">{t("diagnostics_engine_coverage_detail")}</p>
                  <p className="mt-3 text-sm font-body text-ink/75">{t("diagnostics_engine_flagged", { n: formatNumber(meta.narrativeEligibility.schemesFlagged, locale), percent: meta.narrativeEligibility.percentFlagged })}</p>
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                    {Object.entries(meta.narrativeEligibility.byCondition || {}).sort((a, b) => b[1] - a[1]).map(([key, count]) => <div key={key} className="flex items-center justify-between rounded-lg border border-borderc/60 bg-white/35 px-3 py-2"><span className="text-xs font-body text-ink/70">{conditionLabel(key)}</span><span className="text-xs font-body font-semibold text-ledger">{formatNumber(count, locale)}</span></div>)}
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-borderc bg-white/55 p-5">
            <h2 className="font-display text-lg text-ledger">{t("diagnostics_source_timestamps")}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <p className="text-xs font-body text-muted">{t("diagnostics_oldest")} <span className="font-semibold text-ledger">{formatDate(meta.sourceRecords.oldestScrapedAt, locale, unavailable)}</span></p>
              <p className="text-xs font-body text-muted">{t("diagnostics_freshest")} <span className="font-semibold text-ledger">{formatDate(meta.sourceRecords.freshestScrapedAt, locale, unavailable)}</span></p>
              <p className="text-xs font-body text-muted">{t("diagnostics_coverage")} <span className="font-semibold text-ledger">{meta.sourceRecords.scrapedTimestampCoverage.percent}%</span></p>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="font-display text-xl text-ledger">{t("diagnostics_anomaly_queues")}</h2>
            <p className="mt-1 text-xs font-body text-muted">{t("diagnostics_anomaly_queues_detail")}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <IssueCard title={t("diagnostics_income_title")} issue={meta.anomalies.suspiciousIncome} description={t("diagnostics_income_detail")} samplesLabel={t("diagnostics_samples")} />
              <IssueCard title={t("diagnostics_age_title")} issue={meta.anomalies.invalidAge} description={t("diagnostics_age_detail")} samplesLabel={t("diagnostics_samples")} />
              <IssueCard title={t("diagnostics_state_title")} issue={meta.anomalies.missingState} description={t("diagnostics_state_detail")} samplesLabel={t("diagnostics_samples")} />
              <IssueCard title={t("diagnostics_url_title")} issue={meta.anomalies.malformedUrls} description={t("diagnostics_url_detail")} samplesLabel={t("diagnostics_samples")} />
              <IssueCard title={t("diagnostics_duplicate_id_title")} issue={meta.anomalies.duplicateIds} description={t("diagnostics_duplicate_id_detail")} samplesLabel={t("diagnostics_samples")} />
              <IssueCard title={t("diagnostics_duplicate_name_title")} issue={meta.anomalies.duplicateNameGroups} description={t("diagnostics_duplicate_name_detail")} samplesLabel={t("diagnostics_samples")} />
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-borderc bg-white/45 p-5">
            <h2 className="font-display text-lg text-ledger">{t("diagnostics_interpretation")}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-xs font-body text-ink/70">
              <li>{t("diagnostics_note_url")}</li>
              <li>{t("diagnostics_note_anomaly")}</li>
              <li>{t("diagnostics_note_narrative")}</li>
            </ul>
            <p className="mt-4 break-all text-[11px] font-body text-muted">{t("diagnostics_dataset_source", { source: meta.sourceDataset })}</p>
          </section>
        </>
      )}
    </div>
  );
}
