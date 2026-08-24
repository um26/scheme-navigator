import schemes from "../../public/data/schemes.json";
import SchemeCard from "../../components/SchemeCard";
import Link from "next/link";
import { stripMarkdown } from "../../lib/markdownLite";
import { getServerLocale } from "../../lib/i18n/getServerLocale";
import { translate } from "../../lib/i18n/dictionaries";

const PAGE_SIZE = 20;
const CATEGORIES = ["SC", "ST", "OBC", "EWS"];

function getRegions() {
  const regions = new Set(["Central"]);
  for (const s of schemes) {
    if (s.state) regions.add(s.state);
  }
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
  if (region !== "All") {
    filtered = region === "Central" ? filtered.filter((s) => s.level === "Central") : filtered.filter((s) => s.state === region);
  }
  if (category !== "All") {
    filtered = filtered.filter((s) => s.eligibility?.categories?.includes(category));
  }
  if (gender !== "any") {
    filtered = filtered.filter((s) => (s.eligibility?.gender || "any") === gender);
  }
  if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name?.toLowerCase().includes(qLower) ||
        stripMarkdown(s.description || "").toLowerCase().includes(qLower)
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const regions = getRegions();
  const baseParams = { region, q, category, gender };
  const regionLabel = region === "Central" ? t("browse_central") : region === "All" ? t("browse_all") : region;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger">{t("browse_title")}</h1>
      <p className="mt-2 text-ink/70 font-body">
        {t("browse_subtitle_prefix")} {schemes.length} {t("browse_subtitle_suffix")}
      </p>

      <form method="GET" action="/browse" className="mt-6 flex gap-2">
        <input type="hidden" name="region" value={region} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="gender" value={gender} />
        <input type="hidden" name="page" value="1" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t("browse_search_placeholder")}
          className="flex-1 rounded-lg border border-borderc bg-white/70 p-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-bottle text-white font-body text-sm font-semibold hover:bg-bottle-light transition-colors"
        >
          {t("browse_search_button")}
        </button>
        {q && (
          <Link
            href={buildHref({ ...baseParams, q: "", page: 1 })}
            className="px-4 py-2 rounded-lg border border-borderc bg-white/60 font-body text-sm hover:bg-white"
          >
            {t("browse_clear")}
          </Link>
        )}
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildHref({ ...baseParams, region: "All", page: 1 })}
          className={`px-3 py-1.5 rounded-full text-sm font-body border transition-colors ${
            region === "All" ? "bg-bottle text-white border-bottle" : "bg-white/60 text-ink border-borderc hover:bg-white"
          }`}
        >
          {t("browse_all")}
        </Link>
        <Link
          href={buildHref({ ...baseParams, region: "Central", page: 1 })}
          className={`px-3 py-1.5 rounded-full text-sm font-body border transition-colors ${
            region === "Central" ? "bg-bottle text-white border-bottle" : "bg-white/60 text-ink border-borderc hover:bg-white"
          }`}
        >
          {t("browse_central")}
        </Link>
        {regions
          .filter((r) => r !== "Central")
          .map((r) => (
            <Link
              key={r}
              href={buildHref({ ...baseParams, region: r, page: 1 })}
              className={`px-3 py-1.5 rounded-full text-sm font-body border transition-colors ${
                region === r ? "bg-bottle text-white border-bottle" : "bg-white/60 text-ink border-borderc hover:bg-white"
              }`}
            >
              {r}
            </Link>
          ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted font-body uppercase tracking-wide">{t("browse_category_label")}</span>
        <Link
          href={buildHref({ ...baseParams, category: "All", page: 1 })}
          className={`px-2.5 py-1 rounded-full text-xs font-body border ${
            category === "All" ? "bg-saffron-dark text-white border-saffron-dark" : "bg-white/60 border-borderc"
          }`}
        >
          {t("browse_any")}
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={buildHref({ ...baseParams, category: c, page: 1 })}
            className={`px-2.5 py-1 rounded-full text-xs font-body border ${
              category === c ? "bg-saffron-dark text-white border-saffron-dark" : "bg-white/60 border-borderc"
            }`}
          >
            {c}
          </Link>
        ))}
        <span className="text-xs text-muted font-body uppercase tracking-wide ml-3">{t("browse_gender_label")}</span>
        {["any", "male", "female"].map((g) => (
          <Link
            key={g}
            href={buildHref({ ...baseParams, gender: g, page: 1 })}
            className={`px-2.5 py-1 rounded-full text-xs font-body border capitalize ${
              gender === g ? "bg-saffron-dark text-white border-saffron-dark" : "bg-white/60 border-borderc"
            }`}
          >
            {g === "any" ? t("browse_any") : g === "male" ? t("guided_gender_male") : t("guided_gender_female")}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted font-body">
        {filtered.length} {t("browse_scheme_count")}
        {q ? ` ${t("browse_matching")} "${q}"` : ""} {t("browse_in")} {regionLabel}
      </p>

      <div className="mt-4 grid gap-4">
        {pageItems.map((scheme) => (
          <SchemeCard key={scheme.id} scheme={scheme} />
        ))}
        {pageItems.length === 0 && (
          <div className="bg-white/60 border border-borderc rounded-lg p-8 text-center font-body text-ink/70">
            {t("browse_no_results")}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4 font-body">
        {page > 1 && (
          <Link
            href={buildHref({ ...baseParams, page: page - 1 })}
            className="px-4 py-2 rounded-lg border border-borderc bg-white/60 hover:bg-white"
          >
            {t("browse_previous")}
          </Link>
        )}
        <span className="text-sm text-muted">{t("browse_page_of", { a: page, b: totalPages })}</span>
        {page < totalPages && (
          <Link
            href={buildHref({ ...baseParams, page: page + 1 })}
            className="px-4 py-2 rounded-lg border border-borderc bg-white/60 hover:bg-white"
          >
            {t("browse_next")}
          </Link>
        )}
      </div>
    </div>
  );
}
