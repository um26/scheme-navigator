"use client";

import { useState } from "react";
import { EVAL_TEST_SET } from "../../data/evalTestSet";
import { useLanguage } from "../../lib/i18n/LanguageContext";

function pct(v) {
  return v == null ? "—" : `${(v * 100).toFixed(0)}%`;
}

function ScoreBar({ value }) {
  if (value == null) return <span className="text-muted text-xs">n/a</span>;
  const color = value >= 0.8 ? "bg-bottle" : value >= 0.5 ? "bg-saffron-dark" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-borderc overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-xs font-body w-9">{pct(value)}</span>
    </div>
  );
}

export default function EvalsPage() {
  const { t } = useLanguage();
  const [running, setRunning] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCase, setExpandedCase] = useState(null);

  async function runEval() {
    setRunning(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/evals/run", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Eval failed");
      else setData(json);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger">{t("evals_title")}</h1>
      <p className="mt-2 text-ink/70 font-body max-w-2xl">
        {t("evals_subtitle_p1")} <code className="text-sm bg-white/60 px-1 rounded">extractProfile()</code>,
        {" "}{t("evals_subtitle_p2")} <em>{t("evals_subtitle_p3")}</em>{" "}
        {t("evals_subtitle_p4")}{" "}
        {EVAL_TEST_SET.length}{t("evals_subtitle_p5")}
      </p>

      <button
        type="button"
        onClick={runEval}
        disabled={running}
        className="mt-6 px-6 py-3 rounded-lg bg-bottle text-white font-body font-semibold hover:bg-bottle-light transition-colors disabled:opacity-50"
      >
        {running ? t("evals_running") : t("evals_run_button")}
      </button>

      {error && (
        <p className="mt-6 text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 font-body">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-8 animate-fadeIn">
          <div className="flex flex-wrap gap-6 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted font-body">{t("evals_test_cases")}</p>
              <p className="font-display text-2xl text-ledger">{data.testSetSize}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted font-body">{t("evals_succeeded")}</p>
              <p className="font-display text-2xl text-bottle">{data.succeeded}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted font-body">{t("evals_failed")}</p>
              <p className="font-display text-2xl text-red-600">{data.failed}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted font-body">{t("evals_macro_f1")}</p>
              <p className="font-display text-2xl text-saffron-dark">{pct(data.macroF1)}</p>
            </div>
          </div>

          <div className="bg-white/60 border border-borderc rounded-lg overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-borderc bg-khadi-dark/40">
                  <th className="text-left p-3">{t("evals_field")}</th>
                  <th className="text-left p-3">{t("evals_precision")}</th>
                  <th className="text-left p-3">{t("evals_recall")}</th>
                  <th className="text-left p-3">{t("evals_f1")}</th>
                  <th className="text-left p-3">{t("evals_confusion")}</th>
                </tr>
              </thead>
              <tbody>
                {data.fieldScores.map((s) => (
                  <tr key={s.field} className="border-b border-borderc/60 last:border-0">
                    <td className="p-3 font-semibold text-ledger">{s.field}</td>
                    <td className="p-3"><ScoreBar value={s.precision} /></td>
                    <td className="p-3"><ScoreBar value={s.recall} /></td>
                    <td className="p-3"><ScoreBar value={s.f1} /></td>
                    <td className="p-3 text-xs text-muted">
                      {s.tp} / {s.fp} / {s.fn} / {s.tn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="font-display text-xl text-ledger mt-8 mb-3">{t("evals_per_case")}</h2>
          <div className="space-y-2">
            {data.results.map((r) => {
              const isOpen = expandedCase === r.id;
              const hasError = !!r.error;
              return (
                <div key={r.id} className="border border-borderc rounded-lg bg-white/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCase(isOpen ? null : r.id)}
                    className="w-full text-left p-3 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-body text-ink/80 truncate">{r.text}</span>
                    <span
                      className={`text-xs shrink-0 px-2 py-0.5 rounded-full font-semibold ${
                        hasError ? "bg-red-100 text-red-700" : "bg-bottle/10 text-bottle"
                      }`}
                    >
                      {hasError ? "error" : "ran"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-3 border-t border-borderc bg-khadi-dark/30 text-xs font-body grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold text-muted mb-1">{t("evals_expected")}</p>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(r.expected, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="font-semibold text-muted mb-1">{t("evals_extracted")}</p>
                        <pre className="whitespace-pre-wrap">
                          {hasError ? r.error : JSON.stringify(r.extracted, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
