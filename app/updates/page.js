"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "Unavailable";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function CountCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-borderc bg-white/55 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted font-body">{label}</p>
      <p className="mt-1 font-display text-3xl text-ledger">{Number(value || 0).toLocaleString("en-IN")}</p>
      <p className="mt-1 text-xs font-body text-muted">{detail}</p>
    </div>
  );
}

export default function UpdatesPage() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/scheme-changes.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`changes ${response.status}`))),
      fetch("/data/scheme-change-history.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`history ${response.status}`))),
    ])
      .then(([changes, historyData]) => { setLatest(changes); setHistory(historyData); })
      .catch((err) => setError(err.message || "Unable to load update history."));
  }, []);

  const changedItems = latest?.updated || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">Catalog history</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">Scheme changes</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">Every production catalog rebuild compares itself with the previous production snapshot. Changes are recorded without silently rewriting the upstream source.</p>
        </div>
        <Link href="/diagnostics" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">Data health →</Link>
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-red-300/60 bg-red-50 p-5 font-body text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</div>
      ) : !latest || !history ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="mt-8 rounded-xl border border-borderc bg-white/50 p-4 font-body text-sm text-ink/75">
            <span className="font-semibold text-ledger">Latest refresh:</span> {formatDate(latest.generatedAt)}
            {latest.baseline ? " · baseline snapshot created; future production builds will show diffs against this version." : ` · compared with ${formatDate(latest.comparedTo)}.`}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <CountCard label="Added" value={latest.counts?.added} detail="New scheme IDs in the source dataset" />
            <CountCard label="Updated" value={latest.counts?.updated} detail="Tracked fields or content changed" />
            <CountCard label="Removed" value={latest.counts?.removed} detail="Scheme IDs no longer present" />
          </div>

          {!latest.baseline && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-borderc bg-white/55 p-5">
                <h2 className="font-display text-xl text-ledger">Updated schemes</h2>
                <div className="mt-3 space-y-3">
                  {changedItems.slice(0, 30).map((item) => (
                    <div key={item.id} className="rounded-lg border border-borderc/70 bg-white/35 p-3">
                      <Link href={`/scheme/${item.id}`} className="font-body text-sm font-semibold text-bottle hover:underline">{item.name}</Link>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.fields.slice(0, 8).map((field, index) => <span key={`${field.field}-${index}`} className="rounded-full bg-saffron/10 px-2 py-1 text-[10px] font-body text-saffron-dark">{field.field}</span>)}
                      </div>
                    </div>
                  ))}
                  {changedItems.length === 0 && <p className="text-sm font-body text-muted">No tracked schemes changed in this refresh.</p>}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-xl border border-borderc bg-white/55 p-5">
                  <h2 className="font-display text-xl text-ledger">Added / removed</h2>
                  <div className="mt-3 space-y-2">
                    {(latest.added || []).slice(0, 12).map((item) => <p key={`a-${item.id}`} className="text-sm font-body"><span className="me-2 text-bottle">+</span><Link href={`/scheme/${item.id}`} className="hover:underline">{item.name}</Link></p>)}
                    {(latest.removed || []).slice(0, 12).map((item) => <p key={`r-${item.id}`} className="text-sm font-body text-muted"><span className="me-2 text-red-600">−</span>{item.name}</p>)}
                    {!(latest.added?.length || latest.removed?.length) && <p className="text-sm font-body text-muted">No additions or removals in this refresh.</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-borderc bg-white/55 p-5">
                  <h2 className="font-display text-xl text-ledger">Recent refresh history</h2>
                  <div className="mt-3 space-y-2">
                    {(history.entries || []).slice(0, 12).map((entry) => (
                      <div key={entry.generatedAt} className="flex items-center justify-between gap-4 border-b border-borderc/50 py-2 last:border-0">
                        <span className="text-xs font-body text-muted">{formatDate(entry.generatedAt)}</span>
                        <span className="text-xs font-body font-semibold text-ledger">+{entry.counts?.added || 0} · Δ{entry.counts?.updated || 0} · −{entry.counts?.removed || 0}</span>
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
