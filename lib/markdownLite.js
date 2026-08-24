// lib/markdownLite.js
//
// The source dataset's benefit/description text is messy scraped markdown, and in a
// meaningful fraction of records it's HTML-entity-encoded multiple times over (e.g.
// "&amp;amp;T" for "&T"). This is a real data-quality issue in the upstream scrape,
// not something introduced here — decodeEntities() below repeatedly decodes until
// stable (bounded) rather than assuming a single encoding pass.
//
// Pure text-in/text-or-blocks-out helpers, no JSX here (see components/RichText.js
// for rendering) so this stays easy to unit-test in isolation.

const ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(text) {
  if (!text) return "";
  let prev = text;
  for (let i = 0; i < 4; i++) {
    const next = prev.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => ENTITY_MAP[m]);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function normalizeBreaks(text) {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

// Strips all markdown/HTML markup down to plain text — used for card previews.
export function stripMarkdown(text) {
  if (!text) return "";
  let t = decodeEntities(text);
  t = normalizeBreaks(t);
  t = t.replace(/\*{1,4}/g, "");
  t = t.replace(/^>\s?/gm, "");
  t = t.replace(/^#{1,6}\s*/gm, "");
  t = t.replace(/^[-*]\s+/gm, "");
  t = t.replace(/^\d+\.\s+/gm, "");
  t = t.replace(/\n{2,}/g, " ");
  t = t.replace(/\n/g, " ");
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}

// Splits into typed blocks for structured rendering. Each block: { type, lines }
// type is one of: "quote" | "bullets" | "paragraph"
export function parseBlocks(text) {
  if (!text) return [];
  let t = decodeEntities(text);
  t = normalizeBreaks(t);
  const rawBlocks = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  const blocks = [];
  for (const raw of rawBlocks) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.every((l) => l.startsWith(">"))) {
      blocks.push({ type: "quote", lines: lines.map((l) => l.replace(/^>\s?/, "")) });
      continue;
    }
    if (lines.some((l) => /^[-*]\s+/.test(l) || /^\d+\.\s+/.test(l))) {
      blocks.push({
        type: "bullets",
        lines: lines.map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")),
      });
      continue;
    }
    blocks.push({ type: "paragraph", lines });
  }
  return blocks;
}

// Splits a line into inline segments for **bold** / *italic* rendering.
// Returns array of { text, bold, italic }.
export function parseInline(line) {
  const segments = [];
  // First split on bold (2+ asterisks), forgiving of malformed runs like "****x***"
  const boldSplit = line.split(/\*{2,}/);
  boldSplit.forEach((chunk, i) => {
    const isBold = i % 2 === 1;
    if (chunk === "") return;
    // then split each chunk on single-asterisk italics
    const italicSplit = chunk.split(/\*/);
    italicSplit.forEach((sub, j) => {
      const isItalic = j % 2 === 1;
      if (sub === "") return;
      segments.push({ text: sub, bold: isBold, italic: isItalic });
    });
  });
  return segments.length ? segments : [{ text: line, bold: false, italic: false }];
}
