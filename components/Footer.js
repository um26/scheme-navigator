"use client";

import Link from "next/link";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-12">
      <div className="jali-divider" />
      <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted font-body">
        <p>
          <a href="https://instagram.com/binary.bots_01" target="_blank" rel="noopener noreferrer" className="text-bottle hover:text-saffron-dark transition-colors font-medium">{t("footer_credit")}</a>
        </p>
        <p className="mt-1 text-xs">{t("footer_disclaimer")}</p>
        <p className="mt-2 text-[11px]"><Link href="/diagnostics" className="underline underline-offset-2 hover:text-saffron-dark">Data health & freshness</Link></p>
      </div>
    </footer>
  );
}
