"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

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

function CountCard({ label, value, detail, locale }) {
  return (
    <div className="rounded-xl border border-borderc bg-white/55 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted font-body">{label}</p>
      <p className="mt-1 font-display text-3xl text-ledger">{formatNumber(value, locale)}</p>
      <p className="mt-1 text-xs font-body text-muted">{detail}</p>
    </div>
  );
}

export default function UpdatesPage() {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/scheme-changes.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`changes ${response.status}`))),
      fetch("/data/scheme-change-history.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`history ${response.status}`))),
    ])
      .then(([changes, historyData]) => { setLatest(changes); setHistory(historyData); })
      .catch(() => setError(true));
  }, []);

  const changedItems = latest?.updated || [];
  const unavailable = t("updates_unavailable");
  const fieldLabel = (field) => FIELD_LABEL_KEYS[field] ? t(FIELD_LABEL_KEYS[field]) : field;
  const schemeName = (item) => localizeSchemeContent({ id: item.id, name: item.name }).name;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">{t("updates_eyebrow")}</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">{t("updates_title")}</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">{t("updates_subtitle")}</p>
        </div>
        <Link href="/diagnostics" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">{t("updates_data_health")}</Link>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-red-300/60 bg-red-50 p-5 font-body text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{t("updates_load_error")}</div>
      ) : !latest || !history ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="mt-8 rounded-xl border border-borderc bg-white/50 p-4 font-body text-sm text-ink/75">
            <span className="font-semibold text-ledger">{t("updates_latest_refresh")}</span> {formatDate(latest.generatedAt, locale, unavailable)}
            {latest.baseline ? ` · ${t("updates_baseline_note")}` : ` · ${t("updates_compared_with", { date: formatDate(latest.comparedTo, locale, unavailable) })}`}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <CountCard label={t("updates_added")} value={latest.counts?.added} detail={t("updates_added_detail")} locale={locale} />
            <CountCard label={t("updates_updated")} value={latest.counts?.updated} detail={t("updates_updated_detail")} locale={locale} />
            <CountCard label={t("updates_removed")} value={latest.counts?.removed} detail={t("updates_removed_detail")} locale={locale} />
          </div>

          {!latest.baseline && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-borderc bg-white/55 p-5">
                <h2 className="font-display text-xl text-ledger">{t("updates_updated_schemes")}</h2>
                <div className="mt-3 space-y-3">
                  {changedItems.slice(0, 30).map((item) => (
                    <div key={item.id} className="rounded-lg border border-borderc/70 bg-white/35 p-3">
                      <Link href={`/scheme/${item.id}`} className="font-body text-sm font-semibold text-bottle hover:underline">{schemeName(item)}</Link>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.fields.slice(0, 8).map((field, index) => <span key={`${field.field}-${index}`} className="rounded-full bg-saffron/10 px-2 py-1 text-[10px] font-body text-saffron-dark">{fieldLabel(field.field)}</span>)}
                      </div>
                    </div>
                  ))}
                  {changedItems.length === 0 && <p className="text-sm font-body text-muted">{t("updates_none_changed")}</p>}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-xl border border-borderc bg-white/55 p-5">
                  <h2 className="font-display text-xl text-ledger">{t("updates_added_removed")}</h2>
                  <div className="mt-3 space-y-2">
                    {(latest.added || []).slice(0, 12).map((item) => <p key={`a-${item.id}`} className="text-sm font-body"><span className="me-2 text-bottle">+</span><Link href={`/scheme/${item.id}`} className="hover:underline">{schemeName(item)}</Link></p>)}
                    {(latest.removed || []).slice(0, 12).map((item) => <p key={`r-${item.id}`} className="text-sm font-body text-muted"><span className="me-2 text-red-600">−</span>{item.name}</p>)}
                    {!(latest.added?.length || latest.removed?.length) && <p className="text-sm font-body text-muted">{t("updates_none_added_removed")}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-borderc bg-white/55 p-5">
                  <h2 className="font-display text-xl text-ledger">{t("updates_recent_history")}</h2>
                  <div className="mt-3 space-y-2">
                    {(history.entries || []).slice(0, 12).map((entry) => (
                      <div key={entry.generatedAt} className="flex items-center justify-between gap-4 border-b border-borderc/50 py-2 last:border-0">
                        <span className="text-xs font-body text-muted">{formatDate(entry.generatedAt, locale, unavailable)}</span>
                        <span className="text-xs font-body font-semibold text-ledger">+{formatNumber(entry.counts?.added || 0, locale)} · Δ{formatNumber(entry.counts?.updated || 0, locale)} · −{formatNumber(entry.counts?.removed || 0, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
