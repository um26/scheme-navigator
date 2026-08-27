"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { filterEligible } from "../../lib/ruleEngine";
import { INDIAN_STATES } from "../../lib/indianStates";
import { EMPTY_PROFILE, normalizeProfile, useProfile } from "../../lib/useProfile";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

const DEMO_PROFILE = {
  ...EMPTY_PROFILE,
  age: 30,
  annualIncome: 300000,
};

function OptionRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key || String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`interactive-surface rounded-full border px-3 py-1.5 font-body text-xs ${value === opt.value ? "bg-bottle text-white border-bottle" : "bg-white/70 text-ink border-borderc hover:border-bottle hover:bg-white"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function toFormProfile(profile) {
  return {
    ...EMPTY_PROFILE,
    ...profile,
    age: profile?.age ?? "",
    annualIncome: profile?.annualIncome ?? "",
  };
}

function cleanForm(profile) {
  return normalizeProfile({
    ...profile,
    age: profile.age === "" ? null : profile.age,
    annualIncome: profile.annualIncome === "" ? null : profile.annualIncome,
  });
}

function profileDiff(baseline, scenario) {
  const fields = [
    ["age", "Age"],
    ["annualIncome", "Income"],
    ["gender", "Gender"],
    ["category", "Category"],
    ["state", "State"],
    ["isBPL", "BPL"],
    ["hasDisability", "Disability"],
  ];
  return fields.filter(([key]) => baseline[key] !== scenario[key]).map(([key, label]) => ({ key, label, from: baseline[key], to: scenario[key] }));
}

function formatValue(key, value) {
  if (value == null || value === "") return "unspecified";
  if (key === "annualIncome") return `₹${Number(value).toLocaleString("en-IN")}`;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

export default function ExplorePage() {
  const { t, locale } = useLanguage();
  const { profile: savedProfile, hydrated: profileHydrated, hasProfile, saveProfile } = useProfile();
  const [schemes, setSchemes] = useState(null);
  const [baseline, setBaseline] = useState(DEMO_PROFILE);
  const [scenario, setScenario] = useState(toFormProfile(DEMO_PROFILE));
  const [seeded, setSeeded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetch("/data/schemes-lite.json")
      .then((r) => r.json())
      .then((data) => setSchemes(Array.isArray(data) ? data : []))
      .catch(() => setSchemes([]));
  }, []);

  useEffect(() => {
    if (!profileHydrated || seeded) return;
    const starting = hasProfile ? savedProfile : DEMO_PROFILE;
    setBaseline(normalizeProfile(starting));
    setScenario(toFormProfile(starting));
    setSeeded(true);
  }, [profileHydrated, hasProfile, savedProfile, seeded]);

  const currentProfile = useMemo(() => cleanForm(scenario), [scenario]);
  const baselineProfile = useMemo(() => normalizeProfile(baseline), [baseline]);

  const comparison = useMemo(() => {
    if (!schemes) return null;
    const baseEligible = filterEligible(baselineProfile, schemes);
    const scenarioEligible = filterEligible(currentProfile, schemes);
    const baseIds = new Set(baseEligible.map((scheme) => scheme.id));
    const scenarioIds = new Set(scenarioEligible.map((scheme) => scheme.id));
    const gained = scenarioEligible.filter((scheme) => !baseIds.has(scheme.id));
    const lost = baseEligible.filter((scheme) => !scenarioIds.has(scheme.id));
    return { baseEligible, scenarioEligible, gained, lost };
  }, [schemes, baselineProfile, currentProfile]);

  const incomeSweep = useMemo(() => {
    if (!schemes) return [];
    const points = [];
    for (let inc = 0; inc <= 1500000; inc += 75000) {
      points.push({ income: inc, count: filterEligible({ ...currentProfile, annualIncome: inc }, schemes).length });
    }
    return points;
  }, [schemes, currentProfile]);

  const ageSweep = useMemo(() => {
    if (!schemes) return [];
    const points = [];
    for (let age = 0; age <= 90; age += 5) {
      points.push({ age, count: filterEligible({ ...currentProfile, age }, schemes).length });
    }
    return points;
  }, [schemes, currentProfile]);

  const changes = useMemo(() => profileDiff(baselineProfile, currentProfile), [baselineProfile, currentProfile]);

  function update(key, value) {
    setScenario((current) => ({ ...current, [key]: value }));
    setSavedFlash(false);
  }

  function useSavedProfile() {
    const next = hasProfile ? savedProfile : DEMO_PROFILE;
    setBaseline(normalizeProfile(next));
    setScenario(toFormProfile(next));
  }

  function setCurrentAsBaseline() {
    setBaseline(currentProfile);
  }

  function saveScenario() {
    saveProfile(currentProfile);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ledger">{t("explore_title")}</h1>
          <p className="mt-2 text-ink/70 font-body max-w-2xl">
            Change one or several profile fields and see exactly which schemes are gained or lost. The comparison reruns the same deterministic rules used by the finder — no LLM decides these changes.
          </p>
        </div>
        <Link href="/profile" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">My Profile →</Link>
      </div>

      {!schemes ? (
        <div className="mt-8 grid gap-4"><div className="skeleton h-52 rounded-xl" /><div className="skeleton h-40 rounded-xl" /></div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-borderc bg-white/50 p-3">
            <span className="text-xs font-body text-muted">Baseline:</span>
            <span className="rounded-full bg-ledger/10 px-2.5 py-1 text-xs font-body font-semibold text-ledger">{hasProfile ? "My saved profile" : "Demo profile"}</span>
            <button type="button" onClick={useSavedProfile} className="text-xs font-body font-semibold text-bottle hover:underline">Reset to {hasProfile ? "My Profile" : "demo"}</button>
            <span className="hidden text-borderc sm:inline">•</span>
            <button type="button" onClick={setCurrentAsBaseline} className="text-xs font-body font-semibold text-bottle hover:underline">Set current as new baseline</button>
          </div>

          <div className="mt-4 bg-white/60 border border-borderc rounded-xl p-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block font-body text-ledger font-semibold mb-2 text-sm">{t("explore_age")}</label>
              <input type="number" min="0" max="120" value={scenario.age} onChange={(e) => update("age", e.target.value)} placeholder="Unspecified" className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron" />
              <div className="mt-2 flex gap-2">
                {[18, 30, 60].map((age) => <button key={age} type="button" onClick={() => update("age", age)} className="text-xs font-body text-bottle hover:underline">Age {age}</button>)}
              </div>
            </div>

            <div>
              <label className="block font-body text-ledger font-semibold mb-2 text-sm">{t("explore_income")}</label>
              <input type="number" min="0" value={scenario.annualIncome} onChange={(e) => update("annualIncome", e.target.value)} placeholder="Unspecified" className="w-full rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron" />
              <div className="mt-2 flex flex-wrap gap-2">
                {[100000, 250000, 500000].map((income) => <button key={income} type="button" onClick={() => update("annualIncome", income)} className="text-xs font-body text-bottle hover:underline">₹{(income / 100000).toFixed(income % 100000 ? 1 : 0)}L</button>)}
              </div>
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_gender")}</p>
              <OptionRow value={scenario.gender} onChange={(value) => update("gender", value)} options={[
                { label: t("explore_unspecified"), value: null, key: "gender-null" },
                { label: t("guided_gender_male"), value: "male" },
                { label: t("guided_gender_female"), value: "female" },
              ]} />
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_category")}</p>
              <OptionRow value={scenario.category} onChange={(value) => update("category", value)} options={[
                { label: t("explore_unspecified"), value: null, key: "category-null" },
                { label: t("guided_category_general"), value: "General" },
                { label: "SC", value: "SC" },
                { label: "ST", value: "ST" },
                { label: "OBC", value: "OBC" },
                { label: "EWS", value: "EWS" },
              ]} />
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_bpl")}</p>
              <OptionRow value={scenario.isBPL} onChange={(value) => update("isBPL", value)} options={[
                { label: t("explore_unspecified"), value: null, key: "bpl-null" },
                { label: t("guided_yes"), value: true },
                { label: t("guided_no"), value: false },
              ]} />
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_disability")}</p>
              <OptionRow value={scenario.hasDisability} onChange={(value) => update("hasDisability", value)} options={[
                { label: t("explore_unspecified"), value: null, key: "disability-null" },
                { label: t("guided_yes"), value: true },
                { label: t("guided_no"), value: false },
              ]} />
            </div>

            <div className="md:col-span-2">
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_state")}</p>
              <select value={scenario.state || ""} onChange={(e) => update("state", e.target.value || null)} className="w-full max-w-sm rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron">
                <option value="">{t("explore_state_any")}</option>
                {INDIAN_STATES.map((state) => <option key={state} value={state}>{localizeState(locale, state)}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 border-t border-borderc/70 pt-4">
              <button type="button" onClick={saveScenario} className="interactive-surface rounded-lg bg-bottle px-4 py-2 text-sm font-body font-semibold text-white hover:bg-bottle-light">Save scenario to My Profile</button>
              {savedFlash && <span role="status" className="text-sm font-body font-semibold text-bottle">✓ Profile updated</span>}
            </div>
          </div>

          {changes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {changes.map((change) => (
                <span key={change.key} className="rounded-full border border-borderc bg-white/50 px-3 py-1 text-xs font-body text-ink/75">
                  <strong>{change.label}:</strong> {formatValue(change.key, change.from)} → {formatValue(change.key, change.to)}
                </span>
              ))}
            </div>
          ) : <p className="mt-4 text-sm font-body text-muted">No changes from the baseline yet.</p>}

          {comparison && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-borderc bg-white/60 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted font-body">Baseline</p>
                  <p className="mt-1 font-display text-3xl text-ledger">{comparison.baseEligible.length}</p>
                </div>
                <div className="rounded-xl border border-borderc bg-white/60 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted font-body">Current scenario</p>
                  <p className="mt-1 font-display text-3xl text-ledger">{comparison.scenarioEligible.length}</p>
                </div>
                <div className="rounded-xl border border-bottle/30 bg-bottle/10 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-bottle font-body">Newly gained</p>
                  <p className="mt-1 font-display text-3xl text-bottle">+{comparison.gained.length}</p>
                </div>
                <div className="rounded-xl border border-red-300/60 bg-red-50 p-4 text-center dark:border-red-900/60 dark:bg-red-950/30">
                  <p className="text-[11px] uppercase tracking-wide text-red-700 dark:text-red-200 font-body">Lost</p>
                  <p className="mt-1 font-display text-3xl text-red-700 dark:text-red-200">−{comparison.lost.length}</p>
                </div>
              </div>

              <p className="mt-2 text-xs font-body text-muted">Counts mean “not ruled out by structured checks.” Unknown profile fields remain permissive, so use My Profile to reduce uncertainty.</p>

              {(comparison.gained.length > 0 || comparison.lost.length > 0) && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-bottle/25 bg-bottle/5 p-4">
                    <h2 className="font-display text-lg text-bottle">Schemes gained</h2>
                    {comparison.gained.length === 0 ? <p className="mt-2 text-sm font-body text-muted">None.</p> : (
                      <ul className="mt-2 space-y-2">
                        {comparison.gained.slice(0, 8).map((scheme) => <li key={scheme.id}><Link href={`/scheme/${scheme.id}?returnTo=${encodeURIComponent("/explore")}`} className="text-sm font-body text-ink hover:text-saffron-dark hover:underline">+ {scheme.name}</Link></li>)}
                      </ul>
                    )}
                    {comparison.gained.length > 8 && <p className="mt-2 text-xs font-body text-muted">+ {comparison.gained.length - 8} more</p>}
                  </div>

                  <div className="rounded-xl border border-red-300/40 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                    <h2 className="font-display text-lg text-red-700 dark:text-red-200">Schemes lost</h2>
                    {comparison.lost.length === 0 ? <p className="mt-2 text-sm font-body text-muted">None.</p> : (
                      <ul className="mt-2 space-y-2">
                        {comparison.lost.slice(0, 8).map((scheme) => <li key={scheme.id}><Link href={`/scheme/${scheme.id}?returnTo=${encodeURIComponent("/explore")}`} className="text-sm font-body text-ink hover:text-red-700 dark:hover:text-red-200 hover:underline">− {scheme.name}</Link></li>)}
                      </ul>
                    )}
                    {comparison.lost.length > 8 && <p className="mt-2 text-xs font-body text-muted">+ {comparison.lost.length - 8} more</p>}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/60 border border-borderc rounded-xl p-4">
              <p className="font-body font-semibold text-ledger text-sm mb-2">{t("explore_chart_income")}</p>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={incomeSweep}>
                  <CartesianGrid stroke="currentColor" opacity={0.12} strokeDasharray="3 3" />
                  <XAxis dataKey="income" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, t("browse_scheme_count")]} labelFormatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                  <Line type="monotone" dataKey="count" stroke="#C46F14" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/60 border border-borderc rounded-xl p-4">
              <p className="font-body font-semibold text-ledger text-sm mb-2">{t("explore_chart_age")}</p>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={ageSweep}>
                  <CartesianGrid stroke="currentColor" opacity={0.12} strokeDasharray="3 3" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, t("browse_scheme_count")]} labelFormatter={(v) => `${v}`} />
                  <Line type="monotone" dataKey="count" stroke="#1F4B3F" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
