// Conservative i18n linter for newly-added UI code.
// It compares against the last production baseline when available, so a hard-coded
// string cannot hide just because it was introduced several commits before release.
import { execFileSync } from "node:child_process";

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

function canRevParse(ref) {
  try {
    git(["rev-parse", "--verify", ref]);
    return true;
  } catch {
    return false;
  }
}

function chooseBase() {
  if (process.env.I18N_BASE_REF && canRevParse(process.env.I18N_BASE_REF)) return process.env.I18N_BASE_REF;

  // Persistent release baseline: this branch is moved only after a verified
  // production deployment. That makes the scan cover the entire development batch.
  for (const ref of ["origin/i18n/production-baseline", "i18n/production-baseline"]) {
    if (canRevParse(ref)) return ref;
  }

  let branch = "";
  try { branch = git(["rev-parse", "--abbrev-ref", "HEAD"]); } catch {}
  if (branch !== "main" && canRevParse("origin/main")) return "origin/main";
  if (canRevParse("HEAD^")) return "HEAD^";
  return null;
}

function looksHuman(text) {
  const value = String(text || "").trim();
  if (!value || value.length < 3) return false;
  if (/^https?:\/\//i.test(value) || /^\//.test(value)) return false;
  if (/^[A-Z0-9_./:+-]{2,10}$/.test(value)) return false; // SC, OBC, URLs/fragments, etc.
  if (/^[✓×○★☆▾←→·•…❤\s]+$/.test(value)) return false;
  if (/^(Scheme Navigator|SCHEME NAVIGATOR|BinaryBots)$/i.test(value)) return false;
  if (/^[a-z0-9_-]+(?:\s+[a-z0-9_:/\[\].%-]+){2,}$/i.test(value) && /(?:bg-|text-|px-|py-|mt-|rounded|border|flex|grid)/.test(value)) return false;
  const words = value.match(/[A-Za-z][A-Za-z’'-]*/g) || [];
  return words.length >= 2 || (words.length === 1 && value.length >= 12);
}

function naturalStrings(fragment) {
  const found = [];
  for (const match of fragment.matchAll(/["'`]([^"'`\n]+)["'`]/g)) {
    if (looksHuman(match[1])) found.push(match[1]);
  }
  return found;
}

const base = chooseBase();
if (!base) {
  console.warn("[i18n-lint] git history unavailable; skipping added-line hard-coded-copy scan.");
  process.exit(0);
}

let diff = "";
try {
  diff = git(["diff", "--unified=0", `${base}...HEAD`, "--", "app", "components"]);
} catch {
  try { diff = git(["diff", "--unified=0", base, "HEAD", "--", "app", "components"]); }
  catch {
    console.warn(`[i18n-lint] could not diff against ${base}; skipping scan.`);
    process.exit(0);
  }
}

let currentFile = null;
let currentLine = 0;
const violations = [];

for (const raw of diff.split("\n")) {
  if (raw.startsWith("+++ b/")) {
    currentFile = raw.slice(6);
    currentLine = 0;
    continue;
  }
  const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
  if (hunk) {
    currentLine = Number(hunk[1]);
    continue;
  }
  if (!currentFile || raw.startsWith("---") || raw.startsWith("+++")) continue;

  if (raw.startsWith("+")) {
    const line = raw.slice(1);
    const lineNo = currentLine;
    currentLine += 1;
    if (line.includes("i18n-ignore")) continue;

    const candidates = [];

    // Direct JSX text: <p>Hello world</p>
    for (const match of line.matchAll(/>\s*([^<{][^<>{}]*)\s*</g)) {
      if (looksHuman(match[1])) candidates.push(match[1].trim());
    }

    // Literal accessibility/placeholder copy, including ternary expressions.
    for (const attr of ["aria-label", "placeholder", "title", "alt"]) {
      const index = line.indexOf(`${attr}=`);
      if (index >= 0) candidates.push(...naturalStrings(line.slice(index)));
    }

    // Common user-facing config objects should carry *Key values instead of labels.
    if (/\b(?:label|title|subtitle|description|hint|message|emptyText)\s*:/.test(line)) {
      candidates.push(...naturalStrings(line));
    }

    for (const text of new Set(candidates)) {
      violations.push({ file: currentFile, line: lineNo, text });
    }
  } else if (!raw.startsWith("-")) {
    currentLine += 1;
  }
}

if (violations.length) {
  console.error(`[i18n-lint] ${violations.length} newly-added hard-coded UI string(s) found since ${base}.`);
  for (const item of violations.slice(0, 40)) {
    console.error(`  ${item.file}:${item.line}  ${JSON.stringify(item.text)}`);
  }
  console.error("\nMove user-visible copy into the English i18n source and render it with t(\"key\").");
  console.error("Use // i18n-ignore only for intentional non-translatable brand/technical text.");
  process.exit(1);
}

console.log(`[i18n-lint] OK — no newly-added hard-coded UI copy since ${base}.`);
