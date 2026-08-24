#!/usr/bin/env python3
"""Generate static Scheme Navigator language packs with AI4Bharat IndicTrans2.

AUTHORING TOOL ONLY. Vercel never runs this script and the production site never
calls a translation API. Run it on a local GPU or a free Colab GPU, commit the
resulting public/i18n + lib/i18n/generated.js files, and normal Vercel builds only
serve those static artifacts.

Example:
  python scripts/translate-catalog.py --locales hi,mr,bn,gu
  python scripts/translate-catalog.py --locales all

The cache under .translation-work/cache is append-only/resumable. If Colab stops,
copy that directory back and rerun the same command; already translated chunks are
not sent through the model again.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".translation-work"
CACHE_DIR = WORK / "cache"
PUBLIC_I18N = ROOT / "public" / "i18n"
PACK_DIR = PUBLIC_I18N / "schemes"
GENERATED_JS = ROOT / "lib" / "i18n" / "generated.js"
GENERATED_UI_JSON = PUBLIC_I18N / "generated-ui.json"
SCHEMES_JSON = ROOT / "public" / "data" / "schemes.json"
UI_EN_JSON = WORK / "ui-en.json"

MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
SRC_LANG = "eng_Latn"
FIELD_ORDER = [
    "name", "description", "benefits", "ministry", "tags",
    "applicationProcess", "documentsRequired", "eligibilityText",
]

# 22 Eighth Schedule languages. English remains the canonical source language and
# is therefore not translated into a separate pack.
LANGUAGES = {
    "as": "asm_Beng", "bn": "ben_Beng", "brx": "brx_Deva", "doi": "doi_Deva",
    "gu": "guj_Gujr", "hi": "hin_Deva", "kn": "kan_Knda", "ks": "kas_Arab",
    "gom": "gom_Deva", "mai": "mai_Deva", "ml": "mal_Mlym", "mni": "mni_Mtei",
    "mr": "mar_Deva", "ne": "npi_Deva", "or": "ory_Orya", "pa": "pan_Guru",
    "sa": "san_Deva", "sat": "sat_Olck", "sd": "snd_Arab", "ta": "tam_Taml",
    "te": "tel_Telu", "ur": "urd_Arab",
}
MANUAL_UI = {"hi", "te", "ta"}

# Protect dictionary placeholders such as {n}/{region}. IndicTrans2 can otherwise
# translate/remove their names, breaking runtime interpolation.
PLACEHOLDER_RE = re.compile(r"\{[A-Za-z0-9_]+\}")
MARKDOWN_PREFIX_RE = re.compile(r"^(\s*(?:[-*+]\s+|\d+[.)]\s+|>\s+|#{1,6}\s+))")


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def ensure_sources() -> None:
    if not SCHEMES_JSON.exists():
        print("[i18n] canonical scheme JSON missing; generating it first")
        if not (ROOT / "node_modules").exists():
            run(["npm", "install"])
        run(["node", "scripts/build-schemes.mjs"])
    run(["node", "scripts/export-ui-source.mjs"])


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def clean_text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def protect_placeholders(text: str):
    mapping = {}
    def repl(match):
        token = f"ZXPLACEHOLDER{len(mapping)}XZ"
        mapping[token] = match.group(0)
        return token
    return PLACEHOLDER_RE.sub(repl, text), mapping


def restore_placeholders(text: str, mapping: dict[str, str], original: str) -> str:
    restored = text
    for token, placeholder in mapping.items():
        restored = restored.replace(token, placeholder)
    # If the model damaged a sentinel, English is safer than a broken template.
    if any(p not in restored for p in mapping.values()):
        return original
    return restored


def split_long_text(text: str, max_chars: int = 650) -> list[str]:
    """Chunk conservatively so the 256-token distilled model doesn't truncate fields."""
    text = clean_text(text)
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    parts = re.split(r"(?<=[.!?।])\s+|\n{2,}", text)
    chunks, current = [], ""
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(part) > max_chars:
            # Last-resort whitespace packing for very long bullet/paragraph lines.
            words = part.split()
            mini = ""
            for word in words:
                candidate = f"{mini} {word}".strip()
                if mini and len(candidate) > max_chars:
                    chunks.append(mini)
                    mini = word
                else:
                    mini = candidate
            if mini:
                if current:
                    chunks.append(current)
                    current = ""
                chunks.append(mini)
            continue
        candidate = f"{current} {part}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = part
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks or [text]


