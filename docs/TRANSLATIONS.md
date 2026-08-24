# Zero-cost translation pipeline

Scheme Navigator never translates user requests or scheme pages through a paid runtime API. English remains the canonical catalog/rule-engine language; regional-language text is generated offline and committed as static artifacts.

## What this gives us

- No API Setu organisation/GST requirement.
- No per-request translation bill and no translation secret on Vercel.
- English IDs, filters, URLs and deterministic eligibility logic never change.
- The browser downloads only the selected scheme-language pack and caches it.
- Missing fields safely fall back to canonical English.
- RTL is supported for Urdu, Kashmiri and Sindhi.

The app registry contains English plus all 22 Eighth Schedule languages. Hindi/Telugu/Tamil remain available through the existing hand-authored UI dictionaries. Newly generated languages are only added to the selector once their **core + details** scheme fields have been generated; long application/document text can be filled progressively afterward.

## Translation engine

The authoring scripts use AI4Bharat IndicTrans2 En→Indic distilled model (`ai4bharat/indictrans2-en-indic-dist-200M`). It supports all scheduled Indian languages and is run locally/Colab. Vercel only receives compressed JSON output.

The Hugging Face model is gated: use a free personal Hugging Face account, accept the model conditions once, and authenticate from Colab with a **Read** token from that same account. This is not an organisation/GST registration and is not a hosted production API.

## Two generator modes

### Original full-quality generator

`scripts/translate-catalog.py` translates all eight scheme display fields and uses 5-beam decoding. The first full Hindi pack was generated with this route. It is high quality but too slow to repeat naively for 21 more languages.

### Fast staged generator (recommended for the remaining languages)

`scripts/translate-catalog-fast.py` keeps the same cache keys and final pack format, but adds staged generation, greedy decoding by default, larger batches, CUDA OOM auto-splitting, and ETA/progress reporting.

The stages are:

```text
core:
  name, description, ministry, tags
  + UI strings and state names

details:
  benefits, eligibilityText
  + cached UI/state strings

long:
  applicationProcess, documentsRequired
  + cached UI/state strings

full:
  all eight fields in one pass
```

Each stage merges into the same `<locale>.json.gz` file. Running `details` after `core` does **not** erase core translations; running `long` later simply fills the remaining array positions.

A newly generated locale is marked ready for the visible language selector only when the pack contains all non-empty canonical fields from **core + details**. This prevents a core-only language from being advertised as complete.

## Colab environment

Use a T4 GPU or better. Keep Colab's preinstalled CUDA-enabled PyTorch, remove unused torchvision if it causes binary mismatches, and use a compatible Transformers version. The current notebook also applies the IndicTrans2 legacy KV-cache compatibility shim needed by newer Transformers generation code.

The translation cache should live directly in Google Drive (for example `/content/drive/MyDrive/scheme-navigator-i18n/cache`) through the `.translation-work/cache` symlink. Every completed batch is then persistent even if a free Colab runtime disconnects.

## Recommended remaining-language rollout

Let the existing Hindi full run finish. Then use the fast generator for the other scheduled languages.

First, core coverage:

```bash
python scripts/translate-catalog-fast.py \
  --locales as,bn,brx,doi,gu,kn,ks,gom,mai,ml,mni,mr,ne,or,pa,sa,sat,sd,ta,te,ur \
  --tier core --batch-size 64 --beams 1
```

Then add benefits and eligibility:

```bash
python scripts/translate-catalog-fast.py \
  --locales as,bn,brx,doi,gu,kn,ks,gom,mai,ml,mni,mr,ne,or,pa,sa,sat,sd,ta,te,ur \
  --tier details --batch-size 64 --beams 1
```

At that point every completed new locale has translated UI, state names, scheme title, description, ministry/tags, benefits and eligibility text and can be exposed in the selector.

Finally fill the longest fields progressively, ideally in small language batches so a Colab quota/disconnect only affects a small slice:

```bash
python scripts/translate-catalog-fast.py --locales mr,bn,gu --tier long --batch-size 64 --beams 1
```

Repeat for the remaining languages. The existing cache is reused, so rerunning a stage skips already translated chunks.

If a 64-item batch runs out of T4 memory, the fast generator automatically splits that batch into smaller sub-batches and continues.

## Runtime format

Each compressed pack contains translated display fields keyed by the stable scheme id. The field order remains backward-compatible:

```text
name, description, benefits, ministry, tags,
applicationProcess, documentsRequired, eligibilityText
```

Empty positions mean “fall back to canonical English”. `LanguageContext` loads the selected locale pack and `localizeScheme()` replaces only non-empty translated fields, so partial staged packs are safe.

## Files to preserve/commit

Completed outputs:

```text
public/i18n/schemes/<locale>.json.gz
public/i18n/generated-ui.json
lib/i18n/generated.js
```

Do **not** commit `.translation-work/` or Hugging Face tokens.

## QA before activating everything

Machine translation is a convenience layer over the English source, not an official translation. Spot-check at least titles, money values, dates, eligibility negation, application instructions, Markdown lists, and RTL layout for each generated locale. Scheme URLs and eligibility calculations must continue using the untouched canonical record.
