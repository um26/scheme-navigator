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
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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
        aria-busy={switching ? "true" : "false"}
        disabled={switching}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-borderc bg-white/60 text-sm font-body text-ledger hover:border-saffron-dark transition-colors disabled:opacity-70"
      >
        <span aria-hidden="true">🌐</span>
        <span dir={current.dir}>{switching ? "…" : current.native}</span>
        <span className={`text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 max-w-[88vw] max-h-[70vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-borderc rounded-xl shadow-xl z-20 p-1.5">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => handleSelect(l.code)}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-body transition-colors flex items-center justify-between gap-3 ${
                l.code === locale
                  ? "bg-bottle text-white"
                  : "text-ink hover:bg-khadi-dark/50"
              }`}
            >
              <span dir={l.dir} className="font-medium text-left">
                {l.native}
              </span>
              <span className="text-[11px] opacity-60 text-right truncate">
                {l.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
