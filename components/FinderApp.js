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

  function handleGuidedSubmit(profile) {
    const queryText = [profile.occupation, profile.category, profile.state].filter(Boolean).join(" ") || "welfare scheme";
    runFind({ mode: "guided", profile, additionalContext: profile.occupation }, queryText);
  }
  function handleFreeTextSubmit(text) {
    runFind({ text }, text);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <div className="flex justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode("guided")}
          className={`px-4 py-2 rounded-full text-sm font-body font-semibold border transition-colors ${
            mode === "guided"
              ? "bg-ledger text-white border-ledger"
              : "bg-white/60 text-ink border-borderc hover:border-ledger"
          }`}
        >
          {t("finder_mode_guided")}
        </button>
        <button
          type="button"
          onClick={() => setMode("freetext")}
          className={`px-4 py-2 rounded-full text-sm font-body font-semibold border transition-colors ${
            mode === "freetext"
              ? "bg-ledger text-white border-ledger"
              : "bg-white/60 text-ink border-borderc hover:border-ledger"
          }`}
        >
          {t("finder_mode_freetext")}
        </button>
      </div>

      {mode === "guided" ? (
        <GuidedIntake onSubmit={handleGuidedSubmit} loading={loading} />
      ) : (
        <FreeTextIntake onSubmit={handleFreeTextSubmit} loading={loading} />
      )}

      {error && (
        <p className="mt-6 text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 font-body">
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
                  className="text-sm font-body font-semibold text-saffron-dark hover:underline flex items-center gap-1"
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
