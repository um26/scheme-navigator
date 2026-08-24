// Common adapter for localized scheme content.
//
// The canonical catalog is English. Translation packs generated from an official
// localized source (preferred) or our offline translation pipeline can attach a
// `translations` object to a scheme without changing matching/routing fields:
//
//   scheme.translations.hi = { name, description, benefits, ministry, tags,
//                              applicationProcess, documentsRequired }
//
// Components call this helper and automatically fall back field-by-field to the
// English source when a translation is missing.

const LOCALIZABLE_FIELDS = [
  "name",
  "description",
  "benefits",
  "ministry",
  "tags",
  "applicationProcess",
  "documentsRequired",
  "eligibilityText",
];

export function localizeScheme(scheme, locale) {
  if (!scheme || !locale || locale === "en") return scheme;
  const translation = scheme.translations?.[locale];
  if (!translation) return scheme;

  const localized = { ...scheme };
  for (const field of LOCALIZABLE_FIELDS) {
    if (translation[field]) localized[field] = translation[field];
  }
  return localized;
}
