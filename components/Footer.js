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
          <a href="https://instagram.com/binary.bots_01" target="_blank" rel="noopener noreferrer" className="text-bottle hover:text-saffron-dark transition-colors font-medium">
            {t("footer_credit")}
          </a>
        </p>
        <p className="mt-1 text-xs">{t("footer_disclaimer")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
          <Link className="underline underline-offset-2 hover:text-saffron-dark" href="/diagnostics">{t("footer_data_health")}</Link>
          <span aria-hidden="true">·</span>
          <Link className="underline underline-offset-2 hover:text-saffron-dark" href="/updates">{t("footer_scheme_changes")}</Link>
        </div>
      </div>
    </footer>
  );
}
