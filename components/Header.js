"use client";

import Link from "next/link";
import SavedCount from "./SavedCount";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Header() {
  const { t } = useLanguage();

  const LINKS = [
    { href: "/", label: t("nav_find") },
    { href: "/browse", label: t("nav_browse") },
    { href: "/map", label: t("nav_map") },
    { href: "/explore", label: t("nav_whatif") },
    { href: "/constellation", label: t("nav_constellation") },
    { href: "/evals", label: t("nav_evals") },
  ];

  return (
    <header className="border-b border-borderc bg-khadi/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-y-2 gap-x-4">
        <Link href="/" className="font-display text-2xl text-ledger">
          Scheme Navigator
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <nav className="flex flex-wrap gap-x-5 gap-y-1 font-body text-ledger items-center text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-saffron-dark transition-colors">
                {l.label}
              </Link>
            ))}
            <Link href="/saved" className="hover:text-saffron-dark transition-colors flex items-center">
              {t("nav_saved")}
              <SavedCount />
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
      <div className="jali-divider" />
    </header>
  );
}
