"use client";

import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import WhyEligible from "./WhyEligible";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function SchemeCard({ scheme, checks, showBookmark = true }) {
  const { t } = useLanguage();

  return (
    <div className="group border border-borderc bg-white/60 rounded-lg p-5 shadow-sm hover:shadow-md hover:border-saffron-dark/50 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/scheme/${scheme.id}`} className="min-w-0">
          <h3 className="font-display text-lg text-ledger group-hover:text-saffron-dark transition-colors">
            {scheme.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-bottle/10 text-bottle whitespace-nowrap">
            {scheme.level === "Central" ? t("browse_central") : scheme.level}
            {scheme.state ? ` \u00b7 ${scheme.state}` : ""}
          </span>
          {showBookmark && <BookmarkButton schemeId={scheme.id} size="sm" />}
        </div>
      </div>

      {scheme.description && (
        <p className="mt-2 text-sm text-ink/80 font-body line-clamp-3">
          {stripMarkdown(scheme.description)}
        </p>
      )}

      {scheme.benefits && (
        <p className="mt-2 text-sm text-bottle font-body line-clamp-2">
          <span className="font-semibold">{t("card_benefit")} </span>
          {stripMarkdown(scheme.benefits)}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <Link
          href={`/scheme/${scheme.id}`}
          className="text-xs font-body font-semibold text-saffron-dark hover:underline"
        >
          {t("card_view_details")}
        </Link>
      </div>

      {checks && <WhyEligible checks={checks} />}
    </div>
  );
}
