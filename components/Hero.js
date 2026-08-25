"use client";

import { useLanguage } from "../lib/i18n/LanguageContext";

export default function Hero({ stats }) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8 md:pt-16 md:pb-10">
        <div className="text-center">
          <p className="font-body text-xs md:text-sm tracking-[0.2em] uppercase text-saffron-dark font-semibold">
            {t("hero_eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-tight text-ledger">
            {t("hero_headline")}
          </h1>
          <p className="mt-4 font-body text-ink/75 max-w-xl mx-auto">{t("hero_subhead")}</p>

          {stats && (
            <dl className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted font-body">{t("hero_stat_schemes")}</dt>
                <dd className="font-display text-2xl text-bottle">{stats.total.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted font-body">{t("hero_stat_states")}</dt>
                <dd className="font-display text-2xl text-bottle">{stats.states}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted font-body">{t("hero_stat_central")}</dt>
                <dd className="font-display text-2xl text-bottle">{stats.central.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
      <div className="jali-divider" />
    </section>
  );
}
