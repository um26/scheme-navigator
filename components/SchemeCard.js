"use client";

import { useRef } from "react";
import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import WhyEligible from "./WhyEligible";
import EligibilityMeter from "./EligibilityMeter";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";

export default function SchemeCard({ scheme, checks, showBookmark = true }) {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const displayScheme = localizeSchemeContent(scheme);
  const cardRef = useRef(null);

  function handleMove(e) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 3.2}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 4.2}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }

  function resetTilt() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }

  return (
    <article
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={resetTilt}
      className="scheme-card group relative border border-borderc bg-white/60 rounded-2xl p-5 md:p-6 shadow-sm transition-all duration-300 overflow-hidden"
    >
      <div className="scheme-card-glow" aria-hidden="true" />
      <div className="scheme-card-corner" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.09em] px-2.5 py-1 rounded-full bg-saffron/10 text-saffron-dark border border-saffron/15 whitespace-nowrap">
              {scheme.level === "Central" ? t("browse_central") : t("browse_state")}
              {scheme.state ? ` · ${localizeState(locale, scheme.state)}` : ""}
            </span>
            {displayScheme.ministry && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-ledger/5 text-muted border border-borderc/60 line-clamp-1 max-w-[220px]">
                {displayScheme.ministry}
              </span>
            )}
          </div>
          <Link href={`/scheme/${scheme.id}`} className="block">
            <h3 className="font-display text-xl md:text-[1.35rem] leading-snug text-ledger group-hover:text-saffron-dark transition-colors">
              {displayScheme.name}
            </h3>
          </Link>
        </div>
        {showBookmark && <BookmarkButton schemeId={scheme.id} size="sm" />}
      </div>

      {displayScheme.description && (
        <p className="relative mt-3 text-sm text-ink/78 font-body leading-relaxed line-clamp-3">
          {stripMarkdown(displayScheme.description)}
        </p>
      )}

      {displayScheme.benefits && (
        <div className="relative mt-4 rounded-xl border border-saffron/20 bg-saffron/[0.06] px-3.5 py-3">
          <p className="text-sm text-ink/85 font-body line-clamp-2">
            <span className="font-semibold text-saffron-dark">{t("card_benefit")} </span>
            {stripMarkdown(displayScheme.benefits)}
          </p>
        </div>
      )}

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {checks && <EligibilityMeter checks={checks} />}
          <Link href={`/scheme/${scheme.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-body font-semibold text-saffron-dark hover:gap-2 transition-all">
            {t("card_view_details")}
          </Link>
        </div>
        {displayScheme.tags && (
          <span className="hidden sm:block text-[10px] text-muted font-body border border-borderc/60 rounded-full px-2.5 py-1 max-w-[180px] truncate">
            {displayScheme.tags}
          </span>
        )}
      </div>

      {checks && <div className="relative"><WhyEligible checks={checks} /></div>}
    </article>
  );
}
