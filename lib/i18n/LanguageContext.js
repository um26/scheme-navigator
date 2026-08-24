"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, translate } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "./config";

const LanguageContext = createContext(null);

// initialLocale comes from the root layout, which already read the cookie
// server-side — this just keeps client components in sync with it and provides
// setLocale() for the switcher. router.refresh() (called by the switcher, not here)
// is what makes server-rendered pages (browse, scheme detail) pick up the change.
export function LanguageProvider({ initialLocale, children }) {
  const [locale, setLocaleState] = useState(initialLocale || DEFAULT_LOCALE);

  const setLocale = useCallback((code) => {
    setLocaleState(code);
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dict: getDictionary(locale) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
