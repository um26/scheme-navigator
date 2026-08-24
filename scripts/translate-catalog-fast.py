#!/usr/bin/env python3
"""Fast staged IndicTrans2 generator for Scheme Navigator.

Use this AFTER the current full Hindi run. It keeps the exact same runtime pack
format as translate-catalog.py, so completed Hindi packs remain compatible.

Stages:
  core     name, description, ministry, tags + UI/state names
  details  benefits, eligibility text + UI/state names
  long     application process, required documents + UI/state names
  full     all fields (equivalent coverage to the original generator)

Recommended rollout for the remaining scheduled languages:
  1) core for all remaining locales
  2) details for all remaining locales (locale becomes selectable here)
  3) long progressively

The cache format/key is shared with translate-catalog.py, so prior work is reused.
Greedy decoding (1 beam) is used by default, batches are larger, and CUDA OOMs
are automatically split into smaller sub-batches.
"""
from __future__ import annotations

import argparse
import gzip
import importlib.util
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_SCRIPT = ROOT / "scripts" / "translate-catalog.py"

spec = importlib.util.spec_from_file_location("scheme_i18n_base", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load {BASE_SCRIPT}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

# IndicTrans2's custom decoder uses the legacy tuple KV cache. Recent Transformers
# otherwise wraps it in EncoderDecoderCache, which produces the NoneType cache crash.
from transformers.generation.utils import GenerationMixin
GenerationMixin._supports_default_dynamic_cache = classmethod(lambda cls: False)

FIELD_INDEX = {field: i for i, field in enumerate(base.FIELD_ORDER)}
TIERS = {
    "core": ("name", "description", "ministry", "tags"),
    "details": ("benefits", "eligibilityText"),
    "long": ("applicationProcess", "documentsRequired"),
    "full": tuple(base.FIELD_ORDER),
}
ACTIVATION_FIELDS = tuple(dict.fromkeys(TIERS["core"] + TIERS["details"]))


def format_eta(seconds: float) -> str:
    if seconds <= 0:
        return "0m"
    minutes = int(seconds // 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m"


class FastTranslator(base.Translator):
    def __init__(self, target_lang: str, batch_size: int, beams: int):
        self.beams = beams
        super().__init__(target_lang, batch_size)

    def _translate_once(self, texts: list[str]) -> list[str]:
        batch = self.processor.preprocess_batch(
            texts, src_lang=base.SRC_LANG, tgt_lang=self.target
        )
        inputs = self.tokenizer(
            batch,
            truncation=True,
            padding="longest",
            max_length=256,
            return_tensors="pt",
            return_attention_mask=True,
        ).to(self.device)
        with self.torch.no_grad():
            generated = self.model.generate(
                **inputs,
                use_cache=True,
                min_length=0,
                max_length=256,
                num_beams=self.beams,
                num_return_sequences=1,
            )
        decoded = self.tokenizer.batch_decode(
            generated, skip_special_tokens=True, clean_up_tokenization_spaces=True
        )
        return self.processor.postprocess_batch(decoded, lang=self.target)

    def translate_batch(self, texts: list[str]) -> list[str]:
        try:
            return self._translate_once(texts)
        except RuntimeError as exc:
            message = str(exc).lower()
            if self.device == "cuda" and "out of memory" in message and len(texts) > 1:
                self.torch.cuda.empty_cache()
                midpoint = max(1, len(texts) // 2)
                print(
                    f"[i18n] CUDA OOM at batch {len(texts)}; retrying as "
                    f"{midpoint}+{len(texts) - midpoint}",
                    flush=True,
                )
                return self.translate_batch(texts[:midpoint]) + self.translate_batch(texts[midpoint:])
            raise


def collect_units(schemes, ui_source, states, fields):
    units: set[str] = set()
    for scheme in schemes:
        for field in fields:
            text = base.clean_text(scheme.get(field))
            if not text:
                continue
            for _, payload in base.markdown_parts(text):
                if payload and payload != "\n":
                    units.add(payload)

    # UI and state names are intentionally included in every stage. After the first
    # stage they are cache hits, while this guarantees any independently-run stage
    # still produces a complete UI dictionary.
    for text in ui_source.values():
        if isinstance(text, str) and text.strip():
            protected, _ = base.protect_placeholders(text)
            for chunk in base.split_long_text(protected):
                units.add(chunk)
    for state in states:
        units.add(state)
    return sorted(units)


def translate_units(locale: str, target: str, units: list[str], batch_size: int, beams: int):
    cache = base.load_cache(locale)
    pending = [text for text in units if base.cache_key(target, text) not in cache]
    cached = len(units) - len(pending)
    print(
        f"[i18n:{locale}] {len(units)} tier chunks; {cached} cached; "
        f"{len(pending)} need translation",
        flush=True,
    )
    if not pending:
        return {text: cache[base.cache_key(target, text)] for text in units}

    translator = FastTranslator(target, batch_size, beams)
    started = time.monotonic()
    last_report = 0

    for start in range(0, len(pending), batch_size):
        batch = pending[start:start + batch_size]
        outputs = translator.translate_batch(batch)
        if len(outputs) != len(batch):
            raise RuntimeError(
                f"Model returned {len(outputs)} translations for {len(batch)} inputs"
            )
        rows = []
        for source, output in zip(batch, outputs):
            key = base.cache_key(target, source)
            cache[key] = output
            rows.append((key, output))
        base.append_cache(locale, rows)

        done = min(start + len(batch), len(pending))
        if done - last_report >= max(batch_size * 10, 1) or done == len(pending):
            elapsed = max(time.monotonic() - started, 0.001)
            rate = done / elapsed
            remaining = (len(pending) - done) / max(rate, 0.001)
            print(
                f"[i18n:{locale}] translated {done}/{len(pending)} new chunks "
                f"| {rate:.1f} chunks/s | ETA {format_eta(remaining)}",
                flush=True,
            )
            last_report = done

    return {text: cache[base.cache_key(target, text)] for text in units}


def read_existing_pack(locale: str):
    path = base.PACK_DIR / f"{locale}.json.gz"
    if not path.exists():
        return {"version": 2, "locale": locale, "fields": base.FIELD_ORDER, "schemes": {}}
    try:
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            pack = json.load(handle)
        if pack.get("fields") != base.FIELD_ORDER:
            raise ValueError("field order mismatch")
        pack.setdefault("schemes", {})
        return pack
    except Exception as exc:
        raise RuntimeError(f"Could not merge existing pack {path}: {exc}") from exc


def translated_ui(locale: str, ui_source, translated):
    if locale in base.MANUAL_UI:
        return {}
    ui = {}
    for key, source in ui_source.items():
        if not isinstance(source, str):
            continue
        protected, mapping = base.protect_placeholders(source)
        chunks = base.split_long_text(protected)
        rebuilt = " ".join(translated.get(chunk, chunk) for chunk in chunks)
        ui[key] = base.restore_placeholders(rebuilt, mapping, source)
    return ui


def pack_has_fields(pack, schemes, fields) -> bool:
    """True when every non-empty canonical source field has a translated value."""
    rows = pack.get("schemes", {})
    for scheme in schemes:
        values = rows.get(scheme["id"])
        if not isinstance(values, list):
            return False
        for field in fields:
            source = base.clean_text(scheme.get(field))
            if not source:
                continue
            index = FIELD_INDEX[field]
            if index >= len(values) or not base.clean_text(values[index]):
                return False
    return True


def build_stage(locale, target, schemes, ui_source, states, fields, batch_size, beams, tier):
    units = collect_units(schemes, ui_source, states, fields)
    translated = translate_units(locale, target, units, batch_size, beams)
    pack = read_existing_pack(locale)
    scheme_pack = pack["schemes"]

    for scheme in schemes:
        existing = scheme_pack.get(scheme["id"])
        values = list(existing) if isinstance(existing, list) else [""] * len(base.FIELD_ORDER)
        if len(values) < len(base.FIELD_ORDER):
            values.extend([""] * (len(base.FIELD_ORDER) - len(values)))
        for field in fields:
            source = base.clean_text(scheme.get(field))
            values[FIELD_INDEX[field]] = base.rebuild_text(source, translated) if source else ""
        scheme_pack[scheme["id"]] = values

    pack["version"] = 2
    pack["locale"] = locale
    pack["fields"] = base.FIELD_ORDER
    pack["lastTier"] = tier

    base.PACK_DIR.mkdir(parents=True, exist_ok=True)
    path = base.PACK_DIR / f"{locale}.json.gz"
    with gzip.open(path, "wt", encoding="utf-8", compresslevel=9) as handle:
        json.dump(pack, handle, ensure_ascii=False, separators=(",", ":"))

    ui = translated_ui(locale, ui_source, translated)
    state_map = {state: translated.get(state, state) for state in states}
    ready_for_selector = pack_has_fields(pack, schemes, ACTIVATION_FIELDS)
    print(
        f"[i18n:{locale}] wrote {path} ({path.stat().st_size / 1024 / 1024:.2f} MiB) "
        f"| selector-ready={ready_for_selector}",
        flush=True,
    )
    return ui, state_map, ready_for_selector


def parse_locales(value: str):
    if value.strip().lower() == "all":
        return list(base.LANGUAGES)
    requested = [item.strip() for item in value.split(",") if item.strip()]
    invalid = [item for item in requested if item not in base.LANGUAGES]
    if invalid:
        raise SystemExit(f"Unknown locale(s): {', '.join(invalid)}")
    return requested


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--locales", required=True, help="comma list or 'all'")
    parser.add_argument("--tier", choices=tuple(TIERS), default="core")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--beams", type=int, default=1, help="1=greedy/fast; 5=old quality mode")
    args = parser.parse_args()

    if args.batch_size < 1:
        raise SystemExit("--batch-size must be >= 1")
    if args.beams < 1:
        raise SystemExit("--beams must be >= 1")

    base.ensure_sources()
    schemes = base.load_json(base.SCHEMES_JSON)
    ui_source = base.load_json(base.UI_EN_JSON)
    states = sorted({base.clean_text(s.get("state")) for s in schemes if base.clean_text(s.get("state"))})
    dictionaries, state_maps, ready = base.load_generated_state()
    fields = TIERS[args.tier]

    print(
        f"[i18n] tier={args.tier} fields={','.join(fields)} "
        f"batch={args.batch_size} beams={args.beams}",
        flush=True,
    )

    for locale in parse_locales(args.locales):
        ui, state_map, selector_ready = build_stage(
            locale,
            base.LANGUAGES[locale],
            schemes,
            ui_source,
            states,
            fields,
            args.batch_size,
            args.beams,
            args.tier,
        )
        if ui:
            dictionaries[locale] = ui
        state_maps[locale] = state_map

        # Existing hand-authored UI locales remain available. New locales are only
        # exposed once core + details fields are populated, not after a core-only pass.
        if locale in base.MANUAL_UI or (selector_ready and dictionaries.get(locale)):
            ready.add(locale)
        elif locale not in base.MANUAL_UI:
            ready.discard(locale)

        base.write_generated(dictionaries, state_maps, ready)

    print("\nDone. Packs are mergeable: run the next tier later without losing prior fields.")


if __name__ == "__main__":
    main()
