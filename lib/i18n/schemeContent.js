// Common adapter for localized scheme content.
//
// The canonical catalog stays English so IDs, URLs, eligibility checks and filters
// are never affected by machine translation. Offline language packs contain only
// display fields and are keyed by the stable scheme id.

export const SCHEME_TRANSLATION_FIELDS = [
  "name",
  "description",
  "benefits",
  "ministry",
  "tags",
  "applicationProcess",
  "documentsRequired",
  "eligibilityText",
];

function translationFromPack(pack, schemeId) {
  if (!pack || !schemeId) return null;
  const raw = pack.schemes?.[schemeId] ?? pack[schemeId];
  if (!raw) return null;

  if (!Array.isArray(raw)) return raw;

  const out = {};
  SCHEME_TRANSLATION_FIELDS.forEach((field, index) => {
    if (raw[index]) out[field] = raw[index];
  });
  return out;
}

export function localizeScheme(scheme, locale, pack = null) {
  if (!scheme || !locale || locale === "en") return scheme;

  // Static generated pack wins. `scheme.translations` remains supported for small
  // hand-authored/official overrides.
  const translation =
    translationFromPack(pack, scheme.id) ||
    scheme.translations?.[locale];

  if (!translation) return scheme;

  const localized = { ...scheme };
  for (const field of SCHEME_TRANSLATION_FIELDS) {
    if (translation[field]) localized[field] = translation[field];
  }
  return localized;
}