def markdown_parts(text: str) -> list[tuple[str, str]]:
    """Preserve common list/header prefixes while translating line content."""
    out = []
    for line in text.splitlines(keepends=True):
        newline = "\n" if line.endswith("\n") else ""
        body = line[:-1] if newline else line
        match = MARKDOWN_PREFIX_RE.match(body)
        prefix = match.group(1) if match else ""
        payload = body[len(prefix):]
        if payload.strip():
            chunks = split_long_text(payload)
            for i, chunk in enumerate(chunks):
                out.append((prefix if i == 0 else "", chunk))
                if i < len(chunks) - 1:
                    out.append(("", "\n"))
        else:
            out.append((prefix, ""))
        if newline:
            out.append(("", "\n"))
    return out


def cache_key(target: str, text: str) -> str:
    return hashlib.sha256(f"v2|{MODEL_NAME}|{target}|{text}".encode()).hexdigest()


def load_cache(locale: str) -> dict[str, str]:
    path = CACHE_DIR / f"{locale}.jsonl"
    data = {}
    if not path.exists():
        return data
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                row = json.loads(line)
                data[row["k"]] = row["v"]
            except Exception:
                continue
    return data


def append_cache(locale: str, rows: Iterable[tuple[str, str]]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with (CACHE_DIR / f"{locale}.jsonl").open("a", encoding="utf-8") as f:
        for key, value in rows:
            f.write(json.dumps({"k": key, "v": value}, ensure_ascii=False) + "\n")


class Translator:
    def __init__(self, target_lang: str, batch_size: int):
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        from IndicTransToolkit.processor import IndicProcessor

        self.torch = torch
        self.target = target_lang
        self.batch_size = batch_size
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if self.device == "cuda" else torch.float32
        print(f"[i18n] loading {MODEL_NAME} on {self.device} ({dtype})")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            MODEL_NAME, trust_remote_code=True, torch_dtype=dtype
        ).to(self.device)
        self.model.eval()
        self.processor = IndicProcessor(inference=True)

    def translate_batch(self, texts: list[str]) -> list[str]:
        batch = self.processor.preprocess_batch(
            texts, src_lang=SRC_LANG, tgt_lang=self.target
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
                num_beams=5,
                num_return_sequences=1,
            )
        decoded = self.tokenizer.batch_decode(
            generated, skip_special_tokens=True, clean_up_tokenization_spaces=True
        )
        return self.processor.postprocess_batch(decoded, lang=self.target)


def collect_translation_units(schemes, ui_source, states):
    units: set[str] = set()
    for scheme in schemes:
        for field in FIELD_ORDER:
            text = clean_text(scheme.get(field))
            if not text:
                continue
            for _, payload in markdown_parts(text):
                if payload and payload != "\n":
                    units.add(payload)
    for text in ui_source.values():
        if isinstance(text, str) and text.strip():
            protected, _ = protect_placeholders(text)
            for chunk in split_long_text(protected):
                units.add(chunk)
    for state in states:
        units.add(state)
    return sorted(units)


def translate_units(locale: str, target: str, units: list[str], batch_size: int):
    cache = load_cache(locale)
    pending = [text for text in units if cache_key(target, text) not in cache]
    print(f"[i18n:{locale}] {len(units)} unique chunks; {len(pending)} need translation")
    if not pending:
        return {text: cache[cache_key(target, text)] for text in units}

    translator = Translator(target, batch_size)
    for start in range(0, len(pending), batch_size):
        batch = pending[start:start + batch_size]
        translated = translator.translate_batch(batch)
        rows = []
        for source, output in zip(batch, translated):
            key = cache_key(target, source)
            cache[key] = output
            rows.append((key, output))
        append_cache(locale, rows)
        done = min(start + batch_size, len(pending))
        if done % max(batch_size * 20, 1) == 0 or done == len(pending):
            print(f"[i18n:{locale}] translated {done}/{len(pending)} new chunks", flush=True)
    return {text: cache[cache_key(target, text)] for text in units}


def rebuild_text(text: str, translated: dict[str, str]) -> str:
    if not clean_text(text):
        return ""
    out = []
    for prefix, payload in markdown_parts(text):
        if payload == "\n":
            out.append("\n")
        elif payload:
            out.append(prefix + translated.get(payload, payload))
        else:
            out.append(prefix)
    return "".join(out).strip()


