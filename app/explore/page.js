"use client";

import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { filterEligible } from "../../lib/ruleEngine";
import { INDIAN_STATES } from "../../lib/indianStates";
import { useLanguage } from "../../lib/i18n/LanguageContext";

function OptionRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full border font-body text-xs transition-colors ${
            value === opt.value
              ? "bg-bottle text-white border-bottle"
              : "bg-white/70 text-ink border-borderc hover:border-bottle"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState(null);
  const [age, setAge] = useState(30);
  const [income, setIncome] = useState(300000);
  const [gender, setGender] = useState(null);
  const [category, setCategory] = useState(null);
  const [state, setState] = useState(null);
  const [isBPL, setIsBPL] = useState(null);
  const [hasDisability, setHasDisability] = useState(null);

  useEffect(() => {
    fetch("/data/schemes-lite.json")
      .then((r) => r.json())
      .then(setSchemes)
      .catch(() => setSchemes([]));
  }, []);

  const currentProfile = { age, annualIncome: income, gender, category, state, isBPL, hasDisability };

  const eligibleCount = useMemo(() => {
    if (!schemes) return 0;
    return filterEligible(currentProfile, schemes).length;
  }, [schemes, age, income, gender, category, state, isBPL, hasDisability]);

  const incomeSweep = useMemo(() => {
    if (!schemes) return [];
    const points = [];
    for (let inc = 0; inc <= 1500000; inc += 75000) {
      const count = filterEligible({ ...currentProfile, annualIncome: inc }, schemes).length;
      points.push({ income: inc, count });
    }
    return points;
  }, [schemes, age, gender, category, state, isBPL, hasDisability]);

  const ageSweep = useMemo(() => {
    if (!schemes) return [];
    const points = [];
    for (let a = 0; a <= 90; a += 5) {
      const count = filterEligible({ ...currentProfile, age: a }, schemes).length;
      points.push({ age: a, count });
    }
    return points;
  }, [schemes, income, gender, category, state, isBPL, hasDisability]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger">{t("explore_title")}</h1>
      <p className="mt-2 text-ink/70 font-body max-w-2xl">
        {t("explore_subtitle", { n: schemes ? schemes.length.toLocaleString("en-IN") : "…" })}
      </p>

      {!schemes ? (
        <p className="mt-8 text-muted font-body">{t("explore_loading")}</p>
      ) : (
        <>
          <div className="mt-8 bg-white/60 border border-borderc rounded-lg p-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="flex justify-between font-body text-ledger font-semibold mb-2">
                <span>{t("explore_age")}</span>
                <span className="text-bottle">{age}</span>
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full accent-bottle"
              />
            </div>
            <div>
              <label className="flex justify-between font-body text-ledger font-semibold mb-2">
                <span>{t("explore_income")}</span>
                <span className="text-bottle">₹{income.toLocaleString("en-IN")}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1500000"
                step="10000"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full accent-bottle"
              />
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_gender")}</p>
              <OptionRow
                value={gender}
                onChange={setGender}
                options={[
                  { label: t("browse_any"), value: null },
                  { label: t("guided_gender_male"), value: "male" },
                  { label: t("guided_gender_female"), value: "female" },
                ]}
              />
            </div>
            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_category")}</p>
              <OptionRow
                value={category}
                onChange={setCategory}
                options={[
                  { label: t("browse_any"), value: null },
                  { label: t("guided_category_general"), value: "General" },
                  { label: "SC", value: "SC" },
                  { label: "ST", value: "ST" },
                  { label: "OBC", value: "OBC" },
                  { label: "EWS", value: "EWS" },
                ]}
              />
            </div>

            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_bpl")}</p>
              <OptionRow
                value={isBPL}
                onChange={setIsBPL}
                options={[
                  { label: t("explore_unspecified"), value: null },
                  { label: t("guided_yes"), value: true },
                  { label: t("guided_no"), value: false },
                ]}
              />
            </div>
            <div>
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_disability")}</p>
              <OptionRow
                value={hasDisability}
                onChange={setHasDisability}
                options={[
                  { label: t("explore_unspecified"), value: null },
                  { label: t("guided_yes"), value: true },
                  { label: t("guided_no"), value: false },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <p className="font-body text-ledger font-semibold mb-2 text-sm">{t("explore_state")}</p>
              <select
                value={state || ""}
                onChange={(e) => setState(e.target.value || null)}
                className="w-full max-w-sm rounded-lg border border-borderc bg-white p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                <option value="">{t("explore_state_any")}</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 bg-saffron/10 border border-saffron/30 rounded-lg p-6 text-center">
            <p className="text-xs uppercase tracking-wide text-muted font-body">{t("explore_eligible_for")}</p>
            <p className="font-display text-5xl text-saffron-dark mt-1">{eligibleCount}</p>
            <p className="text-xs text-muted font-body mt-1">{t("explore_out_of", { n: schemes.length.toLocaleString("en-IN") })}</p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/60 border border-borderc rounded-lg p-4">
              <p className="font-body font-semibold text-ledger text-sm mb-2">{t("explore_chart_income")}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={incomeSweep}>
                  <CartesianGrid stroke="#D8CBA8" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="income"
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    tick={{ fontSize: 11, fill: "#7A6F5D" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#7A6F5D" }} />
                  <Tooltip
                    formatter={(v) => [v, "eligible schemes"]}
                    labelFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
                  />
                  <Line type="monotone" dataKey="count" stroke="#C46F14" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/60 border border-borderc rounded-lg p-4">
              <p className="font-body font-semibold text-ledger text-sm mb-2">{t("explore_chart_age")}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ageSweep}>
                  <CartesianGrid stroke="#D8CBA8" strokeDasharray="3 3" />
                  <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#7A6F5D" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#7A6F5D" }} />
                  <Tooltip formatter={(v) => [v, "eligible schemes"]} labelFormatter={(v) => `${v}`} />
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
