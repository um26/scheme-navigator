"use client";

export default function EligibilityMeter({ checks }) {
  if (!checks?.length) return null;
  const known = checks.filter((c) => c.known).length;
  const total = checks.length;
  const pct = Math.round((known / Math.max(1, total)) * 100);
  const label = pct >= 85 ? "High evidence" : pct >= 55 ? "Good evidence" : "Partial evidence";

  return (
    <div className="eligibility-meter" title={`${known} of ${total} deterministic checks use information you supplied`}>
      <div className="eligibility-meter-ring" style={{ "--meter": `${pct * 3.6}deg` }} aria-hidden="true">
        <span>{known}/{total}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-body">Eligibility evidence</div>
        <div className="text-xs font-semibold text-ledger font-body">{label}</div>
      </div>
    </div>
  );
}
