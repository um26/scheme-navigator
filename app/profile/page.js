"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { INDIAN_STATES } from "../../lib/indianStates";
import { evaluateEligibility } from "../../lib/ruleEngine";
import { EMPTY_PROFILE, normalizeProfile, profileCompletion, useProfile } from "../../lib/useProfile";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

const RELATIONSHIPS = [
  ["self", "Me"],
  ["mother", "Mother"],
  ["father", "Father"],
  ["spouse", "Spouse"],
  ["child", "Child"],
  ["grandparent", "Grandparent"],
  ["sibling", "Sibling"],
  ["other", "Other"],
];

function toDraft(profile) {
  return {
    ...EMPTY_PROFILE,
    ...profile,
    age: profile?.age ?? "",
    annualIncome: profile?.annualIncome ?? "",
    occupation: profile?.occupation ?? "",
  };
}

function ChoiceRow({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.key || String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`interactive-surface rounded-full border px-3 py-1.5 text-sm font-body ${
            value === option.value ? "border-bottle bg-bottle text-white" : "border-borderc bg-white/60 text-ink hover:bg-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { t, locale } = useLanguage();
  const {
    profile,
    hydrated,
    saveProfile,
    clearProfile,
    profiles,
    activeProfileId,
    activeProfileLabel,
    activeRelationship,
    createProfile,
    selectProfile,
    updateMember,
    deleteProfile,
  } = useProfile();

  const [draft, setDraft] = useState(toDraft(EMPTY_PROFILE));
  const [savedFlash, setSavedFlash] = useState(false);
  const [schemes, setSchemes] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("other");

  useEffect(() => {
    if (hydrated) {
      setDraft(toDraft(profile));
      setSavedFlash(false);
    }
  }, [hydrated, activeProfileId]);

  useEffect(() => {
    fetch("/data/schemes-lite.json")
      .then((response) => response.json())
      .then((data) => setSchemes(Array.isArray(data) ? data : []))
      .catch(() => setSchemes([]));
  }, []);

  const cleaned = useMemo(() => normalizeProfile(draft), [draft]);
  const completion = useMemo(() => profileCompletion(cleaned), [cleaned]);
  const eligibilityCounts = useMemo(() => {
    if (!schemes) return null;
    const counts = { likely_eligible: 0, needs_info: 0, not_eligible: 0 };
    for (const scheme of schemes) counts[evaluateEligibility(cleaned, scheme).status] += 1;
    return counts;
  }, [schemes, cleaned]);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedFlash(false);
  }

  function handleSave() {
    saveProfile(cleaned);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  function handleClear() {
    clearProfile();
    setDraft(toDraft(EMPTY_PROFILE));
    setSavedFlash(false);
  }

  function addPerson() {
    const relationLabel = RELATIONSHIPS.find(([value]) => value === newRelationship)?.[1] || "Person";
    createProfile({ label: newName.trim() || relationLabel, relationship: newRelationship });
    setNewName("");
    setNewRelationship("other");
    setAdding(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">Household eligibility</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">Household Profiles</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">
            Check schemes for yourself and family members without creating accounts. The active household profile is used by Find, Browse, Saved, scheme pages, and What-If.
          </p>
        </div>
        <div className="rounded-xl border border-borderc bg-white/60 px-4 py-3 text-end shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-muted font-body">{activeProfileLabel} completeness</p>
          <p className="font-display text-2xl text-bottle">{completion.known}/{completion.total}</p>
          <p className="text-xs text-muted font-body">{completion.percent}% of structured fields</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-bottle/20 bg-bottle/5 p-4 text-sm font-body text-ink/80">
        <span className="font-semibold text-bottle">Privacy:</span> every household profile stays in this browser. No account is required and profiles are not uploaded to a Scheme Navigator database.
      </div>

      <section className="mt-5 rounded-xl border border-borderc bg-white/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ledger">Who are you checking for?</h2>
            <p className="text-xs font-body text-muted">Switching profiles instantly changes personal eligibility badges across the site.</p>
          </div>
          <button type="button" onClick={() => setAdding((value) => !value)} className="interactive-surface rounded-full border border-borderc bg-white/60 px-3 py-1.5 text-sm font-body font-semibold text-bottle hover:bg-white">+ Add person</button>
        </div>

        <div className="nav-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
          {profiles.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => selectProfile(member.id)}
              aria-pressed={member.id === activeProfileId}
              className={`interactive-surface shrink-0 rounded-full border px-4 py-2 text-sm font-body font-semibold ${member.id === activeProfileId ? "border-saffron-dark bg-saffron-dark text-white" : "border-borderc bg-white/60 text-ink hover:bg-white"}`}
            >
              {member.label}
              <span className="ms-1 opacity-65">· {RELATIONSHIPS.find(([value]) => value === member.relationship)?.[1] || "Other"}</span>
            </button>
          ))}
        </div>

        {adding && (
          <div className="mt-4 grid gap-3 rounded-lg border border-borderc bg-khadi-dark/25 p-3 sm:grid-cols-[1fr_12rem_auto]">
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Name, e.g. Dad" className="rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron" />
            <select value={newRelationship} onChange={(event) => setNewRelationship(event.target.value)} className="rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron">
              {RELATIONSHIPS.filter(([value]) => value !== "self").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={addPerson} className="interactive-surface rounded-lg bg-bottle px-4 py-2.5 text-sm font-body font-semibold text-white hover:bg-bottle-light">Add</button>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <input value={activeProfileLabel} onChange={(event) => updateMember(activeProfileId, { label: event.target.value })} aria-label="Profile name" className="rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron" />
          <select value={activeRelationship} onChange={(event) => updateMember(activeProfileId, { relationship: event.target.value })} aria-label="Relationship" className="rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron">
            {RELATIONSHIPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => deleteProfile(activeProfileId)} className="interactive-surface rounded-lg border border-red-300/60 bg-white/50 px-3 py-2 text-sm font-body text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30">{profiles.length > 1 ? "Remove" : "Reset"}</button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 rounded-xl border border-borderc bg-white/60 p-5 shadow-sm md:grid-cols-2 md:p-6">
        <div>
          <label className="block text-sm font-body font-semibold text-ledger mb-2">{t("guided_age_label")}</label>
          <input type="number" min="0" max="120" value={draft.age} onChange={(event) => update("age", event.target.value)} placeholder="e.g. 34" className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body focus:outline-none focus:ring-2 focus:ring-saffron" />
        </div>
        <div>
          <label className="block text-sm font-body font-semibold text-ledger mb-2">{t("guided_income_label")}</label>
          <input type="number" min="0" value={draft.annualIncome} onChange={(event) => update("annualIncome", event.target.value)} placeholder="e.g. 150000" className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body focus:outline-none focus:ring-2 focus:ring-saffron" />
        </div>

        <div>
          <p className="text-sm font-body font-semibold text-ledger mb-2">{t("guided_gender_label")}</p>
          <ChoiceRow value={draft.gender} onChange={(value) => update("gender", value)} options={[{ label: t("guided_gender_male"), value: "male" }, { label: t("guided_gender_female"), value: "female" }, { label: t("guided_prefer_not_say"), value: null, key: "gender-null" }]} />
        </div>

        <div>
          <label className="block text-sm font-body font-semibold text-ledger mb-2">{t("guided_state_label")}</label>
          <select value={draft.state || ""} onChange={(event) => update("state", event.target.value || null)} className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body focus:outline-none focus:ring-2 focus:ring-saffron">
            <option value="">{t("guided_state_placeholder")}</option>
            {INDIAN_STATES.map((state) => <option key={state} value={state}>{localizeState(locale, state)}</option>)}
          </select>
        </div>

        <div>
          <p className="text-sm font-body font-semibold text-ledger mb-2">{t("guided_category_label")}</p>
          <ChoiceRow value={draft.category} onChange={(value) => update("category", value)} options={[{ label: t("guided_category_general"), value: "General" }, { label: "SC", value: "SC" }, { label: "ST", value: "ST" }, { label: "OBC", value: "OBC" }, { label: "EWS", value: "EWS" }, { label: t("guided_prefer_not_say"), value: null, key: "category-null" }]} />
        </div>

        <div>
          <p className="text-sm font-body font-semibold text-ledger mb-2">{t("guided_bpl_label")}</p>
          <ChoiceRow value={draft.isBPL} onChange={(value) => update("isBPL", value)} options={[{ label: t("guided_yes"), value: true }, { label: t("guided_no"), value: false }, { label: t("guided_not_sure"), value: null, key: "bpl-null" }]} />
        </div>

        <div>
          <p className="text-sm font-body font-semibold text-ledger mb-2">{t("guided_disability_label")}</p>
          <ChoiceRow value={draft.hasDisability} onChange={(value) => update("hasDisability", value)} options={[{ label: t("guided_yes"), value: true }, { label: t("guided_no"), value: false }, { label: t("guided_prefer_not_say"), value: null, key: "disability-null" }]} />
        </div>

        <div>
          <label className="block text-sm font-body font-semibold text-ledger mb-2">Occupation / context <span className="font-normal text-muted">(ranking + context)</span></label>
          <input type="text" value={draft.occupation} onChange={(event) => update("occupation", event.target.value)} placeholder="e.g. farmer, student, small business owner" className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body focus:outline-none focus:ring-2 focus:ring-saffron" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} disabled={!hydrated} className="interactive-surface rounded-lg bg-bottle px-5 py-2.5 font-body font-semibold text-white hover:bg-bottle-light disabled:opacity-50">Save {activeProfileLabel}</button>
        <button type="button" onClick={handleClear} disabled={!hydrated} className="interactive-surface rounded-lg border border-borderc bg-white/60 px-4 py-2.5 font-body text-sm text-ink hover:bg-white disabled:opacity-50">Clear this profile</button>
        {savedFlash && <span role="status" className="text-sm font-body font-semibold text-bottle">✓ Saved on this device</span>}
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ledger">Eligibility snapshot for {activeProfileLabel}</h2>
            <p className="mt-1 text-sm font-body text-muted">Narrative-only conditions are now separated from structured passes instead of being silently assumed.</p>
          </div>
          <Link href="/explore" className="text-sm font-body font-semibold text-saffron-dark hover:underline">Open What-If →</Link>
        </div>

        {!eligibilityCounts ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-24 rounded-xl" />)}</div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-bottle/30 bg-bottle/10 p-4"><p className="text-xs uppercase tracking-wide text-bottle font-body">Likely eligible</p><p className="mt-1 font-display text-3xl text-bottle">{eligibilityCounts.likely_eligible.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-ink/65 font-body">All represented restrictions can be checked and pass.</p></div>
            <div className="rounded-xl border border-saffron/40 bg-saffron/10 p-4"><p className="text-xs uppercase tracking-wide text-saffron-dark font-body">Need verification</p><p className="mt-1 font-display text-3xl text-saffron-dark">{eligibilityCounts.needs_info.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-ink/65 font-body">Missing profile data or an extra condition appears only in narrative eligibility text.</p></div>
            <div className="rounded-xl border border-red-300/60 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30"><p className="text-xs uppercase tracking-wide text-red-700 dark:text-red-200 font-body">Ruled out</p><p className="mt-1 font-display text-3xl text-red-700 dark:text-red-200">{eligibilityCounts.not_eligible.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-ink/65 font-body">At least one represented rule conflicts with this profile.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}
