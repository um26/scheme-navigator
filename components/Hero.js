"use client";

import { useLanguage } from "../lib/i18n/LanguageContext";
import CountUp from "./CountUp";

const NODES = [
  [7, 24], [14, 70], [23, 38], [31, 78], [39, 18], [47, 55], [55, 31], [62, 73],
  [69, 21], [76, 51], [84, 30], [91, 68], [18, 15], [28, 58], [43, 82], [58, 12],
  [72, 85], [87, 47], [10, 48], [34, 27], [51, 88], [66, 43], [80, 74], [94, 18],
];

const LINES = [
  [0, 2], [2, 9], [9, 5], [5, 6], [6, 10], [10, 8], [8, 17], [17, 11],
  [1, 18], [18, 13], [13, 3], [3, 14], [14, 20], [20, 16], [16, 22], [22, 11],
  [12, 19], [19, 4], [4, 15], [15, 6], [6, 21], [21, 17], [17, 23], [7, 16],
];

function ConstellationBackdrop() {
  return (
    <div className="hero-constellation" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation">
        <defs>
          <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="hero-glow" cx="52" cy="48" r="38" fill="url(#heroGlow)" />
        <g className="hero-lines">
          {LINES.map(([a, b], i) => (
            <line key={i} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
          ))}
        </g>
        <g className="hero-nodes">
          {NODES.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 0.7 : 0.42} style={{ animationDelay: `${(i % 8) * 180}ms` }} />
          ))}
        </g>
      </svg>
      <div className="hero-chakra" />
    </div>
  );
}

export default function Hero({ stats }) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden hero-shell">
      <ConstellationBackdrop />
      <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-saffron/25 bg-saffron/5 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-saffron-dark hero-pulse" />
            <p className="font-body text-[11px] md:text-xs tracking-[0.19em] uppercase text-saffron-dark font-semibold">
              {t("hero_eyebrow")}
            </p>
          </div>

          <h1 className="mt-5 font-display text-4xl md:text-6xl lg:text-[4rem] leading-[1.06] text-ledger hero-title">
            {t("hero_headline")}
          </h1>
          <p className="mt-5 font-body text-base md:text-lg text-ink/72 max-w-2xl mx-auto leading-relaxed">
            {t("hero_subhead")}
          </p>

          {stats && (
            <dl className="mt-8 grid grid-cols-3 gap-2 md:gap-3 max-w-2xl mx-auto">
              <div className="hero-stat-card">
                <dt className="text-[10px] md:text-xs uppercase tracking-[0.13em] text-muted font-body">{t("hero_stat_schemes")}</dt>
                <dd className="mt-1 font-display text-2xl md:text-3xl text-saffron-dark tabular-nums">
                  <CountUp value={stats.total} />
                </dd>
              </div>
              <div className="hero-stat-card">
                <dt className="text-[10px] md:text-xs uppercase tracking-[0.13em] text-muted font-body">{t("hero_stat_states")}</dt>
                <dd className="mt-1 font-display text-2xl md:text-3xl text-saffron-dark tabular-nums">
                  <CountUp value={stats.states} format={false} />
                </dd>
              </div>
              <div className="hero-stat-card">
                <dt className="text-[10px] md:text-xs uppercase tracking-[0.13em] text-muted font-body">{t("hero_stat_central")}</dt>
                <dd className="mt-1 font-display text-2xl md:text-3xl text-saffron-dark tabular-nums">
                  <CountUp value={stats.central} />
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
      <div className="jali-divider jali-animate" />
    </section>
  );
}