def build_locale(locale: str, target: str, schemes, ui_source, states, batch_size: int):
    units = collect_translation_units(schemes, ui_source, states)
    translated = translate_units(locale, target, units, batch_size)

    scheme_pack = {}
    for scheme in schemes:
        values = []
        for field in FIELD_ORDER:
            source = clean_text(scheme.get(field))
            values.append(rebuild_text(source, translated) if source else "")
        scheme_pack[scheme["id"]] = values

    # Full-sentence UI strings and placeholders are translated as their own chunks.
    ui = {}
    if locale not in MANUAL_UI:
        for key, source in ui_source.items():
            if not isinstance(source, str):
                continue
            protected, mapping = protect_placeholders(source)
            chunks = split_long_text(protected)
            rebuilt = " ".join(translated.get(chunk, chunk) for chunk in chunks)
            ui[key] = restore_placeholders(rebuilt, mapping, source)

    state_map = {state: translated.get(state, state) for state in states}

    PACK_DIR.mkdir(parents=True, exist_ok=True)
    pack_path = PACK_DIR / f"{locale}.json.gz"
    payload = {
        "version": 1,
        "locale": locale,
        "fields": FIELD_ORDER,
        "schemes": scheme_pack,
    }
    with gzip.open(pack_path, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[i18n:{locale}] wrote {pack_path} ({pack_path.stat().st_size / 1024 / 1024:.2f} MiB)")
    return ui, state_map


def load_generated_state():
    if GENERATED_UI_JSON.exists():
        try:
            raw = load_json(GENERATED_UI_JSON)
            return raw.get("dictionaries", {}), raw.get("states", {}), set(raw.get("ready", []))
        except Exception:
            pass
    return {}, {}, set()


def write_generated(dictionaries, states, ready):
    PUBLIC_I18N.mkdir(parents=True, exist_ok=True)
    meta = {
        "version": 1,
        "ready": sorted(ready),
        "dictionaries": dictionaries,
        "states": states,
    }
    with GENERATED_UI_JSON.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    # Runtime JS avoids any Node fs reads and is small (UI/state strings only).
    js = (
        "// AUTO-GENERATED by scripts/translate-catalog.py. Do not hand-edit.\n"
        f"export const GENERATED_READY_LOCALES = {json.dumps(sorted(ready), ensure_ascii=False)};\n"
        f"export const GENERATED_DICTIONARIES = {json.dumps(dictionaries, ensure_ascii=False, separators=(',', ':'))};\n"
        f"export const GENERATED_STATE_NAMES = {json.dumps(states, ensure_ascii=False, separators=(',', ':'))};\n"
    )
    GENERATED_JS.write_text(js, encoding="utf-8")
    print(f"[i18n] activated generated locales: {', '.join(sorted(ready)) or '(none)'}")


def parse_locales(value: str) -> list[str]:
    if value.strip().lower() == "all":
        return list(LANGUAGES)
    requested = [x.strip() for x in value.split(",") if x.strip()]
    invalid = [x for x in requested if x not in LANGUAGES]
    if invalid:
        raise SystemExit(f"Unknown locale(s): {', '.join(invalid)}")
    return requested


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--locales", default="hi,mr,bn,gu", help="comma list or 'all'")
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    ensure_sources()
    schemes = load_json(SCHEMES_JSON)
    ui_source = load_json(UI_EN_JSON)
    states = sorted({clean_text(s.get("state")) for s in schemes if clean_text(s.get("state"))})
    dictionaries, state_maps, ready = load_generated_state()

    for locale in parse_locales(args.locales):
        ui, state_map = build_locale(
            locale, LANGUAGES[locale], schemes, ui_source, states, args.batch_size
        )
        if ui:
            dictionaries[locale] = ui
        state_maps[locale] = state_map
        if locale in MANUAL_UI or dictionaries.get(locale):
            ready.add(locale)
        # Persist after every locale so an interrupted multi-language run still
        # leaves completed packs ready to commit.
        write_generated(dictionaries, state_maps, ready)

    print("\nDone. Commit public/i18n/ and lib/i18n/generated.js, then deploy normally.")


if __name__ == "__main__":
    main()
