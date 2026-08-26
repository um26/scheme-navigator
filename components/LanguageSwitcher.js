"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "../lib/i18n/config";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);

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

  async function handleSelect(code) {
    if (code === locale || switching) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setSwitching(true);
    await setLocale(code);
    router.refresh();
    setSwitching(false);
  }

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

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
          className="language-menu absolute right-0 z-[70] mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-borderc p-2 shadow-2xl animate-fadeIn"
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === locale}
              onClick={() => handleSelect(l.code)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-body transition-all duration-150 ${
                l.code === locale
                  ? "bg-saffron-dark text-white shadow-sm"
                  : "text-ink hover:bg-khadi-dark/70"
              }`}
            >
              <span dir={l.dir} className="min-w-0 truncate text-left font-medium">
                {l.native}
              </span>
              <span className="shrink-0 max-w-[7.5rem] truncate text-right text-[11px] opacity-60">
                {l.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
