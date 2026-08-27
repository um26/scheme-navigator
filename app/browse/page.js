import schemes from "../../public/data/schemes.json";
import SchemeCard from "../../components/SchemeCard";
import BrowseRegionPicker from "../../components/BrowseRegionPicker";
import Link from "next/link";
import { getServerLocale } from "../../lib/i18n/getServerLocale";
import { translate } from "../../lib/i18n/dictionaries";
import { localizeState } from "../../lib/i18n/entities";
import { searchSchemes } from "../../lib/schemeSearch";

const PAGE_SIZE = 20;
const CATEGORIES = ["SC", "ST", "OBC", "EWS"];

function getRegions() {
  const regions = new Set();
  for (const s of schemes) if (s.state) regions.add(s.state);
  return Array.from(regions).sort();
}

function buildHref(params) {
  const usp = new URLSearchParams();
  if (params.region && params.region !== "All") usp.set("region", params.region);
  if (params.q) usp.set("q", params.q);
  if (params.category && params.category !== "All") usp.set("category", params.category);
  if (params.gender && params.gender !== "any") usp.set("gender", params.gender);
  usp.set("page", String(params.page || 1));
  return `/browse?${usp.toString()}`;
}

export default function BrowsePage({ searchParams }) {
  const locale = getServerLocale();
  const t = (key, vars) => translate(locale, key, vars);

  const region = searchParams?.region || "All";
  const q = (searchParams?.q || "").trim();
  const category = searchParams?.category || "All";
  const gender = searchParams?.gender || "any";
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  let filtered = schemes;
  if (region !== "All") filtered = region === "Central" ? filtered.filter((s) => s.level === "Central") : filtered.filter((s) => s.state === region);
  if (category !== "All") filtered = filtered.filter((s) => s.eligibility?.categories?.includes(category));
  if (gender !== "any") filtered = filtered.filter((s) => (s.eligibility?.gender || "any") === gender;
  if (q) filtered = searchSchemes(q, filtered, filtered.length || 1);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const regions = getRegions();
  const baseParams = { region, q, category, gender };
  const returnTo = buildHref({ ...baseParams, page: safePage });
  const regionLabel = region === "Central" ? t("browse_central") : region === "All" ? t("browse_all") : localizeState(locale, region);
  const regionOptions = [
    { value: "All", label: t("browse_all") },
    { value: "Central", label: t("browse_central") },
    ...regions.map((value) => ({ value, label: localizeState(locale, value) })),
  ];
  const hasFilters = q || region !== "All" || category !== "All" || gender !== "any";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ledger">{t("browse_title")}</h1>
          <p className="mt-2 text-ink/70 font-body">{t("browse_subtitle_full", { n: schemes.length })}</p>
        </div>
        <Link href="/search" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">Open Search v2 →</Link>
      </div>

      <div className="mt-6 rounded-xl border border-borderc bg-white/50 p-3 shadow-sm">
        <form method="GET" action="/browse" className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="region" value={region} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="gender" value={gender} />
          <input type="hidden" name="page" value="1" />
          <input type="search" name="q" defaultValue={q} placeholder="Search with typos, aliases or benefits…" className="min-w-0 flex-1 rounded-lg border border-borderc bg-white/70 p-2.5 font-body text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-saffron" />
          <button type="submit" className="interactive-surface rounded-lg bg-bottle px-4 py-2 text-sm font-body font-semibold text-white hover:bg-bottle-light">{t("browse_search_button")}</button>
        </form>
        <p className="mt-2 text-[11px] font-body text-muted">Search now tolerates close spellings and common aliases such as PMKISAN, vidhwa, awas, mahila and scholarship variants.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borderc/60 pt-3">
          <BrowseRegionPicker options={regionOptions} currentRegion={region} currentLabel={regionLabel} baseParams={baseParams} />

          <span className="ms-1 text-xs uppercase tracking-wide text-muted font-body">{t("browse_category_label")}</span>
          <Link href={buildHref({ ...baseParams, category: "All", page: 1 })} className={`interactive-surface rounded-full border px-2.5 py-1 text-xs font-body ${category === "All" ? "border-saffron-dark bg-saffron-dark text-white" : "border-borderc bg-white/60 hover:bg-white"}`}>{t("browse_any")}</Link>
          {CATEGORIES.map((c) => <Link key={c} href={buildHref({ ...baseParams, category: c, page: 1 })} className={`interactive-surface rounded-full border px-2.5 py-1 text-xs font-body ${category === c ? "border-saffron-dark bg-saffron-dark text-white" : "border-borderc bg-white/60 hover:bg-white"}`}>{c}</Link>)}

          <span className="ms-1 text-xs uppercase tracking-wide text-muted font-body">{t("browse_gender_label")}</span>
          {["any", "male", "female"].map((g) => (
            <Link key={g} href={buildHref({ ...baseParams, gender: g, page: 1 })} className={`interactive-surface rounded-full border px-2.5 py-1 text-xs font-body ${gender === g ? "border-saffron-dark bg-saffron-dark text-white" : "border-borderc bg-white/60 hover:bg-white"}`}>
              {g === "any" ? t("browse_any") : g === "male" ? t("guided_gender_male") : t("guided_gender_female")}
            </Link>
          ))}

          {hasFilters && <Link href="/browse?page=1" className="ms-auto rounded-full px-3 py-1 text-xs font-body font-semibold text-saffron-dark hover:underline">{t("browse_clear")}</Link>}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted font-body">
        {q ? t("browse_summary_matching", { n: filtered.length, q, region: regionLabel }) : t("browse_summary", { n: filtered.length, region: regionLabel })}
      </p>

      <div className="mt-4 grid gap-4">
        {pageItems.map((scheme) => <SchemeCard key={scheme.id} scheme={scheme} returnTo={returnTo} />)}
        {pageItems.length === 0 && <div className="rounded-xl border border-borderc bg-white/60 p-8 text-center font-body text-ink/70">{t("browse_no_results")}</div>}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4 font-body">
        {safePage > 1 && <Link href={buildHref({ ...baseParams, page: safePage - 1 })} className="interactive-surface rounded-lg border border-borderc bg-white/60 px-4 py-2 hover:bg-white">{t("browse_previous")}</Link>}
        <span className="text-sm text-muted">{t("browse_page_of", { a: safePage, b: totalPages })}</span>
        {safePage < totalPages && <Link href={buildHref({ ...baseParams, page: safePage + 1 })} className="interactive-surface rounded-lg border border-borderc bg-white/60 px-4 py-2 hover:bg-white">{t("browse_next")}</Link>}
      </div>
    </div>
  );
}
