"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

const RECENTS_KEY = "sn_recent_schemes";

function readRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function remember(id) {
  try {
    const next = [id, ...readRecents().filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

function score(item, q) {
  const name = (item.name || "").toLowerCase();
  const state = (item.state || "").toLowerCase();
  const ministry = (item.ministry || "").toLowerCase();
  const tags = (item.tags || "").toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (state.startsWith(q)) return 40;
  if (ministry.includes(q)) return 28;
  if (tags.includes(q)) return 20;
  return 0;
}

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    if (!index) {
      fetch("/data/schemes-lite.json")
        .then((r) => r.json())
        .then(setIndex)
        .catch(() => setIndex([]));
    }
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!index) return [];
    if (!normalized) {
      const recentSet = new Set(typeof window !== "undefined" ? readRecents() : []);
      return index.filter((s) => recentSet.has(s.id)).sort((a, b) => {
        const r = readRecents();
        return r.indexOf(a.id) - r.indexOf(b.id);
      }).slice(0, 6);
    }
    return index
      .map((item) => ({ item, rank: score(item, normalized) }))
      .filter((x) => x.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 8)
      .map((x) => x.item);
  }, [index, normalized]);

  const regionMatches = useMemo(() => {
    if (!index || !normalized) return [];
    const states = [...new Set(index.map((s) => s.state).filter(Boolean))];
    return states.filter((s) => s.toLowerCase().includes(normalized)).slice(0, 4);
  }, [index, normalized]);

  const ministryMatches = useMemo(() => {
    if (!index || !normalized) return [];
    const ministries = [...new Set(index.map((s) => s.ministry).filter(Boolean))];
    return ministries.filter((s) => s.toLowerCase().includes(normalized)).slice(0, 3);
  }, [index, normalized]);

  if (!open) return null;

  function goScheme(item) {
    remember(item.id);
    onClose();
    router.push(`/scheme/${item.id}`);
  }

  function goRegion(state) {
    onClose();
    router.push(`/browse?region=${encodeURIComponent(state)}&page=1`);
  }

  function goMinistry(ministry) {
    onClose();
    router.push(`/browse?q=${encodeURIComponent(ministry)}&page=1`);
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="Search schemes">
        <div className="command-search-row">
          <span className="text-saffron-dark text-lg" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 4,693 schemes, states, ministries…"
            className="command-input"
          />
          <kbd className="command-kbd">ESC</kbd>
        </div>

        <div className="command-results">
          {!index ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="command-section-label">{normalized ? "Schemes" : "Recent schemes"}</div>
              {results.length ? results.map((item) => (
                <button key={item.id} type="button" className="command-result" onClick={() => goScheme(item)}>
                  <span className="command-result-icon">✦</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold text-ledger truncate">{item.name}</span>
                    <span className="block text-xs text-muted truncate">
                      {item.level === "Central" ? "Central" : localizeState(locale, item.state)}
                      {item.ministry ? ` · ${item.ministry}` : ""}
                    </span>
                  </span>
                  <span className="text-muted text-xs">↗</span>
                </button>
              )) : <p className="px-4 py-5 text-sm text-muted font-body">No matching schemes yet.</p>}

              {regionMatches.length > 0 && (
                <>
                  <div className="command-section-label">Regions</div>
                  <div className="px-2 pb-2 flex flex-wrap gap-2">
                    {regionMatches.map((state) => (
                      <button key={state} onClick={() => goRegion(state)} className="command-chip">
                        {localizeState(locale, state)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {ministryMatches.length > 0 && (
                <>
                  <div className="command-section-label">Ministries</div>
                  <div className="px-2 pb-3 flex flex-wrap gap-2">
                    {ministryMatches.map((ministry) => (
                      <button key={ministry} onClick={() => goMinistry(ministry)} className="command-chip max-w-full truncate">
                        {ministry}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="command-footer">
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⌘K</kbd> anywhere</span>
          <span>4,693 indexed locally</span>
        </div>
      </div>
    </div>
  );
}
