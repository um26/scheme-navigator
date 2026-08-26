"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SavedCount from "./SavedCount";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const LINKS = [
    { href: "/", label: t("nav_find") },
    { href: "/browse", label: t("nav_browse") },
    { href: "/map", label: t("nav_map") },
    { href: "/explore", label: t("nav_whatif") },
    { href: "/constellation", label: t("nav_constellation") },
    { href: "/evals", label: t("nav_evals") },
  ];

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-borderc bg-khadi/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:py-4">
        <Link href="/" className="min-w-0 truncate font-display text-2xl text-ledger">
          Scheme Navigator
        </Link>

        <nav
          aria-label="Primary"
          className="nav-scroll order-3 col-span-2 flex items-center gap-5 overflow-x-auto whitespace-nowrap pb-1 font-body text-sm text-ledger md:order-none md:col-span-1 md:justify-end md:overflow-visible md:pb-0"
        >
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 py-1 transition-colors ${
                  active ? "font-semibold text-saffron-dark" : "hover:text-saffron-dark"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/saved"
            aria-current={isActive("/saved") ? "page" : undefined}
            className={`flex shrink-0 items-center py-1 transition-colors ${
              isActive("/saved") ? "font-semibold text-saffron-dark" : "hover:text-saffron-dark"
            }`}
          >
            {t("nav_saved")}
            <SavedCount />
          </Link>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="jali-divider" />
    </header>
  );
}
