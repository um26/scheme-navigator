"use client";

import { useMemo, useState } from "react";
import { parseBlocks, stripMarkdown } from "../lib/markdownLite";
import { defaultApplicationEntry } from "../lib/useApplications";

const STATUS = [
  { key: "saved", label: "Saved" },
  { key: "preparing", label: "Preparing" },
  { key: "applied", label: "Applied" },
  { key: "completed", label: "Completed" },
];

function extractDocuments(text) {
  if (!text) return [];
  const raw = parseBlocks(text).flatMap((block) => block.lines || []);
  const unique = [];
  const seen = new Set();
  for (const line of raw) {
    const clean = stripMarkdown(line).replace(/^[-•]\s*/, "").trim();
    if (!clean || clean.length < 3) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(clean);
    }
    if (unique.length >= 18) break;
  }
  return unique;
}

export default function ApplicationTracker({ scheme, entry, onStatus, onDocument, onNote, onClear }) {
  const [open, setOpen] = useState(false);
  const current = entry || defaultApplicationEntry();
  const documents = useMemo(() => extractDocuments(scheme.documentsRequired), [scheme.documentsRequired]);
  const completedDocs = documents.filter((_, index) => Boolean(current.documents?.[String(index)])).length;
  const statusMeta = STATUS.find((item) => item.key === current.status) || STATUS[0];

  return (
    <div className="mt-3 rounded-xl border border-borderc bg-white/45 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="interactive-surface flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted font-body">Application workspace</p>
          <p className="mt-0.5 text-sm font-body font-semibold text-ledger">
            {statusMeta.label}{documents.length ? ` · ${completedDocs}/${documents.length} documents ready` : ""}
          </p>
        </div>
        <span aria-hidden="true" className={`shrink-0 text-sm text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-borderc/70 p-4 animate-fadeIn">
          <div>
            <p className="text-xs font-body font-semibold text-ledger">Status</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS.map((item, index) => {
                const selected = current.status === item.key;
                const reached = STATUS.findIndex((value) => value.key === current.status) >= index;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onStatus(item.key)}
                    aria-pressed={selected}
                    className={`interactive-surface rounded-lg border px-2.5 py-2 text-xs font-body font-semibold ${
                      selected
                        ? "border-saffron-dark bg-saffron-dark text-white"
                        : reached
                        ? "border-bottle/40 bg-bottle/10 text-bottle"
                        : "border-borderc bg-white/60 text-ink hover:bg-white"
                    }`}
                  >
                    {reached && !selected ? "✓ " : ""}{item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-body font-semibold text-ledger">Document checklist</p>
              {documents.length > 0 && <span className="text-xs font-body text-muted">{completedDocs}/{documents.length}</span>}
            </div>
            {documents.length > 0 ? (
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pe-1">
                {documents.map((document, index) => {
                  const key = String(index);
                  const checked = Boolean(current.documents?.[key]);
                  return (
                    <label key={`${key}-${document}`} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs font-body text-ink/80 hover:bg-white/60">
                      <input type="checkbox" checked={checked} onChange={() => onDocument(key)} className="mt-0.5 accent-bottle" />
                      <span className={checked ? "line-through opacity-60" : ""}>{document}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs font-body text-muted">No structured document list is available for this scheme yet. Use notes below to track what the official portal asks for.</p>
            )}
          </div>

          <div className="mt-4">
            <label className="text-xs font-body font-semibold text-ledger" htmlFor={`application-note-${scheme.id}`}>Private note</label>
            <textarea
              id={`application-note-${scheme.id}`}
              value={current.note || ""}
              onChange={(event) => onNote(event.target.value)}
              rows={2}
              placeholder="e.g. income certificate requested; portal reference number…"
              className="mt-2 w-full rounded-lg border border-borderc bg-white p-2.5 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-saffron"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-body text-muted">Stored only in this browser.</p>
            <button type="button" onClick={onClear} className="text-[11px] font-body text-muted hover:text-red-700 dark:hover:text-red-300">Reset application progress</button>
          </div>
        </div>
      )}
    </div>
  );
}
