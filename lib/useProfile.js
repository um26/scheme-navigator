"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const LEGACY_KEY = "scheme-navigator:profile:v1";
const KEY = "scheme-navigator:household:v2";
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

const DEFAULT_MEMBER = {
  id: "me",
  label: "Me",
  relationship: "self",
  profile: EMPTY_PROFILE,
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

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMember(member, fallbackIndex = 0) {
  const relationship = stringOrNull(member?.relationship) || (fallbackIndex === 0 ? "self" : "other");
  return {
    id: stringOrNull(member?.id) || newId(),
    label: stringOrNull(member?.label) || (relationship === "self" ? "Me" : `Person ${fallbackIndex + 1}`),
    relationship,
    profile: normalizeProfile(member?.profile || {}),
  };
}

function normalizeStore(input = {}) {
  const rawMembers = Array.isArray(input.members) && input.members.length ? input.members : [DEFAULT_MEMBER];
  const members = rawMembers.map((member, index) => normalizeMember(member, index));
  const requestedActive = stringOrNull(input.activeId);
  const activeId = members.some((member) => member.id === requestedActive) ? requestedActive : members[0].id;
  return { version: 2, activeId, members };
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(EVENT)), 0);
  } catch {
    // If storage is unavailable, the current tab still keeps its React state.
  }
}

function readStore() {
  if (typeof window === "undefined") return normalizeStore();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return normalizeStore(JSON.parse(raw));

    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacyProfile = normalizeProfile(JSON.parse(legacyRaw));
      const migrated = normalizeStore({ members: [{ ...DEFAULT_MEMBER, profile: legacyProfile }], activeId: "me" });
      writeStore(migrated);
      return migrated;
    }
  } catch {
    // Fall through to a fresh local-only household.
  }
  return normalizeStore();
}

export function useProfile() {
  const [store, setStore] = useState(() => normalizeStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStore(readStore());
    setHydrated(true);

    function syncFromStorage(event) {
      if (!event || event.type === EVENT || event.key === KEY || event.key === LEGACY_KEY) setStore(readStore());
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(EVENT, syncFromStorage);
    };
  }, []);

  const activeMember = useMemo(
    () => store.members.find((member) => member.id === store.activeId) || store.members[0] || DEFAULT_MEMBER,
    [store]
  );
  const profile = activeMember.profile || EMPTY_PROFILE;

  const commit = useCallback((updater) => {
    setStore((previous) => {
      const next = normalizeStore(typeof updater === "function" ? updater(previous) : updater);
      writeStore(next);
      return next;
    });
  }, []);

  const saveProfile = useCallback((next) => {
    commit((previous) => {
      const current = previous.members.find((member) => member.id === previous.activeId) || previous.members[0];
      const resolved = typeof next === "function" ? next(current?.profile || EMPTY_PROFILE) : next;
      return {
        ...previous,
        members: previous.members.map((member) =>
          member.id === previous.activeId ? { ...member, profile: normalizeProfile(resolved) } : member
        ),
      };
    });
  }, [commit]);

  const clearProfile = useCallback(() => {
    saveProfile({ ...EMPTY_PROFILE });
  }, [saveProfile]);

  const createProfile = useCallback(({ label, relationship = "other", profile: initialProfile = EMPTY_PROFILE } = {}) => {
    const id = newId();
    const member = normalizeMember({ id, label, relationship, profile: initialProfile }, 1);
    commit((previous) => ({ ...previous, activeId: id, members: [...previous.members, member] }));
    return id;
  }, [commit]);

  const selectProfile = useCallback((id) => {
    commit((previous) => previous.members.some((member) => member.id === id) ? { ...previous, activeId: id } : previous);
  }, [commit]);

  const updateMember = useCallback((id, patch) => {
    commit((previous) => ({
      ...previous,
      members: previous.members.map((member, index) =>
        member.id === id
          ? normalizeMember({ ...member, ...patch, profile: patch?.profile ? patch.profile : member.profile }, index)
          : member
      ),
    }));
  }, [commit]);

  const deleteProfile = useCallback((id) => {
    commit((previous) => {
      if (previous.members.length <= 1) {
        return { ...previous, members: [{ ...previous.members[0], profile: { ...EMPTY_PROFILE } }] };
      }
      const members = previous.members.filter((member) => member.id !== id);
      const activeId = previous.activeId === id ? members[0].id : previous.activeId;
      return { ...previous, members, activeId };
    });
  }, [commit]);

  const completion = useMemo(() => profileCompletion(profile), [profile]);
  const hasProfile = useMemo(() => profileHasData(profile), [profile]);

  return {
    profile,
    hydrated,
    saveProfile,
    clearProfile,
    completion,
    hasProfile,
    profiles: store.members,
    activeProfileId: activeMember.id,
    activeProfileLabel: activeMember.label,
    activeRelationship: activeMember.relationship,
    createProfile,
    selectProfile,
    updateMember,
    deleteProfile,
  };
}
