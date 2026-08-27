"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "scheme-navigator:profile:v1";
const EVENT = "scheme-navigator:profile-changed";

export const EMPTY_PROFILE = {
  age: null,
  gender: null,
  state: null,
  annualIncome: null,
  isBPL: null,
  category: null,
  hasDisability: null,
  occupation: null,
};

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

export function normalizeProfile(input = {}) {
  return {
    age: numberOrNull(input.age),
    gender: input.gender === "male" || input.gender === "female" ? input.gender : null,
    state: stringOrNull(input.state),
    annualIncome: numberOrNull(input.annualIncome),
    isBPL: typeof input.isBPL === "boolean" ? input.isBPL : null,
    category: ["General", "SC", "ST", "OBC", "EWS"].includes(input.category) ? input.category : null,
    hasDisability: typeof input.hasDisability === "boolean" ? input.hasDisability : null,
    occupation: stringOrNull(input.occupation),
  };
}

export function profileCompletion(profile = EMPTY_PROFILE) {
  const fields = ["age", "gender", "state", "annualIncome", "isBPL", "category", "hasDisability"];
  const known = fields.filter((key) => profile[key] !== null && profile[key] !== undefined && profile[key] !== "").length;
  return { known, total: fields.length, percent: Math.round((known / fields.length) * 100) };
}

export function profileHasData(profile = EMPTY_PROFILE) {
  return profileCompletion(profile).known > 0 || Boolean(profile.occupation);
}

function readStore() {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function writeStore(profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT)), 0);
  } catch {
    // If storage is unavailable, the current tab still keeps its React state.
  }
}

export function useProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(readStore());
    setHydrated(true);

    function syncFromStorage(event) {
      if (!event || event.type === EVENT || event.key === KEY) setProfile(readStore());
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(EVENT, syncFromStorage);
    };
  }, []);

  const saveProfile = useCallback((next) => {
    setProfile((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const normalized = normalizeProfile(resolved);
      writeStore(normalized);
      return normalized;
    });
  }, []);

  const clearProfile = useCallback(() => {
    const empty = { ...EMPTY_PROFILE };
    try {
      window.localStorage.removeItem(KEY);
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT)), 0);
    } catch {
      // no-op
    }
    setProfile(empty);
  }, []);

  const completion = useMemo(() => profileCompletion(profile), [profile]);
  const hasProfile = useMemo(() => profileHasData(profile), [profile]);

  return { profile, hydrated, saveProfile, clearProfile, completion, hasProfile };
}
