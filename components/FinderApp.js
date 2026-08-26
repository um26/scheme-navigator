"use client";

import { useState } from "react";
import SchemeCard from "./SchemeCard";
import GuidedIntake from "./GuidedIntake";
import FreeTextIntake from "./FreeTextIntake";
import ShareCard from "./ShareCard";
import SemanticToggle from "./SemanticToggle";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function FinderApp() {
  const { t, locale } = useLanguage();
  const [mode, setMode] = useState("guided");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastQueryText, setLastQueryText] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);

  async function runFind(payload, queryTextForSemantic) {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastQueryText(queryTextForSemantic || "");
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language: locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    if (nextMode === mode || loading) return;
    setMode(nextMode);
    setError(null);
    setResult(null);
    setShowShareCard(false);
  }

  function handleGuidedSubmit(profile) {
    const queryText = [profile.occupation, profile.category, profile.state].filter(Boolean).join(" ") || "welfare scheme";
    runFind({ mode: "guided", profile, additionalContext: profile.occupation }, queryText);
  }
  function handleFreeTextSubmit(text) {
    runFind({ text }, text);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-borderc bg-white/50 p-1 shadow-sm" role="group" aria-label="Finder mode">
          <button
            type="button"
            onClick={() => changeMode("guided")}
            aria-pressed={mode === "guided"}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-body font-semibold transition-all duration-150 disabled:opacity-60 ${
              mode === "guided"
                ? "bg-ledger text-white shadow-sm"
                : "text-ink hover:bg-white/70"
            }`}
          >
            {t("finder_mode_guided")}
          </button>
          <button
            type="button"
            onClick={() => changeMode("freetext")}
            aria-pressed={mode === "freetext"}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-body font-semibold transition-all duration-150 disabled:opacity-60 ${
              mode === "freetext"
                ? "bg-ledger text-white shadow-sm"
                : "text-ink hover:bg-white/70"
            }`}
          >
            {t("finder_mode_freetext")}
          </button>
        </div>
      </div>

      <div key={mode} className="animate-fadeIn" aria-busy={loading ? "true" : "false"}>
        {mode === "guided" ? (
          <GuidedIntake onSubmit={handleGuidedSubmit} loading={loading} />
        ) : (
          <FreeTextIntake onSubmit={handleFreeTextSubmit} loading={loading} />
        )}
      </div>

      {loading && (
        <div role="status" className="mt-4 flex items-center justify-center gap-2 text-sm font-body text-muted">
          <span className="loading-dot" aria-hidden="true" />
          <span>{mode === "guided" ? t("guided_checking") : t("freetext_checking")}</span>
        </div>
      )}

      {error && (
        <p className="mt-6 animate-fadeIn rounded-lg border border-red-200 bg-red-50 p-4 font-body text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 animate-fadeIn">
          {result.message && (
            <p className="text-ink/80 font-body bg-white/60 border border-borderc rounded-lg p-4">
              {result.message}
            </p>
          )}

          {result.explanation && (
            <div className="bg-saffron/10 border border-saffron/30 rounded-lg p-5 font-body text-ink whitespace-pre-line">
              {result.explanation}
            </div>
          )}

          {result.matches && result.matches.length > 0 && (
            <>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowShareCard(true)}
                  className="flex items-center gap-1 text-sm font-body font-semibold text-saffron-dark transition-colors hover:text-saffron"
                >
                  {t("finder_share_results")}
                </button>
              </div>

              <div className="mt-2 grid gap-4">
                {result.matches.map((scheme) => (
                  <SchemeCard key={scheme.id} scheme={scheme} checks={scheme._checks} />
                ))}
              </div>

              {result.candidatePool && result.candidatePool.length > 1 && (
                <SemanticToggle query={lastQueryText} candidatePool={result.candidatePool} />
              )}
            </>
          )}

          {typeof result.totalEligible === "number" && (
            <p className="mt-4 text-xs text-muted font-body">
              {result.totalEligible} {t("results_schemes_passed")}
              {result.matches?.length < result.totalEligible
                ? `; ${t("results_showing_most_relevant", { n: result.matches.length })}`
                : ""}
              .
            </p>
          )}
        </div>
      )}

      {showShareCard && result?.matches?.length > 0 && (
        <ShareCard matches={result.matches} profile={result.profile} onClose={() => setShowShareCard(false)} />
      )}
    </div>
  );
}
