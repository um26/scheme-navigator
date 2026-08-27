// Stable labels for narrative-only eligibility signals, catalog field names, and
// dynamic diagnostic keys. These keys are exported with the rest of the English UI
// source and translated by the static UI pipeline.
export const CONDITION_MESSAGES = {
  en: {
    elig_condition_student: "Student / enrolment status",
    elig_condition_occupation: "Occupation / worker status",
    elig_condition_farmer_land: "Farmer / landholding status",
    elig_condition_marital: "Marital / family status",
    elig_condition_employment: "Employment status",
    elig_condition_education: "Education / qualification",
    elig_condition_domicile: "Domicile / residence duration",
    elig_condition_minority: "Minority / community status",
    elig_condition_institution: "Institution / organisation status",

    scheme_field_name: "Name",
    scheme_field_description: "Description",
    scheme_field_benefits: "Benefits",
    scheme_field_ministry: "Ministry",
    scheme_field_tags: "Tags",
    scheme_field_applicationProcess: "Application process",
    scheme_field_documentsRequired: "Documents required",
    scheme_field_eligibilityText: "Eligibility text",
    scheme_field_eligibility: "Eligibility rules",
    scheme_field_state: "State",
    scheme_field_level: "Level",
    scheme_field_applyUrl: "Application link",
    scheme_field_officialUrl: "Official link",

    diagnostics_metric_ageRestricted: "Age restricted",
    diagnostics_metric_incomeCapped: "Income capped",
    diagnostics_metric_genderRestricted: "Gender restricted",
    diagnostics_metric_categoryRestricted: "Category restricted",
    diagnostics_metric_bplRequired: "BPL required",
    diagnostics_metric_disabilityRequired: "Disability required",
    diagnostics_note_url:
      "URL health means presence and parseable http(s) format only; the build does not issue thousands of live HEAD requests.",
    diagnostics_note_anomaly: "Anomaly flags are review queues, not proof that the source record is wrong.",
    diagnostics_note_narrative:
      "Narrative eligibility signals deliberately increase uncertainty rather than being guessed into structured eligibility.",
  },
};
