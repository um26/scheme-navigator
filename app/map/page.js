"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const DEFAULT_VIEW = { center: [82, 22], zoom: 1 };

function canonicalName(raw) {
  return NAME_ALIASES[raw] || raw;
}

export default function MapPage() {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const router = useRouter();
  const { t, locale } = useLanguage();

  useEffect(() => {
    fetch("/data/india-states.json")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData({ features: [] }));
  }, []);

  const geographies = useMemo(() => geoData?.features || [], [geoData]);
  const regionLinks = useMemo(
    () => geographies.map((feature) => canonicalName(feature.properties.name)).filter(Boolean).sort(),
    [geographies]
  );

  function openRegion(rawName) {
    const name = canonicalName(rawName);
    setSelected(name);
    router.push(`/browse?region=${encodeURIComponent(name)}&page=1`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger text-center">{t("map_title")}</h1>
      <p className="mt-2 text-center text-ink/70 font-body">{t("map_subtitle")}</p>
      <div className="mt-1 text-center text-xs text-muted font-body">
        <p>{t("map_boundary_note")}</p>
        <Link href="/browse" className="inline-block mt-1 underline">{t("nav_browse")} →</Link>
      </div>

      <div className="mt-6 relative overflow-hidden rounded-xl border border-borderc bg-white/50 shadow-sm">
        <div className="absolute end-3 top-3 z-20 flex gap-1 rounded-lg border border-borderc bg-white/90 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView((value) => ({ ...value, zoom: Math.min(6, value.zoom * 1.35) }))}
            aria-label="Zoom in"
            title="Zoom in"
            className="interactive-surface flex h-8 w-8 items-center justify-center rounded-md text-ledger hover:bg-khadi-dark/70"
          >+
          </button>
          <button
            type="button"
            onClick={() => setView((value) => ({ ...value, zoom: Math.max(1, value.zoom / 1.35) }))}
            aria-label="Zoom out"
            title="Zoom out"
            className="interactive-surface flex h-8 w-8 items-center justify-center rounded-md text-ledger hover:bg-khadi-dark/70"
          >−
          </button>
          <button
            type="button"
            onClick={() => setView(DEFAULT_VIEW)}
            aria-label="Reset map"
            title="Reset"
            className="interactive-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-body font-semibold text-ledger hover:bg-khadi-dark/70"
          >↺
          </button>
        </div>

        {!geoData ? (
          <div className="p-6" aria-live="polite" aria-label={t("map_loading")}>
            <div className="skeleton mx-auto h-[56vw] max-h-[560px] min-h-[320px] max-w-2xl rounded-[2rem]" />
          </div>
        ) : geographies.length === 0 ? (
          <p className="text-center py-20 text-muted font-body">{t("map_loading")}</p>
        ) : (
          <>
            {(hovered || selected) && (
              <div className="absolute start-1/2 top-3 z-10 max-w-[62%] -translate-x-1/2 truncate rounded-full bg-ledger px-4 py-1.5 text-sm font-body font-semibold text-white shadow-md pointer-events-none">
                {localizeState(locale, hovered || selected)}
              </div>
            )}
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [82, 22], scale: 950 }}
              width={800}
              height={800}
              role="img"
              aria-label={t("map_title")}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup
                center={view.center}
                zoom={view.zoom}
                minZoom={1}
                maxZoom={6}
                onMoveEnd={(position) => setView({ center: position.coordinates, zoom: position.zoom })}
              >
                <Geographies geography={geoData}>
                  {({ geographies: shapes }) =>
                    shapes.map((geo) => {
                      const rawName = geo.properties.name;
                      const name = canonicalName(rawName);
                      const isSelected = selected === name;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          tabIndex={0}
                          role="button"
                          aria-label={localizeState(locale, name)}
                          onFocus={() => setSelected(name)}
                          onBlur={() => setHovered(null)}
                          onMouseEnter={() => setHovered(name)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => openRegion(name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRegion(name);
                            }
                          }}
                          style={{
                            default: {
                              fill: isSelected ? "rgb(var(--c-saffron-dark))" : "rgb(var(--c-bottle))",
                              stroke: "rgb(var(--c-khadi-dark))",
                              strokeWidth: 0.65,
                              outline: "none",
                              cursor: "pointer",
                              transition: "fill 150ms ease, opacity 150ms ease",
                            },
                            hover: {
                              fill: "rgb(var(--c-saffron))",
                              stroke: "rgb(var(--c-khadi-dark))",
                              strokeWidth: 0.75,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: { fill: "rgb(var(--c-saffron-dark))", outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </>
        )}
      </div>

      {regionLinks.length > 0 && (
        <details className="mt-4 rounded-xl border border-borderc bg-white/50 p-4 font-body">
          <summary className="cursor-pointer font-semibold text-ledger">{t("nav_browse")}</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {regionLinks.map((name) => (
              <Link key={name} href={`/browse?region=${encodeURIComponent(name)}&page=1`} className="text-sm text-bottle hover:text-saffron-dark hover:underline">
                {localizeState(locale, name)}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
