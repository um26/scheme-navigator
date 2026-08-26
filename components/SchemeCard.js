"use client";

import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import WhyEligible from "./WhyEligible";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

export default function SchemeCard({ scheme, checks, showBookmark = true, returnTo = null }) {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const displayScheme = localizeSchemeContent(scheme);
  const detailHref = returnTo
    ? `/scheme/${scheme.id}?returnTo=${encodeURIComponent(returnTo)}`
    : `/scheme/${scheme.id}`;

  return (
    <div className="group rounded-xl border border-borderc bg-white/60 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-saffron-dark/50 hover:shadow-md focus-within:border-saffron-dark/50 motion-reduce:transform-none">
      <div className="flex items-start justify-between gap-3">
        <Link href={detailHref} className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-ledger transition-colors group-hover:text-saffron-dark">
            {displayScheme.name}
          </h3>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="max-w-[11rem] truncate rounded-full bg-bottle/10 px-2 py-1 text-xs font-semibold text-bottle"
            title={scheme.state || scheme.level}
          >
            {scheme.level === "Central" ? t("browse_central") : t("browse_state")}
            {scheme.state ? ` · ${localizeState(locale, scheme.state)}` : ""}
          </span>
          {showBookmark && <BookmarkButton schemeId={scheme.id} size="sm" />}
        </div>
      </div>

      {displayScheme.description && (
        <p className="mt-2 text-sm text-ink/80 font-body line-clamp-3">
          {stripMarkdown(displayScheme.description)}
        </p>
      )}

      {displayScheme.benefits && (
        <p className="mt-2 text-sm text-bottle font-body line-clamp-2">
          <span className="font-semibold">{t("card_benefit")} </span>
          {stripMarkdown(displayScheme.benefits)}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <Link href={detailHref} className="text-xs font-body font-semibold text-saffron-dark transition-colors hover:text-saffron hover:underline">
          {t("card_view_details")}
        </Link>
      </div>

      {checks && <WhyEligible checks={checks} />}
    </div>
  );
}
