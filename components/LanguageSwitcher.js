"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "../lib/i18n/config";
import { useLanguage } from "../lib/i18n/LanguageContext";

const RECENT_KEY = "sn_recent_locales";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
      if (Array.isArray(parsed)) setRecent(parsed.filter((code) => LOCALES.some((l) => l.code === code)).slice(0, 4));
    } catch {
      setRecent([]);
    }
  }, []);

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
    setActiveIndex(0);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  const orderedLocales = useMemo(() => {
    const byCode = new Map(LOCALES.map((l) => [l.code, l]));
    const out = [];
    const seen = new Set();
    const push = (code) => {
      const item = byCode.get(code);
      if (item && !seen.has(code)) {
        out.push(item);
        seen.add(code);
      }
    };
    push(locale);
    recent.forEach(push);
    LOCALES.forEach((l) => push(l.code));
    return out;
  }, [locale, recent]);

  const filteredLocales = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return orderedLocales;
    return orderedLocales.filter((l) =>
      [l.native, l.name, l.code].some((value) => String(value || "").toLocaleLowerCase().includes(needle))
    );
  }, [orderedLocales, query]);

  useEffect(() => {
    if (activeIndex >= filteredLocales.length) setActiveIndex(Math.max(0, filteredLocales.length - 1));
  }, [activeIndex, filteredLocales.length]);

  async function handleSelect(code) {
    if (switching) return;
    setOpen(false);

    const nextRecent = [code, locale, ...recent].filter((value, index, arr) => value && arr.indexOf(value) === index).slice(0, 4);
    setRecent(nextRecent);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
    } catch {
      // Recent-language ordering is optional.
    }

    if (code === locale) return;
    setSwitching(true);
    await setLocale(code);
    router.refresh();
    setSwitching(false);
  }

  function handleSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((value) => Math.min(filteredLocales.length - 1, value + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((value) => Math.max(0, value - 1));
    } else if (e.key === "Enter" && filteredLocales[activeIndex]) {
      e.preventDefault();
      handleSelect(filteredLocales[activeIndex].code);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !switching && setOpen((o) => !o)}
        aria-label={t("lang_switch_label")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={switching ? "true" : "false"}
        disabled={switching}
        className="flex max-w-[52vw] items-center gap-1.5 rounded-full border border-borderc bg-white/60 px-3 py-1.5 text-sm font-body text-ledger shadow-sm transition-all duration-150 hover:border-saffron-dark hover:bg-white/80 active:scale-[.98] disabled:opacity-70 md:max-w-none"
      >
        <span aria-hidden="true">🌐</span>
        <span dir={current.dir} className="truncate">
          {switching ? "…" : current.native}
        </span>
        <span className={`shrink-0 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("lang_switch_label")}
          className="language-menu absolute end-0 z-[70] mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-borderc shadow-2xl animate-fadeIn"
        >
          <div className="border-b border-borderc bg-white/95 p-2">
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search languages…"
                aria-label="Search languages"
                aria-controls="language-options"
                aria-activedescendant={filteredLocales[activeIndex] ? `language-${filteredLocales[activeIndex].code}` : undefined}
                className="w-full rounded-xl border border-borderc bg-white/70 py-2 ps-9 pe-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-saffron"
              />
            </div>
          </div>

          <div id="language-options" className="language-options max-h-[min(58vh,480px)] overflow-y-auto overscroll-contain p-2">
            {filteredLocales.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm font-body text-muted">No language found</p>
            ) : (
              filteredLocales.map((l, index) => (
                <button
                  id={`language-${l.code}`}
                  key={l.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.code === locale}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(l.code)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-body transition-all duration-150 ${
                    l.code === locale
                      ? "bg-saffron-dark text-white shadow-sm"
                      : index === activeIndex
                      ? "bg-khadi-dark/70 text-ink"
                      : "text-ink hover:bg-khadi-dark/70"
                  }`}
                >
                  <span dir={l.dir} className="min-w-0 truncate text-start font-medium">
                    {l.native}
                  </span>
                  <span className="shrink-0 max-w-[8rem] truncate text-end text-[11px] opacity-60">
                    {l.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
