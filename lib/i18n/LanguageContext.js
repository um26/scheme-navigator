"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDictionary, translate } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, localeDirection } from "./config";
import { localizeScheme } from "./schemeContent";

const LanguageContext = createContext(null);

// Module-level cache survives route changes. A locale pack is downloaded at most
// once per browser session, and normal HTTP caching handles later visits/reloads.
const schemePackCache = new Map();

async function parseMaybeGzip(response) {
  const bytes = await response.arrayBuffer();
  const view = new Uint8Array(bytes);
  const isGzip = view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b;

  if (!isGzip) {
    return JSON.parse(new TextDecoder().decode(view));
  }

  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress the offline language pack.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

async function fetchSchemePack(locale) {
  if (!locale || locale === "en") return null;
  if (schemePackCache.has(locale)) return schemePackCache.get(locale);

  const promise = fetch(`/i18n/schemes/${locale}.json.gz`, {
    cache: "force-cache",
  }).then(async (res) => {
    if (!res.ok) {
      // Existing hi/te/ta UI translations remain usable while their full catalog
      // packs are still being generated. Missing content simply falls back to English.
      return null;
    }
    return parseMaybeGzip(res);
  });

  schemePackCache.set(locale, promise);

  try {
    return await promise;
  } catch (error) {
    schemePackCache.delete(locale);
    console.warn(`[i18n] Could not load ${locale} scheme pack`, error);
    return null;
  }
}

export function LanguageProvider({ initialLocale, children }) {
  const [locale, setLocaleState] = useState(initialLocale || DEFAULT_LOCALE);
  const [schemePack, setSchemePack] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(
    initialLocale && initialLocale !== "en"
  );

  // Direct visits/reloads already know the locale from the server cookie; fetch its
  // display pack after hydration.
  useEffect(() => {
    let cancelled = false;

    if (!locale || locale === "en") {
      setSchemePack(null);
      setTranslationLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setTranslationLoading(true);
    fetchSchemePack(locale).then((pack) => {
      if (cancelled) return;
      setSchemePack(pack);
      setTranslationLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Language switches preload the scheme pack before changing locale. Once the full
  // 22-language packs exist this makes labels + scheme text change together rather
  // than showing a flash of English content.
  const setLocale = useCallback(async (code) => {
    setTranslationLoading(code !== "en");
    const pack = code === "en" ? null : await fetchSchemePack(code);

    setSchemePack(pack);
    setLocaleState(code);
    setTranslationLoading(false);

    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = code;
    document.documentElement.dir = localeDirection(code);
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const localizeSchemeContent = useCallback(
    (scheme) => localizeScheme(scheme, locale, schemePack),
    [locale, schemePack]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dict: getDictionary(locale),
      localizeSchemeContent,
      translationLoading,
      hasSchemeTranslationPack: locale === "en" || Boolean(schemePack),
    }),
    [locale, setLocale, t, localizeSchemeContent, translationLoading, schemePack]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
