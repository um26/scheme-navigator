"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, visible: false });
  const navRef = useRef(null);
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
  const activeHref = [ ...LINKS.map((l) => l.href), "/saved" ].find((href) => isActive(href));

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeHref) return;
    let frame;
    const measure = () => {
      const item = nav.querySelector(`[data-nav="${activeHref}"]`);
      if (!item) return;
      setIndicator({
        left: item.offsetLeft + item.offsetWidth * 0.08,
        top: item.offsetTop + item.offsetHeight - 2,
        width: item.offsetWidth * 0.84,
        visible: true,
      });
    };
    frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [activeHref, t]);

  return (
    <>
      <header className="site-header border-b border-borderc bg-khadi/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between flex-wrap gap-y-2 gap-x-4">
          <Link href="/" className="brand-mark font-display text-2xl text-ledger">
            <span className="brand-spark" aria-hidden="true">✦</span>
            Scheme Navigator
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <nav ref={navRef} className="relative flex flex-wrap gap-x-5 gap-y-1 font-body text-ledger items-center text-sm">
              <span
                aria-hidden="true"
                className="absolute h-0.5 rounded-full bg-saffron-dark pointer-events-none transition-all duration-300 ease-out"
                style={{ left: indicator.left, top: indicator.top, width: indicator.width, opacity: indicator.visible ? 1 : 0 }}
              />
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  data-nav={l.href}
                  href={l.href}
                  className={`nav-link ${isActive(l.href) ? "text-saffron-dark" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
              <Link data-nav="/saved" href="/saved" className={`nav-link flex items-center ${isActive("/saved") ? "text-saffron-dark" : ""}`}>
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
