"use client";

import { useState } from "react";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";

// On-device semantic re-ranking. Deliberately scoped to a bounded candidate pool
// (the top ~60 TF-IDF-ranked eligible schemes from /api/find), not the full 4,693 —
// running a transformer forward pass per scheme in-browser via WASM doesn't scale to
// the whole corpus, so this is a real two-stage retrieval architecture: lexical
// TF-IDF for fast candidate generation server-side, semantic re-ranking for
// precision, client-side, with zero server cost and zero API key.
//
// This is the second attempt at embeddings in this project — the first (server-side,
// at build time, for the whole 4.7k corpus) hit real infrastructure walls: Voyage AI
// needs a card, HF Inference API was unreliable, and on-device transformers.js is
// architecturally broken in Vercel's Node.js serverless runtime (hard-coded
// onnxruntime-node, no WASM override, see scripts/build-map.mjs era notes). Running
// the SAME technique in the BROWSER instead sidesteps all three: no server, no
// native binary, onnxruntime-web (WASM) is what transformers.js uses in a browser
// context automatically.

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

let cachedExtractor = null;

async function getExtractor(onProgress) {
  if (cachedExtractor) return cachedExtractor;
  const { pipeline, env } = await import("@xenova/transformers");
  env.allowLocalModels = false;
  cachedExtractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    progress_callback: onProgress,
  });
  return cachedExtractor;
}

export default function SemanticToggle({ query, candidatePool }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [progressMsg, setProgressMsg] = useState("");
  const [ranked, setRanked] = useState(null);
  const [error, setError] = useState(null);

  async function runSemanticSearch() {
    setStatus("loading");
    setError(null);
    try {
      const extractor = await getExtractor((p) => {
        if (p.status === "progress") {
          setProgressMsg(`Downloading on-device model… ${Math.round(p.progress || 0)}%`);
        } else if (p.status === "ready") {
          setProgressMsg("Model ready, computing embeddings…");
        }
      });

      setProgressMsg("Embedding your query…");
      const queryEmbed = await extractor(query, { pooling: "mean", normalize: true });
      const queryVec = Array.from(queryEmbed.data);

      const pool = candidatePool.slice(0, 60);
      setProgressMsg(`Embedding ${pool.length} candidate schemes…`);

      const scored = [];
      for (const scheme of pool) {
        const text = `${scheme.name}. ${stripMarkdown(scheme.description || "")}`.slice(0, 500);
        const embed = await extractor(text, { pooling: "mean", normalize: true });
        const vec = Array.from(embed.data);
        scored.push({ ...scheme, _semanticScore: cosineSimilarity(queryVec, vec) });
      }

      scored.sort((a, b) => b._semanticScore - a._semanticScore);
      setRanked(scored.slice(0, 8));
      setStatus("ready");
    } catch (err) {
      console.error("[SemanticToggle] failed:", err);
      setError(t("semantic_error"));
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 border border-bottle/30 bg-bottle/5 rounded-lg p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-body font-semibold text-ledger text-sm">
            {t("semantic_title")}
          </p>
          <p className="text-xs text-muted font-body mt-0.5">
            {t("semantic_desc")}
          </p>
        </div>
        {status === "idle" && (
          <button
            type="button"
            onClick={runSemanticSearch}
            className="px-4 py-2 rounded-lg bg-bottle text-white font-body text-sm font-semibold hover:bg-bottle-light transition-colors shrink-0"
          >
            {t("semantic_try")}
          </button>
        )}
      </div>

      {status === "loading" && (
        <p className="mt-3 text-xs text-bottle font-body animate-pulse">{progressMsg || "Starting…"}</p>
      )}

      {status === "error" && <p className="mt-3 text-xs text-red-700 font-body">{error}</p>}

      {status === "ready" && ranked && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted font-body">
            {t("semantic_reranked_by", { n: ranked.length, total: candidatePool.length })}
          </p>
          {ranked.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between bg-white/60 border border-borderc rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted w-5 shrink-0">{i + 1}.</span>
                <span className="text-sm font-body text-ink truncate">{s.name}</span>
              </div>
              <span className="text-xs text-bottle font-mono shrink-0 ml-2">
                {(s._semanticScore * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
