"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "scheme-navigator:applications:v1";
const EVENT = "scheme-navigator:applications-changed";

export const APPLICATION_STATUSES = ["saved", "preparing", "applied", "completed"];

export function defaultApplicationEntry() {
  return {
    status: "saved",
    documents: {},
    note: "",
    updatedAt: null,
  };
}

function normalizeEntry(entry = {}) {
  return {
    status: APPLICATION_STATUSES.includes(entry.status) ? entry.status : "saved",
    documents: entry.documents && typeof entry.documents === "object" ? entry.documents : {},
    note: typeof entry.note === "string" ? entry.note : "",
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
  };
}

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([id, entry]) => [id, normalizeEntry(entry)]));
  } catch {
    return {};
  }
}

function writeStore(entries) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT)), 0);
  } catch {
    // Progress remains available in the current React state when storage is blocked.
  }
}

export function useApplications() {
  const [entries, setEntries] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(readStore());
    setHydrated(true);

    function sync(event) {
      if (!event || event.type === EVENT || event.key === KEY) setEntries(readStore());
    }

    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const updateEntry = useCallback((schemeId, updater) => {
    setEntries((prev) => {
      const current = normalizeEntry(prev[schemeId] || defaultApplicationEntry());
      const patch = typeof updater === "function" ? updater(current) : updater;
      const nextEntry = normalizeEntry({ ...current, ...patch, updatedAt: new Date().toISOString() });
      const next = { ...prev, [schemeId]: nextEntry };
      writeStore(next);
      return next;
    });
  }, []);

  const setStatus = useCallback((schemeId, status) => {
    updateEntry(schemeId, { status });
  }, [updateEntry]);

  const toggleDocument = useCallback((schemeId, documentKey) => {
    updateEntry(schemeId, (current) => ({
      documents: {
        ...current.documents,
        [documentKey]: !current.documents?.[documentKey],
      },
    }));
  }, [updateEntry]);

  const setNote = useCallback((schemeId, note) => {
    updateEntry(schemeId, { note });
  }, [updateEntry]);

  const clearEntry = useCallback((schemeId) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[schemeId];
      writeStore(next);
      return next;
    });
  }, []);

  return { entries, hydrated, setStatus, toggleDocument, setNote, clearEntry };
}
