"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

const NAME_ALIASES = {
  Chhattishgarh: "Chhattisgarh",
  Telengana: "Telangana",
  Tamilnadu: "Tamil Nadu",
  "Andaman & Nicobar": "Andaman and Nicobar Islands",
  "Daman and Diu and Dadra and Nagar Haveli": "Dadra & Nagar Haveli and Daman & Diu",
};

function canonicalName(raw) {
  return NAME_ALIASES[raw] || raw;
}

function norm(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function MapPage() {
  const [geoData, setGeoData] = useState(null);
  const [schemes, setSchemes] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const router = useRouter();
  const { t, locale } = useLanguage();

  useEffect(() => {
    Promise.all([
      fetch("/data/india-states.json").then((r) => r.json()),
      fetch("/data/schemes-lite.json").then((r) => r.json()),
    ])
      .then(([geo, lite]) => {
        setGeoData(geo);
        setSchemes(lite);
      })
      .catch(() => {
        setGeoData(null);
        setSchemes([]);
      });
  }, []);

  const geographies = useMemo(() => geoData?.features || [], [geoData]);
  const centralCount = useMemo(() => schemes?.filter((s) => s.level === "Central").length || 0, [schemes]);
  const stateCounts = useMemo(() => {
    const out = new Map();
    for (const s of schemes || []) {
      if (!s.state) continue;
      const key = norm(s.state);
      out.set(key, (out.get(key) || 0) + 1);
    }
    return out;
  }, [schemes]);

  const hoveredCanonical = hovered ? canonicalName(hovered) : null;
  const stateCount = hoveredCanonical ? stateCounts.get(norm(hoveredCanonical)) || 0 : 0;
  const availableCount = stateCount + centralCount;

  function openState(name) {
    const canonical = canonicalName(name);
    setSelected(name);
    window.setTimeout(() => {
      router.push(`/browse?region=${encodeURIComponent(canonical)}&page=1`);
    }, 120);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 page-enter">
      <div className="text-center max-w-2xl mx-auto">
        <div className="section-kicker">INDIA · 36 STATES & UTs</div>
        <h1 className="mt-3 font-display text-3xl md:text-5xl text-ledger">{t("map_title")}</h1>
        <p className="mt-3 text-center text-ink/70 font-body leading-relaxed">{t("map_subtitle")}</p>
        <div className="mt-2 text-xs text-muted font-body">
          <p>{t("map_boundary_note")}</p>
          <a href="/browse" className="inline-flex items-center gap-1 mt-2 text-saffron-dark font-semibold hover:gap-2 transition-all">
            {t("nav_browse")} →
          </a>
        </div>
      </div>

      <div className="map-shell mt-8 relative border border-borderc rounded-[1.5rem] bg-white/50 overflow-hidden shadow-sm">
        <div className="map-grid" aria-hidden="true" />
        <div className="map-compass" aria-hidden="true"><span>N</span></div>
        {geographies.length === 0 ? (
          <div className="py-20 px-8 max-w-2xl mx-auto space-y-3">
            <div className="skeleton h-12 rounded-2xl w-1/3 mx-auto" />
            <div className="skeleton h-[420px] rounded-[2rem]" />
            <p className="text-center text-muted font-body">{t("map_loading")}</p>
          </div>
        ) : (
          <>
            <div className={`map-hover-card ${hovered ? "is-visible" : ""}`}>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted font-body">Available where you live</div>
              <div className="mt-0.5 font-display text-xl text-ledger">
                {hoveredCanonical ? localizeState(locale, hoveredCanonical) : "India"}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl text-saffron-dark tabular-nums">{availableCount.toLocaleString("en-IN")}</span>
                <span className="text-xs text-muted font-body">schemes</span>
              </div>
              <div className="mt-1 text-[11px] text-muted font-body">
                {stateCount.toLocaleString("en-IN")} state · {centralCount.toLocaleString("en-IN")} central
              </div>
            </div>

            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [82, 22], scale: 950 }}
              width={800}
              height={800}
              style={{ width: "100%", height: "auto" }}
              className="map-svg"
            >
              <ZoomableGroup center={[82, 22]} zoom={1} minZoom={1} maxZoom={6}>
                <Geographies geography={geoData}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = geo.properties.name;
                      const isSelected = selected === name;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => setHovered(name)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => openState(name)}
                          style={{
                            default: {
                              fill: isSelected ? "rgb(var(--c-saffron))" : "rgb(var(--c-ledger) / .88)",
                              stroke: "rgb(var(--c-khadi))",
                              strokeWidth: isSelected ? 1.4 : 0.65,
                              outline: "none",
                              cursor: "pointer",
                              transition: "fill 180ms ease, stroke-width 180ms ease, filter 180ms ease",
                              filter: isSelected ? "drop-shadow(0 0 8px rgb(var(--c-saffron) / .45))" : "none",
                            },
                            hover: {
                              fill: "rgb(var(--c-saffron))",
                              stroke: "rgb(var(--c-khadi))",
                              strokeWidth: 1.1,
                              outline: "none",
                              cursor: "pointer",
                              filter: "drop-shadow(0 0 7px rgb(var(--c-saffron) / .28))",
                            },
                            pressed: {
                              fill: "rgb(var(--c-saffron-dark))",
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            <div className="map-hint">Scroll to zoom · drag to explore · tap a state</div>
          </>
        )}
      </div>
    </div>
  );
}
