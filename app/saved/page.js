"use client";

import { useEffect, useState } from "react";
import { useBookmarks } from "../../lib/useBookmarks";
import SchemeCard from "../../components/SchemeCard";
import CompareTable from "../../components/CompareTable";
import { useLanguage } from "../../lib/i18n/LanguageContext";

export default function SavedPage() {
  const { t } = useLanguage();
  const { ids, remove, hydrated } = useBookmarks();
  const [allSchemes, setAllSchemes] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    fetch("/data/schemes.json")
      .then((r) => r.json())
      .then(setAllSchemes)
      .catch(() => setAllSchemes([]));
  }, []);

  const saved = allSchemes ? allSchemes.filter((s) => ids.includes(s.id)) : [];
  const compareSchemes = saved.filter((s) => compareIds.includes(s.id)).slice(0, 3);

  function toggleCompare(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-ledger">{t("saved_title")}</h1>
        {saved.length >= 2 && (
          <button
            type="button"
            onClick={() => setCompareMode((c) => !c)}
            className={`px-4 py-2 rounded-full text-sm font-body font-semibold border transition-colors ${
              compareMode ? "bg-bottle text-white border-bottle" : "bg-white/60 text-ink border-borderc"
            }`}
          >
            {compareMode ? t("saved_exit_compare") : t("saved_compare")}
          </button>
        )}
      </div>

      {!hydrated || allSchemes === null ? (
        <p className="mt-8 text-muted font-body">{t("saved_loading")}</p>
      ) : saved.length === 0 ? (
        <div className="mt-8 bg-white/60 border border-borderc rounded-lg p-8 text-center">
          <p className="font-body text-ink/70">{t("saved_empty")}</p>
        </div>
      ) : (
        <>
          {compareMode && (
            <p className="mt-4 text-sm text-muted font-body">
              {t("saved_select_up_to_3", { n: compareIds.length })}
            </p>
          )}

          {compareMode && compareSchemes.length >= 2 && (
            <div className="mt-4">
              <CompareTable schemes={compareSchemes} />
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {saved.map((scheme) => (
              <div key={scheme.id} className="relative">
                {compareMode && (
                  <label className="absolute -left-1 top-5 -translate-x-full pr-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(scheme.id)}
                      onChange={() => toggleCompare(scheme.id)}
                      className="w-4 h-4 accent-bottle"
                    />
                  </label>
                )}
                <SchemeCard scheme={scheme} />
                <button
                  type="button"
                  onClick={() => remove(scheme.id)}
                  className="mt-1 text-xs font-body text-muted hover:text-red-700"
                >
                  {t("saved_remove")}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
