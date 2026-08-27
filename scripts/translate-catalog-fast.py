#!/usr/bin/env python3
"""Fast staged IndicTrans2 generator for Scheme Navigator.

The UI tier is release-oriented: it translates only missing/changed UI strings,
never rewrites scheme packs, and records the English source hash each locale was
translated from. This makes future feature copy incremental instead of forcing a
full 4,693-scheme translation rerun.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.util
import json
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_SCRIPT = ROOT / "scripts" / "translate-catalog.py"
UI_EXISTING_JSON = ROOT / ".translation-work" / "ui-existing.json"
UI_MANIFEST = ROOT / "public" / "i18n" / "ui-manifest.json"

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
    "ui": tuple(),
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
    return f"{hours}h {minutes:02d}m" if hours else f"{minutes}m"


def ui_source_hash(text: str) -> str:
    return hashlib.sha256(f"ui-v1|{text}".encode("utf-8")).hexdigest()


def aggregate_source_hash(key_hashes: dict[str, str]) -> str:
    payload = json.dumps(sorted(key_hashes.items()), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_ui_manifest():
    if UI_MANIFEST.exists():
        try:
            raw = base.load_json(UI_MANIFEST)
            if isinstance(raw, dict):
                raw.setdefault("version", 1)
                raw.setdefault("model", base.MODEL_NAME)
                raw.setdefault("keys", {})
                raw.setdefault("locales", {})
                return raw, True
        except Exception:
            pass
    return {"version": 1, "model": base.MODEL_NAME, "keys": {}, "locales": {}}, False


def write_ui_manifest(manifest, key_hashes, changed: bool):
    UI_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    manifest["version"] = 1
    manifest["model"] = base.MODEL_NAME
    if changed or not manifest.get("generatedAt"):
        manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["sourceHash"] = aggregate_source_hash(key_hashes)
    manifest["keys"] = key_hashes
    UI_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[i18n] wrote UI freshness manifest -> {UI_MANIFEST}")


class FastTranslator(base.Translator):
    # The model is multilingual. Loading it once and only switching the target code
    # makes 22-locale UI refreshes dramatically cheaper on CPU/GPU runners.
    _shared_runtime = None

    def __init__(self, target_lang: str, batch_size: int, beams: int):
        self.beams = beams
        self.target = target_lang
        self.batch_size = batch_size
        if FastTranslator._shared_runtime is None:
            super().__init__(target_lang, batch_size)
            FastTranslator._shared_runtime = (
                self.torch,
                self.device,
                self.tokenizer,
                self.model,
                self.processor,
            )
        else:
            (
                self.torch,
                self.device,
                self.tokenizer,
                self.model,
                self.processor,
            ) = FastTranslator._shared_runtime
            print(f"[i18n] reusing loaded IndicTrans2 model for {target_lang}", flush=True)
        self.target = target_lang
        self.batch_size = batch_size

    def _translate_once(self, texts: list[str]) -> list[str]:
        batch = self.processor.preprocess_batch(texts, src_lang=base.SRC_LANG, tgt_lang=self.target)
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
    for text in ui_source.values():
        if isinstance(text, str) and text.strip():
            protected, _ = base.protect_placeholders(text)
            units.update(base.split_long_text(protected))
    for state in states:
        units.add(state)
    return sorted(units)


def collect_ui_units(ui_source: dict[str, str], keys: list[str], missing_states: list[str]):
    units: set[str] = set(missing_states)
    for key in keys:
        source = ui_source.get(key)
        if not isinstance(source, str) or not source.strip():
            continue
        protected, _ = base.protect_placeholders(source)
        units.update(base.split_long_text(protected))
    return sorted(units)


def translate_units(locale: str, target: str, units: list[str], batch_size: int, beams: int):
    if not units:
        return {}
    cache = base.load_cache(locale)
    pending = [text for text in units if base.cache_key(target, text) not in cache]
    cached = len(units) - len(pending)
    print(
        f"[i18n:{locale}] {len(units)} chunks; {cached} cached; {len(pending)} need translation",
        flush=True,
    )
    if pending:
        translator = FastTranslator(target, batch_size, beams)
        started = time.monotonic()
        last_report = 0
        for start in range(0, len(pending), batch_size):
            batch = pending[start:start + batch_size]
            outputs = translator.translate_batch(batch)
            if len(outputs) != len(batch):
                raise RuntimeError(f"Model returned {len(outputs)} translations for {len(batch)} inputs")
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


def rebuild_ui_value(source: str, translated: dict[str, str]) -> str:
    protected, mapping = base.protect_placeholders(source)
    chunks = base.split_long_text(protected)
    rebuilt = " ".join(translated.get(chunk, chunk) for chunk in chunks)
    return base.restore_placeholders(rebuilt, mapping, source)


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
    return {
        key: rebuild_ui_value(source, translated)
        for key, source in ui_source.items()
        if isinstance(source, str)
    }


def pack_has_fields(pack, schemes, fields) -> bool:
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


def build_ui_only(
    locale,
    target,
    ui_source,
    states,
    batch_size,
    beams,
    existing_ui,
    existing_state_map,
    manifest,
    bootstrap_manifest,
):
    key_hashes = {
        key: ui_source_hash(source)
        for key, source in ui_source.items()
        if isinstance(source, str) and source.strip()
    }
    locale_manifest = dict(manifest.get("locales", {}).get(locale, {}))
    existing_ui = dict(existing_ui or {})
    existing_state_map = dict(existing_state_map or {})

    pending_keys = []
    for key, expected_hash in key_hashes.items():
        current = base.clean_text(existing_ui.get(key))
        if not current:
            pending_keys.append(key)
        elif not bootstrap_manifest and locale_manifest.get(key) != expected_hash:
            pending_keys.append(key)

    missing_states = [state for state in states if not base.clean_text(existing_state_map.get(state))]
    print(
        f"[i18n:{locale}] UI delta: {len(pending_keys)} changed/missing key(s), "
        f"{len(missing_states)} missing state name(s)",
        flush=True,
    )

    units = collect_ui_units(ui_source, pending_keys, missing_states)
    translated = translate_units(locale, target, units, batch_size, beams)

    ui = {
        key: existing_ui[key]
        for key in key_hashes
        if base.clean_text(existing_ui.get(key))
    }
    for key in pending_keys:
        ui[key] = rebuild_ui_value(ui_source[key], translated)

    state_map = {
        state: existing_state_map[state]
        for state in states
        if base.clean_text(existing_state_map.get(state))
    }
    for state in missing_states:
        state_map[state] = translated.get(state, state)

    locale_manifest = {key: expected_hash for key, expected_hash in key_hashes.items() if base.clean_text(ui.get(key))}
    manifest.setdefault("locales", {})[locale] = locale_manifest
    changed = bool(pending_keys or missing_states) or bootstrap_manifest
    return ui, state_map, key_hashes, changed


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

    pack.update({"version": 2, "locale": locale, "fields": base.FIELD_ORDER, "lastTier": tier})
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

    if args.batch_size < 1 or args.beams < 1:
        raise SystemExit("--batch-size and --beams must be >= 1")

    base.ensure_sources()
    schemes = base.load_json(base.SCHEMES_JSON)
    ui_source = base.load_json(base.UI_EN_JSON)
    existing_explicit = base.load_json(UI_EXISTING_JSON) if UI_EXISTING_JSON.exists() else {}
    states = sorted({base.clean_text(s.get("state")) for s in schemes if base.clean_text(s.get("state"))})
    dictionaries, state_maps, ready = base.load_generated_state()
    fields = TIERS[args.tier]

    print(
        f"[i18n] tier={args.tier} fields={','.join(fields) if fields else '(UI only)'} "
        f"batch={args.batch_size} beams={args.beams}",
        flush=True,
    )

    requested = parse_locales(args.locales)
    if args.tier == "ui":
        manifest, manifest_exists = load_ui_manifest()
        key_hashes = {}
        manifest_changed = not manifest_exists
        for locale in requested:
            seed = {
                **(existing_explicit.get(locale) or {}),
                **(dictionaries.get(locale) or {}),
            }
            ui, state_map, key_hashes, locale_changed = build_ui_only(
                locale,
                base.LANGUAGES[locale],
                ui_source,
                states,
                args.batch_size,
                args.beams,
                seed,
                state_maps.get(locale) or {},
                manifest,
                bootstrap_manifest=not manifest_exists,
            )
            dictionaries[locale] = ui
            state_maps[locale] = state_map
            manifest_changed = manifest_changed or locale_changed
            # UI refreshes never change selector readiness.
            base.write_generated(dictionaries, state_maps, ready)
        write_ui_manifest(manifest, key_hashes, manifest_changed)
        print("\nDone. UI refresh was incremental; scheme gzip packs were not touched.")
        return

    for locale in requested:
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
        if locale in base.MANUAL_UI or (selector_ready and dictionaries.get(locale)):
            ready.add(locale)
        elif locale not in base.MANUAL_UI:
            ready.discard(locale)
        base.write_generated(dictionaries, state_maps, ready)

    print("\nDone. Packs are mergeable: run the next tier later without losing prior fields.")


if __name__ == "__main__":
    main()
