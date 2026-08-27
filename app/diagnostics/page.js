"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "Unavailable";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function prettyKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function CoverageBar({ label, item, total }) {
  const pct = item?.percent || 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs font-body">
        <span className="font-semibold text-ledger">{label}</span>
        <span className="text-muted">{item?.count?.toLocaleString("en-IN") || 0}/{total.toLocaleString("en-IN")} · {pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-borderc/60"><div className="h-full rounded-full bg-bottle transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}

function IssueCard({ title, issue, description }) {
  return (
    <div className="rounded-xl border border-borderc bg-white/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-body font-semibold text-ledger">{title}</h3><p className="mt-1 text-xs font-body text-muted">{description}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-body font-semibold ${issue?.count ? "bg-saffron/15 text-saffron-dark" : "bg-bottle/10 text-bottle"}`}>{issue?.count || 0}</span>
      </div>
      {Array.isArray(issue?.samples) && issue.samples.length > 0 && (
        <details className="mt-3"><summary className="cursor-pointer text-xs font-body font-semibold text-bottle">View sample flags</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-borderc bg-khadi-dark/40 p-3 text-[11px] leading-relaxed text-ink/75">{JSON.stringify(issue.samples, null, 2)}</pre></details>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/data/data-meta.json", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(setMeta)
      .catch((err) => setError(err.message || "Unable to load data health metadata."));
  }, []);

  const anomalyTotal = useMemo(() => {
    if (!meta?.anomalies) return 0;
    return Object.values(meta.anomalies).reduce((sum, issue) => sum + (Number(issue?.count) || 0), 0);
  }, [meta]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">Build-time observability</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">Data health & freshness</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">Catalog completeness, structured rule coverage, narrative-only eligibility signals, freshness, and deterministic anomaly queues generated on every rebuild.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/updates" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">Scheme changes →</Link>
          <Link href="/evals" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">LLM evals →</Link>
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-5 text-sm font-body text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">Could not load diagnostics: {error}</div>
      ) : !meta ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-borderc bg-white/60 p-4"><p className="text-[11px] uppercase tracking-wide text-muted font-body">Catalog</p><p className="mt-1 font-display text-3xl text-ledger">{meta.counts.total.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-muted font-body">{meta.counts.central} Central · {meta.counts.state} State</p></div>
            <div className="rounded-xl border border-bottle/25 bg-bottle/5 p-4"><p className="text-[11px] uppercase tracking-wide text-bottle font-body">Completeness</p><p className="mt-1 font-display text-3xl text-bottle">{meta.completeness.percent}%</p><p className="mt-1 text-xs text-ink/60 font-body">Presence of seven core fields</p></div>
            <div className="rounded-xl border border-saffron/35 bg-saffron/10 p-4"><p className="text-[11px] uppercase tracking-wide text-saffron-dark font-body">Narrative verification</p><p className="mt-1 font-display text-3xl text-saffron-dark">{meta.narrativeEligibility?.schemesFlagged?.toLocaleString("en-IN") || 0}</p><p className="mt-1 text-xs text-ink/60 font-body">Schemes with extra full-text condition signals</p></div>
            <div className="rounded-xl border border-saffron/35 bg-saffron/10 p-4"><p className="text-[11px] uppercase tracking-wide text-saffron-dark font-body">Review flags</p><p className="mt-1 font-display text-3xl text-saffron-dark">{anomalyTotal}</p><p className="mt-1 text-xs text-ink/60 font-body">Flags may overlap; they are not confirmed errors</p></div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-xl border border-borderc bg-white/60 p-5">
              <h2 className="font-display text-xl text-ledger">Core field coverage</h2>
              <p className="mt-1 text-xs font-body text-muted">{meta.completeness.definition}</p>
              <div className="mt-5 space-y-4">{Object.entries(meta.completeness.fields).map(([field, item]) => <CoverageBar key={field} label={field} item={item} total={meta.counts.total} />)}</div>
            </section>

            <section className="space-y-5">
              <div className="rounded-xl border border-borderc bg-white/60 p-5">
                <h2 className="font-display text-xl text-ledger">Structured eligibility</h2>
                <p className="mt-1 text-xs font-body text-muted">Restrictions exposed directly to deterministic pass/fail checks.</p>
                <dl className="mt-4 space-y-2">
                  {Object.entries(meta.structuredEligibility).map(([key, count]) => <div key={key} className="flex items-center justify-between gap-4 rounded-lg bg-khadi-dark/30 px-3 py-2"><dt className="text-xs font-body text-ink/70">{prettyKey(key)}</dt><dd className="text-sm font-body font-semibold text-ledger">{Number(count).toLocaleString("en-IN")}</dd></div>)}
                </dl>
              </div>

              {meta.narrativeEligibility && (
                <div className="rounded-xl border border-saffron/30 bg-saffron/5 p-5">
                  <h2 className="font-display text-xl text-ledger">Eligibility Engine v2 coverage</h2>
                  <p className="mt-1 text-xs font-body text-muted">{meta.narrativeEligibility.definition}</p>
                  <p className="mt-3 text-sm font-body text-ink/75"><span className="font-semibold text-saffron-dark">{meta.narrativeEligibility.schemesFlagged.toLocaleString("en-IN")}</span> schemes ({meta.narrativeEligibility.percentFlagged}%) contain one or more additional narrative condition signals.</p>
                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                    {Object.entries(meta.narrativeEligibility.byCondition || {}).sort((a, b) => b[1] - a[1]).map(([key, count]) => <div key={key} className="flex items-center justify-between rounded-lg border border-borderc/60 bg-white/35 px-3 py-2"><span className="text-xs font-body text-ink/70">{prettyKey(key)}</span><span className="text-xs font-body font-semibold text-ledger">{Number(count).toLocaleString("en-IN")}</span></div>)}
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-borderc bg-white/55 p-5">
            <h2 className="font-display text-lg text-ledger">Source record timestamps</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <p className="text-xs font-body text-muted">Oldest: <span className="font-semibold text-ledger">{formatDate(meta.sourceRecords.oldestScrapedAt)}</span></p>
              <p className="text-xs font-body text-muted">Freshest: <span className="font-semibold text-ledger">{formatDate(meta.sourceRecords.freshestScrapedAt)}</span></p>
              <p className="text-xs font-body text-muted">Coverage: <span className="font-semibold text-ledger">{meta.sourceRecords.scrapedTimestampCoverage.percent}%</span></p>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="font-display text-xl text-ledger">Anomaly review queues</h2>
            <p className="mt-1 text-xs font-body text-muted">Deterministic sanity checks surface records worth reviewing instead of silently rewriting source data.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <IssueCard title="Suspicious income caps" issue={meta.anomalies.suspiciousIncome} description="Structured caps below ₹1,000 or above ₹10 crore." />
              <IssueCard title="Invalid age ranges" issue={meta.anomalies.invalidAge} description="Negative / >120 ages, or minimum age greater than maximum age." />
              <IssueCard title="Missing state on State schemes" issue={meta.anomalies.missingState} description="A State-level scheme without a usable state field." />
              <IssueCard title="Malformed URLs" issue={meta.anomalies.malformedUrls} description="Present apply/official URLs that are not parseable http(s) URLs." />
              <IssueCard title="Duplicate IDs" issue={meta.anomalies.duplicateIds} description="IDs that appear more than once in the generated catalog." />
              <IssueCard title="Duplicate-name groups" issue={meta.anomalies.duplicateNameGroups} description="Normalized names appearing in more than one record; some may be legitimate variants." />
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-borderc bg-white/45 p-5">
            <h2 className="font-display text-lg text-ledger">Interpretation notes</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-xs font-body text-ink/70">{meta.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            <p className="mt-4 break-all text-[11px] font-body text-muted">Dataset source: {meta.sourceDataset}</p>
          </section>
        </>
      )}
    </div>
  );
}
