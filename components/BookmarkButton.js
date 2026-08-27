"use client";

import { useBookmarks } from "../lib/useBookmarks";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function BookmarkButton({ schemeId, size = "md" }) {
  const { t } = useLanguage();
  const { isBookmarked, toggle, hydrated } = useBookmarks();
  const saved = hydrated && isBookmarked(schemeId);

  const dims = size === "sm" ? "w-8 h-8 text-base" : "w-10 h-10 text-lg";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(schemeId);
      }}
      aria-pressed={saved}
      aria-label={saved ? t("bookmark_remove_aria") : t("bookmark_save_aria")}
      title={saved ? t("bookmark_saved_title") : t("bookmark_save_title")}
      className={`${dims} shrink-0 rounded-full border flex items-center justify-center transition-all duration-150 ${
        saved
          ? "bg-saffron border-saffron-dark text-white scale-100"
          : "bg-white/70 border-borderc text-muted hover:border-saffron-dark hover:text-saffron-dark hover:scale-105"
      }`}
    >
      {saved ? "\u2605" : "\u2606"}
    </button>
  );
}
