"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SavedCount from "./SavedCount";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const PRIMARY_LINKS = [
    { href: "/", label: t("nav_find") },
    { href: "/search", label: "Search" },
    { href: "/browse", label: t("nav_browse") },
    { href: "/profile", label: "Profiles" },
  ];

  const SECONDARY_LINKS = [
    { href: "/map", label: t("nav_map") },
    { href: "/explore", label: t("nav_whatif") },
    { href: "/constellation", label: t("nav_constellation") },
    { href: "/evals", label: t("nav_evals") },
  ];

  useEffect(() => {
    function onPointerDown(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => setMoreOpen(false), [pathname]);

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const desktopLinks = [...PRIMARY_LINKS, ...SECONDARY_LINKS];
  const secondaryActive = SECONDARY_LINKS.some((link) => isActive(link.href));

  return (
    <header className="sticky top-0 z-50 border-b border-borderc bg-khadi/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:py-4">
        <Link href="/" className="min-w-0 truncate font-display text-2xl text-ledger">Scheme Navigator</Link>

        <nav aria-label="Primary" className="hidden items-center justify-end gap-3 font-body text-sm text-ledger md:flex lg:gap-4">
          {desktopLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`shrink-0 py-1 transition-colors ${active ? "font-semibold text-saffron-dark" : "hover:text-saffron-dark"}`}>{link.label}</Link>
            );
          })}
          <Link href="/saved" aria-current={isActive("/saved") ? "page" : undefined} className={`flex shrink-0 items-center py-1 transition-colors ${isActive("/saved") ? "font-semibold text-saffron-dark" : "hover:text-saffron-dark"}`}>
            {t("nav_saved")}<SavedCount />
          </Link>
        </nav>

        <div className="flex items-center gap-2 justify-self-end"><ThemeToggle /><LanguageSwitcher /></div>

        <nav aria-label="Primary mobile" className="nav-scroll order-3 col-span-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 font-body text-sm text-ledger md:hidden">
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(link.href);
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 transition-all ${active ? "bg-saffron-dark text-white shadow-sm" : "hover:bg-white/60"}`}>{link.label}</Link>;
          })}
          <Link href="/saved" aria-current={isActive("/saved") ? "page" : undefined} className={`flex shrink-0 items-center rounded-full px-3 py-1.5 transition-all ${isActive("/saved") ? "bg-saffron-dark text-white shadow-sm" : "hover:bg-white/60"}`}>
            {t("nav_saved")}<SavedCount />
          </Link>

          <div className="relative shrink-0" ref={moreRef}>
            <button type="button" onClick={() => setMoreOpen((value) => !value)} aria-haspopup="menu" aria-expanded={moreOpen} aria-label="More navigation" className={`rounded-full px-3 py-1.5 transition-all ${secondaryActive ? "font-semibold text-saffron-dark" : "hover:bg-white/60"}`}><span aria-hidden="true">•••</span></button>
            {moreOpen && (
              <div role="menu" className="absolute end-0 z-[70] mt-2 w-56 rounded-xl border border-borderc bg-white/95 p-2 shadow-xl animate-fadeIn">
                {SECONDARY_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return <Link key={link.href} href={link.href} role="menuitem" aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-start transition-colors ${active ? "bg-saffron-dark text-white" : "hover:bg-khadi-dark/70"}`}>{link.label}</Link>;
                })}
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="jali-divider" />
    </header>
  );
}
