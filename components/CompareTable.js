function fmtIncome(v) {
  return v != null ? `\u20b9${v.toLocaleString("en-IN")}` : "No cap";
}
function fmtAge(elig) {
  if (elig.minAge == null && elig.maxAge == null) return "No restriction";
  return `${elig.minAge ?? "Any"}${elig.maxAge != null ? `\u2013${elig.maxAge}` : "+"} yrs`;
}

const ROWS = [
  { label: "Region", get: (s) => `${s.level}${s.state ? ` \u00b7 ${s.state}` : ""}` },
  { label: "Age", get: (s) => fmtAge(s.eligibility || {}) },
  { label: "Gender", get: (s) => (s.eligibility?.gender === "any" || !s.eligibility?.gender ? "Any" : s.eligibility.gender) },
  { label: "Income cap", get: (s) => fmtIncome(s.eligibility?.maxIncome) },
  { label: "Category", get: (s) => (s.eligibility?.categories?.length ? s.eligibility.categories.join(", ") : "Any") },
  { label: "BPL required", get: (s) => (s.eligibility?.requiresBPL ? "Yes" : "No") },
  { label: "Disability required", get: (s) => (s.eligibility?.requiresDisability ? "Yes" : "No") },
];

export default function CompareTable({ schemes }) {
  if (!schemes || schemes.length < 2) return null;

  return (
    <div className="overflow-x-auto border border-borderc rounded-lg bg-white/60">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="border-b border-borderc">
            <th className="text-left p-3 text-muted font-medium w-32">Criteria</th>
            {schemes.map((s) => (
              <th key={s.id} className="text-left p-3 font-display text-ledger font-normal">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b border-borderc/60 last:border-0">
              <td className="p-3 text-muted">{row.label}</td>
              {schemes.map((s) => (
                <td key={s.id} className="p-3 text-ink">
                  {row.get(s)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-3 text-muted">Benefit</td>
            {schemes.map((s) => (
              <td key={s.id} className="p-3 text-bottle text-xs">
                {(s.benefits || "").slice(0, 120)}
                {(s.benefits || "").length > 120 ? "…" : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
