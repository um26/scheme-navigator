"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookmarks } from "../../lib/useBookmarks";
import { useApplications, defaultApplicationEntry } from "../../lib/useApplications";
import SchemeCard from "../../components/SchemeCard";
import CompareTable from "../../components/CompareTable";
import ApplicationTracker from "../../components/ApplicationTracker";
import { useLanguage } from "../../lib/i18n/LanguageContext";

function SavedSkeleton() {
  return (
    <div className="rounded-xl border border-borderc bg-white/60 p-5 shadow-sm">
      <div className="skeleton h-5 w-3/5 rounded" />
      <div className="skeleton mt-4 h-3 w-full rounded" />
      <div className="skeleton mt-2 h-3 w-5/6 rounded" />
      <div className="skeleton mt-4 h-3 w-2/5 rounded" />
    </div>
  );
}

const STATUS_LABELS = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  completed: "Completed",
};

export default function SavedPage() {
  const { t } = useLanguage();
  const { ids, remove, hydrated } = useBookmarks();
  const { entries, hydrated: applicationsHydrated, setStatus, toggleDocument, setNote, clearEntry } = useApplications();
  const [saved, setSaved] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const idsKey = ids.join("|");

  useEffect(() => {
    if (!hydrated) return;
    if (ids.length === 0) {
      setSaved([]);
      return;
    }

    let cancelled = false;
    setSaved(null);
    fetch("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSaved(Array.isArray(data.schemes) ? data.schemes : []);
      })
      .catch(() => {
        if (!cancelled) setSaved([]);
      });

    return () => { cancelled = true; };
  }, [hydrated, idsKey]);

  useEffect(() => {
    setCompareIds((prev) => prev.filter((id) => ids.includes(id)));
  }, [idsKey]);

  const compareSchemes = useMemo(() => (saved || []).filter((scheme) => compareIds.includes(scheme.id)).slice(0, 3), [saved, compareIds]);
  const statusCounts = useMemo(() => {
    const counts = { saved: 0, preparing: 0, applied: 0, completed: 0 };
    for (const id of ids) {
      const status = entries[id]?.status || "saved";
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [idsKey, entries]);

  function toggleCompare(id) {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev);
    setShowTable(false);
  }

  function toggleCompareMode() {
    setCompareMode((value) => !value);
    setShowTable(false);
    if (compareMode) setCompareIds([]);
  }

  function removeSaved(id) {
    remove(id);
    setCompareIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div className={`max-w-4xl mx-auto px-4 py-10 ${compareMode ? "pb-28" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-ledger">{t("saved_title")}</h1>
          <p className="mt-1 text-sm font-body text-muted">Your local application workspace — save, prepare, apply, and keep document progress in one place.</p>
        </div>
        {(saved?.length || 0) >= 2 && (
          <button type="button" onClick={toggleCompareMode} aria-pressed={compareMode} className={`interactive-surface rounded-full border px-4 py-2 text-sm font-body font-semibold ${compareMode ? "border-bottle bg-bottle text-white" : "border-borderc bg-white/60 text-ink hover:bg-white"}`}>
            {compareMode ? t("saved_exit_compare") : t("saved_compare")}
          </button>
        )}
      </div>

      {hydrated && applicationsHydrated && ids.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Application status summary">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-borderc bg-white/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted font-body">{label}</p>
              <p className="mt-1 font-display text-2xl text-ledger">{statusCounts[key] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {!hydrated || saved === null ? (
        <div className="mt-8 grid gap-4" aria-live="polite" aria-label={t("saved_loading")}>
          <SavedSkeleton /><SavedSkeleton /><SavedSkeleton />
        </div>
      ) : saved.length === 0 ? (
        <div className="mt-8 rounded-xl border border-borderc bg-white/60 p-8 text-center">
          <p className="font-body text-ink/70">{t("saved_empty")}</p>
        </div>
      ) : (
        <>
          {compareMode && <p className="mt-4 text-sm text-muted font-body">{t("saved_select_up_to_3", { n: compareIds.length })}</p>}

          {compareMode && showTable && compareSchemes.length >= 2 && <div className="mt-4 animate-fadeIn"><CompareTable schemes={compareSchemes} /></div>}

          <div className="mt-6 grid gap-5">
            {saved.map((scheme) => {
              const selected = compareIds.includes(scheme.id);
              const applicationEntry = entries[scheme.id] || defaultApplicationEntry();
              return (
                <div key={scheme.id} className={`rounded-xl transition-shadow ${selected ? "ring-2 ring-saffron-dark ring-offset-2 ring-offset-khadi" : ""}`}>
                  {compareMode && (
                    <button type="button" onClick={() => toggleCompare(scheme.id)} aria-pressed={selected} disabled={!selected && compareIds.length >= 3} className={`interactive-surface mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-body font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-saffron-dark bg-saffron-dark text-white" : "border-borderc bg-white/60 text-ink hover:bg-white"}`}>
                      <span>{t("saved_compare")}</span><span aria-hidden="true">{selected ? "✓" : "○"}</span>
                    </button>
                  )}
                  <SchemeCard scheme={scheme} returnTo="/saved" />
                  {applicationsHydrated && (
                    <ApplicationTracker
                      scheme={scheme}
                      entry={applicationEntry}
                      onStatus={(status) => setStatus(scheme.id, status)}
                      onDocument={(key) => toggleDocument(scheme.id, key)}
                      onNote={(note) => setNote(scheme.id, note)}
                      onClear={() => clearEntry(scheme.id)}
                    />
                  )}
                  <button type="button" onClick={() => removeSaved(scheme.id)} className="mt-1 px-1 text-xs font-body text-muted transition-colors hover:text-red-700 dark:hover:text-red-300">{t("saved_remove")}</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {compareMode && saved?.length >= 2 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92vw,32rem)] items-center justify-between gap-3 rounded-2xl border border-borderc bg-white/95 p-3 shadow-2xl backdrop-blur-md">
          <span className="text-sm font-body font-semibold text-ledger">{compareIds.length}/3</span>
          <button type="button" disabled={compareIds.length < 2} onClick={() => { setShowTable(true); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" })); }} className="interactive-surface flex-1 rounded-xl bg-bottle px-4 py-2.5 text-sm font-body font-semibold text-white hover:bg-bottle-light disabled:cursor-not-allowed disabled:opacity-45">
            {t("saved_compare")} {compareIds.length}/3
          </button>
        </div>
      )}
    </div>
  );
}
