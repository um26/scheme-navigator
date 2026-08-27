"use client";

import Link from "next/link";
import { useMemo } from "react";
import { evaluateEligibility } from "../lib/ruleEngine";
import { useProfile } from "../lib/useProfile";

const STATUS_META = {
  likely_eligible: {
    label: "Likely eligible",
    icon: "✓",
    className: "border-bottle/30 bg-bottle/10 text-bottle",
  },
  needs_info: {
    label: "Need more info",
    icon: "?",
    className: "border-saffron/40 bg-saffron/10 text-saffron-dark",
  },
  not_eligible: {
    label: "Doesn't match profile",
    icon: "×",
    className: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200",
  },
};

function countText(counts) {
  const parts = [];
  if (counts.passed) parts.push(`${counts.passed} passed`);
  if (counts.unknown) parts.push(`${counts.unknown} unknown`);
  if (counts.failed) parts.push(`${counts.failed} failed`);
  return parts.length ? parts.join(" · ") : "No structured restrictions";
}

export function ProfileEligibilityBadge({ scheme }) {
  const { profile, hydrated, hasProfile } = useProfile();
  const result = useMemo(() => (hydrated && hasProfile ? evaluateEligibility(profile, scheme) : null), [hydrated, hasProfile, profile, scheme]);
  if (!result) return null;
  const meta = STATUS_META[result.status];

  return (
    <div className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-body font-semibold ${meta.className}`} title="Based on your saved My Profile and structured eligibility fields">
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
      <span className="opacity-70">· {countText(result.counts)}</span>
    </div>
  );
}

export default function EligibilityEvidence({ scheme, profile, compact = false }) {
  const result = useMemo(() => evaluateEligibility(profile || {}, scheme), [profile, scheme]);
  const meta = STATUS_META[result.status];

  if (compact) {
    return (
      <div className={`rounded-xl border p-3 ${meta.className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-body text-sm font-semibold"><span aria-hidden="true">{meta.icon} </span>{meta.label}</p>
          <p className="text-xs font-body opacity-75">{countText(result.counts)}</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`mt-6 rounded-xl border p-5 ${meta.className}`} aria-label="Personal eligibility evidence">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg"><span aria-hidden="true">{meta.icon} </span>{meta.label}</p>
          <p className="mt-1 text-xs font-body opacity-80">{countText(result.counts)} · based only on structured eligibility fields</p>
        </div>
        <Link href="/profile" className="text-xs font-body font-semibold underline underline-offset-2">Edit My Profile</Link>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {result.checks.filter((check) => check.constraint || check.status !== "pass").map((check) => (
          <li key={check.key} className="rounded-lg border border-current/15 bg-white/35 p-3 dark:bg-black/10">
            <div className="flex gap-2">
              <span aria-hidden="true" className="font-semibold">
                {check.status === "pass" ? "✓" : check.status === "fail" ? "×" : "?"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-body font-semibold">{check.label}</p>
                <p className="mt-0.5 text-xs font-body opacity-80">{check.detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] font-body opacity-70">
        This is not an official eligibility decision. A scheme may contain conditions in its full text that are not yet represented as structured fields.
      </p>
    </section>
  );
}
