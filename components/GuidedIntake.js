"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INDIAN_STATES } from "../lib/indianStates";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";
import { profileHasData } from "../lib/useProfile";

const STEPS = ["basics", "location", "economic", "category", "extra"];

function StepDots({ current }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={current + 1}>
      {STEPS.map((s, i) => (
        <div key={s} aria-hidden="true" className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-saffron-dark" : i < current ? "w-4 bg-bottle" : "w-4 bg-borderc"}`} />
      ))}
    </div>
  );
}

function OptionRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {options.map((opt) => (
        <button
          key={opt.key || (opt.value === null ? "null" : String(opt.value))}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-4 py-2 text-sm font-body transition-all duration-150 active:scale-[.97] ${value === opt.value ? "bg-bottle text-white border-bottle shadow-sm" : "bg-white/70 text-ink border-borderc hover:border-bottle hover:bg-white"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function toFormProfile(profile = {}) {
  return {
    age: profile.age ?? "",
    gender: profile.gender ?? null,
    state: profile.state ?? null,
    annualIncome: profile.annualIncome ?? "",
    isBPL: profile.isBPL ?? null,
    category: profile.category ?? null,
    hasDisability: profile.hasDisability ?? null,
    occupation: profile.occupation ?? "",
  };
}

export default function GuidedIntake({ onSubmit, loading, initialProfile = null, profileHydrated = false }) {
  const { t, locale } = useLanguage();
  const [step, setStep] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const [profile, setProfile] = useState(toFormProfile());

  useEffect(() => {
    if (!profileHydrated || seeded) return;
    setProfile(toFormProfile(initialProfile || {}));
    setSeeded(true);
  }, [profileHydrated, seeded, initialProfile]);

  function update(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleFinalSubmit() {
    onSubmit({
      age: profile.age ? Number(profile.age) : null,
      gender: profile.gender,
      state: profile.state,
      annualIncome: profile.annualIncome ? Number(profile.annualIncome) : null,
      isBPL: profile.isBPL,
      category: profile.category,
      hasDisability: profile.hasDisability,
      occupation: profile.occupation.trim() || null,
    });
  }

  const current = STEPS[step];
  const prefilled = profileHydrated && profileHasData(initialProfile || {});

  return (
    <div className="rounded-xl border border-borderc bg-white/60 p-6 shadow-sm md:p-8">
      {prefilled && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bottle/20 bg-bottle/5 px-3 py-2 text-xs font-body text-ink/75">
          <span>✓ Prefilled from My Profile. Changes are saved when you run the search.</span>
          <Link href="/profile" className="font-semibold text-bottle hover:underline">Edit profile</Link>
        </div>
      )}

      <StepDots current={step} />

      {current === "basics" && (
        <div className="space-y-6 text-center animate-fadeIn">
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_age_label")}</label>
            <input type="number" min="0" max="120" value={profile.age} onChange={(e) => update("age", e.target.value)} placeholder="e.g. 34" className="w-32 rounded-lg border border-borderc bg-white p-2 text-center font-body transition-colors focus:outline-none focus:ring-2 focus:ring-saffron" />
            <p className="text-xs text-muted mt-1 font-body">{t("guided_age_hint")}</p>
          </div>
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_gender_label")}</label>
            <OptionRow value={profile.gender} onChange={(v) => update("gender", v)} options={[
              { label: t("guided_gender_male"), value: "male" },
              { label: t("guided_gender_female"), value: "female" },
              { label: t("guided_prefer_not_say"), value: null, key: "gender-null" },
            ]} />
          </div>
        </div>
      )}

      {current === "location" && (
        <div className="text-center animate-fadeIn">
          <label className="block font-body text-ledger font-semibold mb-3">{t("guided_state_label")}</label>
          <select value={profile.state || ""} onChange={(e) => update("state", e.target.value || null)} className="w-full max-w-sm mx-auto rounded-lg border border-borderc bg-white p-3 font-body transition-colors focus:outline-none focus:ring-2 focus:ring-saffron">
            <option value="">{t("guided_state_placeholder")}</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{localizeState(locale, s)}</option>)}
          </select>
        </div>
      )}

      {current === "economic" && (
        <div className="space-y-6 text-center animate-fadeIn">
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_income_label")}</label>
            <input type="number" min="0" value={profile.annualIncome} onChange={(e) => update("annualIncome", e.target.value)} placeholder="e.g. 150000" className="w-48 rounded-lg border border-borderc bg-white p-2 text-center font-body transition-colors focus:outline-none focus:ring-2 focus:ring-saffron" />
            <p className="text-xs text-muted mt-1 font-body">{t("guided_income_hint")}</p>
          </div>
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_bpl_label")}</label>
            <OptionRow value={profile.isBPL} onChange={(v) => update("isBPL", v)} options={[
              { label: t("guided_yes"), value: true },
              { label: t("guided_no"), value: false },
              { label: t("guided_not_sure"), value: null, key: "bpl-null" },
            ]} />
          </div>
        </div>
      )}

      {current === "category" && (
        <div className="space-y-6 text-center animate-fadeIn">
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_category_label")}</label>
            <OptionRow value={profile.category} onChange={(v) => update("category", v)} options={[
              { label: t("guided_category_general"), value: "General" },
              { label: "SC", value: "SC" },
              { label: "ST", value: "ST" },
              { label: "OBC", value: "OBC" },
              { label: "EWS", value: "EWS" },
              { label: t("guided_prefer_not_say"), value: null, key: "category-null" },
            ]} />
          </div>
          <div>
            <label className="block font-body text-ledger font-semibold mb-2">{t("guided_disability_label")}</label>
            <OptionRow value={profile.hasDisability} onChange={(v) => update("hasDisability", v)} options={[
              { label: t("guided_yes"), value: true },
              { label: t("guided_no"), value: false },
              { label: t("guided_prefer_not_say"), value: null, key: "disability-null" },
            ]} />
          </div>
        </div>
      )}

      {current === "extra" && (
        <div className="text-center animate-fadeIn">
          <label className="block font-body text-ledger font-semibold mb-2">{t("guided_extra_label")}</label>
          <p className="text-xs text-muted mb-3 font-body">{t("guided_extra_hint")}</p>
          <textarea value={profile.occupation} onChange={(e) => update("occupation", e.target.value)} rows={3} placeholder={t("guided_extra_placeholder")} className="w-full rounded-lg border border-borderc bg-white p-3 font-body transition-colors focus:outline-none focus:ring-2 focus:ring-saffron" />
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button type="button" onClick={back} disabled={step === 0} className="rounded-lg px-4 py-2 font-body text-ink/70 transition-all hover:bg-white/60 active:scale-[.98] disabled:opacity-0">{t("guided_back")}</button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="rounded-lg bg-bottle px-6 py-2.5 font-body font-semibold text-white shadow-sm transition-all hover:bg-bottle-light active:scale-[.98]">{t("guided_next")}</button>
        ) : (
          <button type="button" onClick={handleFinalSubmit} disabled={loading} className="rounded-lg bg-saffron-dark px-6 py-2.5 font-body font-semibold text-white shadow-sm transition-all hover:bg-saffron active:scale-[.98] disabled:opacity-50">{loading ? t("guided_checking") : t("guided_submit")}</button>
        )}
      </div>
    </div>
  );
}
