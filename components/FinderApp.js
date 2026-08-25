"use client";

import { useState } from "react";
import SchemeCard from "./SchemeCard";
import GuidedIntake from "./GuidedIntake";
import FreeTextIntake from "./FreeTextIntake";
import ShareCard from "./ShareCard";
import SemanticToggle from "./SemanticToggle";
import { useLanguage } from "../lib/i18n/LanguageContext";

function ResultsSkeleton() {
  return (
    <div className="mt-8 space-y-4 animate-fadeIn" aria-label="Loading matching schemes">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted font-body">
        <span className="loading-spark">✦</span>
        Checking the full scheme catalog
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-borderc bg-white/45 p-5 md:p-6 overflow-hidden">
          <div className="flex justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 rounded-full w-28" />
              <div className="skeleton h-6 rounded-lg w-4/5" />
              <div className="skeleton h-3 rounded-full w-full" />
              <div className="skeleton h-3 rounded-full w-3/4" />
            </div>
            <div className="skeleton w-9 h-9 rounded-full shrink-0" />
          </div>
          <div className="mt-4 skeleton h-14 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

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

  function handleGuidedSubmit(profile) {
    const queryText = [profile.occupation, profile.category, profile.state].filter(Boolean).join(" ") || "welfare scheme";
    runFind({ mode: "guided", profile, additionalContext: profile.occupation }, queryText);
  }
  function handleFreeTextSubmit(text) {
    runFind({ text }, text);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <div className="finder-mode-switch mx-auto mb-7">
        <button
          type="button"
          onClick={() => setMode("guided")}
          className={`finder-mode-button ${mode === "guided" ? "is-active" : ""}`}
        >
          {t("finder_mode_guided")}
        </button>
        <button
          type="button"
          onClick={() => setMode("freetext")}
          className={`finder-mode-button ${mode === "freetext" ? "is-active" : ""}`}
        >
          {t("finder_mode_freetext")}
        </button>
      </div>

      <div key={mode} className="finder-panel-enter">
        {mode === "guided" ? (
          <GuidedIntake onSubmit={handleGuidedSubmit} loading={loading} />
        ) : (
          <FreeTextIntake onSubmit={handleFreeTextSubmit} loading={loading} />
        )}
      </div>

      {loading && <ResultsSkeleton />}

      {error && (
        <p className="mt-6 text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 font-body animate-fadeIn">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 animate-fadeIn">
          {result.message && (
            <p className="text-ink/80 font-body bg-white/60 border border-borderc rounded-xl p-4">
              {result.message}
            </p>
          )}

          {result.explanation && (
            <div className="bg-saffron/10 border border-saffron/30 rounded-xl p-5 font-body text-ink whitespace-pre-line">
              {result.explanation}
            </div>
          )}

          {result.matches && result.matches.length > 0 && (
            <>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowShareCard(true)}
                  className="text-sm font-body font-semibold text-saffron-dark hover:underline flex items-center gap-1"
                >
                  {t("finder_share_results")}
                </button>
              </div>

              <div className="scheme-grid mt-2 grid gap-4">
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
