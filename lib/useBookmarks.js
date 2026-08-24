"use client";

// Client-side bookmark store backed by localStorage. This is a real deployed app
// (not a Claude artifact), so localStorage is the right tool here — no backend/auth
// exists for this project, and bookmarks are inherently per-device/per-browser.

import { useState, useEffect, useCallback } from "react";

const KEY = "scheme-navigator:bookmarks";

function readStore() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(ids) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable (private browsing etc.) — fail silently, bookmarks just won't persist
  }
}

export function useBookmarks() {
  const [ids, setIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(readStore());
    setHydrated(true);
    function onStorage(e) {
      if (e.key === KEY) setIds(readStore());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isBookmarked = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeStore(next);
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      writeStore(next);
      return next;
    });
  }, []);

  return { ids, isBookmarked, toggle, remove, hydrated };
}
