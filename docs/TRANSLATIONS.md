# Zero-cost translation pipeline

Scheme Navigator never translates user requests or scheme pages through a paid runtime API. English remains the canonical catalog/rule-engine language; regional-language text is generated offline and committed as static artifacts.

## What this gives us

- No API Setu organisation/GST requirement.
- No per-request translation bill and no translation secret on Vercel.
- English IDs, filters, URLs and deterministic eligibility logic never change.
- The browser downloads only the selected scheme-language pack and caches it.
- Missing fields safely fall back to canonical English.
- RTL is supported for Urdu, Kashmiri and Sindhi.

The app registry contains English plus all 22 Eighth Schedule languages. New languages are hidden until a complete generated pack exists, so the selector never advertises an unfinished translation.

## Translation engine

The authoring script uses AI4Bharat IndicTrans2 En→Indic distilled model (`ai4bharat/indictrans2-en-indic-dist-200M`). It supports all scheduled Indian languages and is run locally/Colab. Vercel only receives compressed JSON output.

The Hugging Face model is gated: use a free personal Hugging Face account, accept the model conditions once, and log in from the notebook/terminal. This is not an organisation/GST registration and is not a hosted production API.

## Free Colab run

1. Open a Google Colab notebook and choose a free GPU runtime when available.
2. Clone this repo.
3. Install the authoring dependencies:

```bash
pip install -U "torch>=2.5" "transformers>=4.51,<5" indictranstoolkit sentencepiece sacremoses accelerate huggingface_hub
npm install
```

4. Log in to Hugging Face in Colab (`from huggingface_hub import notebook_login; notebook_login()`) after accepting access to the IndicTrans2 model page.
5. Generate a small first batch:

```bash
python scripts/translate-catalog.py --locales hi,mr,bn,gu --batch-size 32
```

6. Repeat in batches until all are done, or use `--locales all`. The cache in `.translation-work/cache/` is resumable, so preserving it in Google Drive avoids losing progress if a free runtime disconnects.
7. Commit only these outputs:

```text
public/i18n/schemes/<locale>.json.gz
public/i18n/generated-ui.json
lib/i18n/generated.js
```

Do **not** commit `.translation-work/`.

## Runtime format

Each compressed pack contains only translated display fields keyed by the stable scheme id. The field order is:

```text
name, description, benefits, ministry, tags,
applicationProcess, documentsRequired, eligibilityText
```

`LanguageContext` preloads the selected pack before switching locale, then changes the language cookie. This is what lets labels and scheme content change together instead of flashing a partly-English page.

## QA before activating everything

Machine translation should be treated as a convenience layer over the English source, not as an official translation. Before declaring all 22 complete, spot-check at least titles, money values, dates, eligibility negation, application instructions, Markdown lists, and RTL layout for each generated locale. Scheme URLs and eligibility calculations must continue using the untouched canonical record.
