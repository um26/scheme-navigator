"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

// The shapefile source (AnujTiwari/India-State-and-Country-Shapefile — chosen for the
// Kashmir/Ladakh boundary fix, see scripts/build-map.mjs) uses slightly different
// spellings/groupings than the scheme dataset. Confirmed against the live dataset's
// actual state strings (see lib/indianStates.js) before wiring this up.
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

export default function MapPage() {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const router = useRouter();
  const { t, locale } = useLanguage();

  useEffect(() => {
    fetch("/data/india-states.json")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null));
  }, []);

  const geographies = useMemo(() => geoData?.features || [], [geoData]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger text-center">{t("map_title")}</h1>
      <p className="mt-2 text-center text-ink/70 font-body">{t("map_subtitle")}</p>
      <div className="mt-1 text-center text-xs text-muted font-body">
        <p>{t("map_boundary_note")}</p>
        <a href="/browse" className="inline-block mt-1 underline">
          {t("nav_browse")} →
        </a>
      </div>

      <div className="mt-6 relative border border-borderc rounded-lg bg-white/50 overflow-hidden">
        {geographies.length === 0 ? (
          <p className="text-center py-20 text-muted font-body">{t("map_loading")}</p>
        ) : (
          <>
            {hovered && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-ledger text-white text-sm font-body font-semibold shadow-md pointer-events-none">
                {localizeState(locale, canonicalName(hovered))}
              </div>
            )}
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [82, 22], scale: 950 }}
              width={800}
              height={800}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup center={[82, 22]} zoom={1} minZoom={1} maxZoom={6}>
                <Geographies geography={geoData}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const name = geo.properties.name;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => setHovered(name)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() =>
                            router.push(`/browse?region=${encodeURIComponent(canonicalName(name))}&page=1`)
                          }
                          style={{
                            default: {
                              fill: "#1E3A5F",
                              stroke: "#F4EDDD",
                              strokeWidth: 0.5,
                              outline: "none",
                              cursor: "pointer",
                              transition: "fill 150ms ease",
                            },
                            hover: {
                              fill: "#E38B29",
                              stroke: "#F4EDDD",
                              strokeWidth: 0.5,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: "#C46F14",
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
          </>
        )}
      </div>
    </div>
  );
}
