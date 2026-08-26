"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function BrowseRegionPicker({ options, currentRegion, currentLabel, baseParams }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLocaleLowerCase().includes(needle));
  }, [options, query]);

  function choose(value) {
    const usp = new URLSearchParams();
    if (value && value !== "All") usp.set("region", value);
    if (baseParams.q) usp.set("q", baseParams.q);
    if (baseParams.category && baseParams.category !== "All") usp.set("category", baseParams.category);
    if (baseParams.gender && baseParams.gender !== "any") usp.set("gender", baseParams.gender);
    usp.set("page", "1");
    setOpen(false);
    router.push(`/browse?${usp.toString()}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="interactive-surface flex min-w-[11rem] items-center justify-between gap-2 rounded-lg border border-borderc bg-white/70 px-3 py-2 text-sm font-body text-ink hover:border-bottle hover:bg-white"
      >
        <span className="truncate">{currentLabel}</span>
        <span aria-hidden="true" className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute start-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-borderc bg-white/95 p-2 shadow-xl animate-fadeIn">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search state / UT…"
            aria-label="Search state or union territory"
            className="w-full rounded-lg border border-borderc bg-white/70 px-3 py-2 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-saffron"
          />
          <div role="listbox" aria-label="Region" className="mt-2 max-h-72 overflow-y-auto overscroll-contain">
            {filtered.map((option) => {
              const active = option.value === currentRegion;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(option.value)}
                  className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-body transition-colors ${active ? "bg-saffron-dark text-white" : "text-ink hover:bg-khadi-dark/70"}`}
                >
                  {option.label}
                </button>
              );
            })}
            {filtered.length === 0 && <p className="px-3 py-5 text-center text-sm text-muted font-body">No region found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
