import Link from "next/link";
import schemes from "../../public/data/schemes.json";
import SchemeCard from "../../components/SchemeCard";
import { SEARCH_EXAMPLES, searchSchemes } from "../../lib/schemeSearch";
import { getServerLocale } from "../../lib/i18n/getServerLocale";
import { translate } from "../../lib/i18n/dictionaries";

function resultHref(query) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  return `/search?${params.toString()}`;
}

function formatNumber(locale, value) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-IN" : locale).format(value);
  } catch {
    return Number(value).toLocaleString("en-IN");
  }
}

export default function SearchPage({ searchParams }) {
  const locale = getServerLocale();
  const t = (key, vars) => translate(locale, key, vars);
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const results = q ? searchSchemes(q, schemes, 80) : [];
  const returnTo = resultHref(q);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-saffron-dark font-body font-semibold">{t("search_eyebrow")}</p>
          <h1 className="mt-1 font-display text-3xl text-ledger">{t("search_title")}</h1>
          <p className="mt-2 max-w-2xl text-sm font-body text-ink/70">
            {t("search_subtitle", { n: formatNumber(locale, schemes.length) })}
          </p>
        </div>
        <Link href="/browse" className="interactive-surface rounded-full border border-borderc bg-white/60 px-4 py-2 text-sm font-body font-semibold text-bottle hover:bg-white">{t("search_browse_filters")}</Link>
      </div>

      <form action="/search" method="GET" className="mt-6 flex flex-col gap-2 rounded-xl border border-borderc bg-white/55 p-3 shadow-sm sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus={!q}
          placeholder={t("search_placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-borderc bg-white/70 p-3 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-saffron"
        />
        <button type="submit" className="interactive-surface rounded-lg bg-bottle px-5 py-3 text-sm font-body font-semibold text-white hover:bg-bottle-light">{t("search_button")}</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SEARCH_EXAMPLES.map((example) => (
          <Link key={example} href={resultHref(example)} className="rounded-full border border-borderc bg-white/45 px-3 py-1.5 text-xs font-body text-ink/75 transition-colors hover:border-saffron-dark hover:text-saffron-dark">{example}</Link>
        ))}
      </div>

      {q ? (
        <>
          <div className="mt-7 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-body text-sm text-muted">{t("search_results_summary", { n: formatNumber(locale, results.length), q })}</p>
            <p className="text-xs font-body text-muted">{t("search_ranking_note")}</p>
          </div>

          <div className="mt-4 grid gap-4">
            {results.map((scheme) => <SchemeCard key={scheme.id} scheme={scheme} returnTo={returnTo} />)}
            {results.length === 0 && (
              <div className="rounded-xl border border-borderc bg-white/60 p-8 text-center">
                <p className="font-display text-lg text-ledger">{t("search_no_matches_title")}</p>
                <p className="mt-2 text-sm font-body text-muted">{t("search_no_matches_body")}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-borderc bg-white/55 p-4"><p className="font-body font-semibold text-ledger">{t("search_tip_typos_title")}</p><p className="mt-1 text-xs font-body text-muted">{t("search_tip_typos_body")}</p></div>
          <div className="rounded-xl border border-borderc bg-white/55 p-4"><p className="font-body font-semibold text-ledger">{t("search_tip_aliases_title")}</p><p className="mt-1 text-xs font-body text-muted">{t("search_tip_aliases_body")}</p></div>
          <div className="rounded-xl border border-borderc bg-white/55 p-4"><p className="font-body font-semibold text-ledger">{t("search_tip_fields_title")}</p><p className="mt-1 text-xs font-body text-muted">{t("search_tip_fields_body")}</p></div>
        </div>
      )}
    </div>
  );
}
