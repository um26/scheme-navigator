"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SavedCount from "./SavedCount";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const LINKS = [
    { href: "/", label: t("nav_find") },
    { href: "/browse", label: t("nav_browse") },
    { href: "/map", label: t("nav_map") },
    { href: "/explore", label: t("nav_whatif") },
    { href: "/constellation", label: t("nav_constellation") },
    { href: "/evals", label: t("nav_evals") },
  ];

  useEffect(() => {
    function onKey(e) {
      const target = e.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <header className="site-header border-b border-borderc bg-khadi/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between flex-wrap gap-y-2 gap-x-4">
          <Link href="/" className="brand-mark font-display text-2xl text-ledger">
            <span className="brand-spark" aria-hidden="true">✦</span>
            Scheme Navigator
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <nav className="flex flex-wrap gap-x-5 gap-y-1 font-body text-ledger items-center text-sm">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link ${isActive(l.href) ? "nav-link-active" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/saved" className={`nav-link flex items-center ${isActive("/saved") ? "nav-link-active" : ""}`}>
                {t("nav_saved")}
                <SavedCount />
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="command-trigger"
                aria-label="Search all schemes"
                title="Search all schemes (⌘K)"
              >
                <span aria-hidden="true">⌕</span>
                <span className="hidden xl:inline text-xs font-body">Search</span>
                <kbd className="hidden xl:inline">⌘K</kbd>
              </button>
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
        <div className="jali-divider jali-compact" />
      </header>
      <CommandPalette open={searchOpen} onClose={closeSearch} />
    </>
  );
}
