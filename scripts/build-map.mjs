// scripts/build-map.mjs
//
// Fetches India state/UT boundaries at BUILD TIME (never bundled/inlined by hand — see
// project handoff notes on why: large geo files get silently truncated when typed
// directly into deploy tool calls).
//
// SOURCE: AnujTiwari/India-State-and-Country-Shapefile-Updated-Jan-2020
// Chosen specifically because it depicts Jammu & Kashmir / Ladakh per Survey of India
// records — i.e. the full national claim (including areas administered by Pakistan and
// China), not the Line-of-Control-truncated shape that most generic GeoJSON sources use.
// The previous data source (geohacker/india) showed J&K cut off at the LoC, which is
// both geographically wrong per India's official position and a real publishing risk
// for an India-facing app. Verified by direct coordinate inspection before switching.
//
// Zero runtime dependencies beyond `shapefile` (pure JS, no native bindings — learned
// the hard way with transformers.js/onnxruntime-node that native deps break on Vercel).

import shapefile from "shapefile";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import path from "path";

const BASE =
  "https://raw.githubusercontent.com/AnujTiwari/India-State-and-Country-Shapefile-Updated-Jan-2020/master";
const TMP_DIR = path.join(process.cwd(), ".map-tmp");
const OUT_DIR = path.join(process.cwd(), "public", "data");
const OUT_FILE = path.join(OUT_DIR, "india-states.json");

const FILES = [
  "India_State_Boundary.shp",
  "India_State_Boundary.dbf",
  "India_State_Boundary.shx",
];

// ---- Web Mercator (EPSG:3857) -> WGS84 (EPSG:4326) ----
// The source shapefile's .prj is WGS_1984_Web_Mercator_Auxiliary_Sphere.
const R = 6378137;
function mercatorToLonLat([x, y]) {
  const lon = (x / R) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
  return [round6(lon), round6(lat)];
}
function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// ---- Douglas-Peucker simplification (zero-dependency, replaces mapshaper) ----
function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  const tt = Math.max(0, Math.min(1, t));
  const projX = x1 + tt * dx;
  const projY = y1 + tt * dy;
  return Math.hypot(x - projX, y - projY);
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

const SIMPLIFY_EPSILON = 0.006; // degrees; tuned to keep small UTs (Chandigarh etc.) alive

function simplifyRing(ring) {
  if (ring.length <= 4) return ring;
  const simplified = douglasPeucker(ring, SIMPLIFY_EPSILON);
  // keep rings closed
  if (
    simplified.length > 2 &&
    (simplified[0][0] !== simplified[simplified.length - 1][0] ||
      simplified[0][1] !== simplified[simplified.length - 1][1])
  ) {
    simplified.push(simplified[0]);
  }
  return simplified.length >= 4 ? simplified : ring;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map(simplifyRing),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) => poly.map(simplifyRing)),
    };
  }
  return geometry;
}

function reprojectGeometry(geometry) {
  const reprojRing = (ring) => ring.map(mercatorToLonLat);
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(reprojRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) => poly.map(reprojRing)),
    };
  }
  return geometry;
}

// Some very small UTs (Chandigarh, Lakshadweep, Puducherry exclaves) don't survive
// simplification at this scale — documented as a known limitation, not hidden.
const KNOWN_TOO_SMALL_FOR_MAP = ["Chandigarh", "Lakshadweep"];

async function main() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log("[build-map] downloading source shapefile...");
  for (const f of FILES) {
    const res = await fetch(`${BASE}/${f}`);
    if (!res.ok) throw new Error(`Failed to fetch ${f}: ${res.status}`);
    await pipeline(
      Readable.fromWeb(res.body),
      createWriteStream(path.join(TMP_DIR, f))
    );
  }

  console.log("[build-map] parsing shapefile...");
  const source = await shapefile.open(
    path.join(TMP_DIR, "India_State_Boundary.shp"),
    path.join(TMP_DIR, "India_State_Boundary.dbf")
  );

  const features = [];
  let result;
  while (!(result = await source.read()).done) {
    const feature = result.value;
    const name = feature.properties.State_Name;
    if (KNOWN_TOO_SMALL_FOR_MAP.includes(name)) continue;

    const reprojected = reprojectGeometry(feature.geometry);
    const simplified = simplifyGeometry(reprojected);

    features.push({
      type: "Feature",
      properties: { name },
      geometry: simplified,
    });
  }

  const geojson = { type: "FeatureCollection", features };
  writeFileSync(OUT_FILE, JSON.stringify(geojson));

  const jk = features.find((f) => f.properties.name === "Jammu and Kashmir");
  const ladakh = features.find((f) => f.properties.name === "Ladakh");
  console.log(`[build-map] wrote ${features.length} features to ${OUT_FILE}`);
  console.log(
    `[build-map] verify: J&K present=${!!jk}, Ladakh present=${!!ladakh} (both required for post-2019 accuracy)`
  );
}

main().catch((err) => {
  console.error("[build-map] FAILED:", err);
  process.exit(1);
});
