"use client";

import { useEffect, useRef, useState } from "react";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { localizeState } from "../lib/i18n/entities";
import { localeDirection } from "../lib/i18n/config";

const W = 1080;
const H = 1350;

const CANVAS_FONTS = {
  as: "Noto Sans Bengali", bn: "Noto Sans Bengali",
  brx: "Noto Sans Devanagari", doi: "Noto Sans Devanagari", hi: "Noto Sans Devanagari", gom: "Noto Sans Devanagari", mai: "Noto Sans Devanagari", mr: "Noto Sans Devanagari", ne: "Noto Sans Devanagari", sa: "Noto Sans Devanagari",
  gu: "Noto Sans Gujarati", kn: "Noto Sans Kannada", ks: "Noto Sans Arabic", ml: "Noto Sans Malayalam", mni: "Noto Sans Meetei Mayek", or: "Noto Sans Oriya", pa: "Noto Sans Gurmukhi", sat: "Noto Sans Ol Chiki", sd: "Noto Sans Arabic", ta: "Noto Sans Tamil", te: "Noto Sans Telugu", ur: "Noto Sans Arabic",
};

async function ensureFontsLoaded(locale) {
  try {
    const font = CANVAS_FONTS[locale] || "Hind";
    await Promise.all([document.fonts.load(`700 54px "${font}"`), document.fonts.load(`600 28px "${font}"`), document.fonts.load(`400 24px "${font}"`)]);
    await document.fonts.ready;
  } catch {}
}

function drawJaliStrip(ctx, x, y, width, color) {
  const step = 28;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
  for (let px = x; px < x + width; px += step * 2) {
    ctx.beginPath(); ctx.moveTo(px, y + 10); ctx.lineTo(px + step, y); ctx.lineTo(px + step * 2, y + 10); ctx.lineTo(px + step, y + 20); ctx.closePath(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines, rtl = false) {
  const words = String(text || "").split(/\s+/);
  let line = "", lines = 0;
  ctx.textAlign = rtl ? "right" : "left";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y); line = word; y += lineHeight; lines++;
      if (lines >= maxLines - 1) { ctx.fillText(line + "…", x, y); return y; }
    } else line = test;
  }
  ctx.fillText(line, x, y);
  return y;
}

async function renderCard(canvas, matches, profile, locale, t, localizeSchemeContent) {
  await ensureFontsLoaded(locale);
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  const rtl = localeDirection(locale) === "rtl";
  const font = CANVAS_FONTS[locale] || "Hind";
  const left = 60, right = W - 60, textX = rtl ? right : left;

  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.fillStyle = "#F4EDDD"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#D8CBA8"; ctx.lineWidth = 3; ctx.strokeRect(24, 24, W - 48, H - 48);

  ctx.fillStyle = "#C46F14"; ctx.font = `600 28px "${font}", sans-serif`; ctx.textBaseline = "alphabetic"; ctx.textAlign = rtl ? "right" : "left";
  ctx.fillText("SCHEME NAVIGATOR", textX, 110);
  ctx.fillStyle = "#1F2A3C"; ctx.font = `700 54px "${font}", sans-serif`;
  wrapText(ctx, t("share_title"), textX, 195, W - 120, 64, 2, rtl);
  drawJaliStrip(ctx, 60, 300, W - 120, "#C46F14");

  ctx.font = `400 24px "${font}", sans-serif`; ctx.fillStyle = "#2A2118";
  const statParts = [];
  if (profile?.state) statParts.push(localizeState(locale, profile.state));
  statParts.push(`${matches.length} ${t("results_schemes_passed")}`);
  wrapText(ctx, statParts.join(" · "), textX, 350, W - 120, 30, 2, rtl);

  let y = 400;
  const cardH = 165;
  const visible = matches.slice(0, 5).map(localizeSchemeContent);
  for (let i = 0; i < visible.length; i++) {
    const display = visible[i];
    const canonical = matches[i];
    ctx.fillStyle = "#FFFFFF"; ctx.globalAlpha = 0.7; ctx.fillRect(60, y, W - 120, cardH - 20); ctx.globalAlpha = 1;
    ctx.strokeStyle = "#D8CBA8"; ctx.lineWidth = 1.5; ctx.strokeRect(60, y, W - 120, cardH - 20);
    const innerX = rtl ? W - 84 : 84;
    ctx.fillStyle = "#1F2A3C"; ctx.font = `700 28px "${font}", sans-serif`; wrapText(ctx, display.name, innerX, y + 42, W - 168, 34, 2, rtl);
    ctx.fillStyle = "#1F4B3F"; ctx.font = `600 20px "${font}", sans-serif`;
    const level = canonical.level === "Central" ? t("browse_central") : t("browse_state");
    const tag = `${level}${canonical.state ? " · " + localizeState(locale, canonical.state) : ""}`;
    ctx.textAlign = rtl ? "right" : "left"; ctx.fillText(tag, innerX, y + 105);
    if (display.benefits) { ctx.fillStyle = "#7A6F5D"; ctx.font = `400 20px "${font}", sans-serif`; wrapText(ctx, stripMarkdown(display.benefits), innerX, y + 135, W - 168, 25, 1, rtl); }
    y += cardH;
  }

  if (matches.length > visible.length) { ctx.fillStyle = "#7A6F5D"; ctx.font = `400 22px "${font}", sans-serif`; ctx.textAlign = rtl ? "right" : "left"; ctx.fillText(`+ ${matches.length - visible.length}`, textX, y + 20); }

  drawJaliStrip(ctx, 60, H - 130, W - 120, "#1F4B3F");
  ctx.fillStyle = "#7A6F5D"; ctx.font = `400 22px "${font}", sans-serif`;
  ctx.textAlign = "left"; ctx.direction = "ltr"; ctx.fillText("scheme-navigator-ten.vercel.app", 60, H - 70);
  ctx.textAlign = "right"; ctx.direction = rtl ? "rtl" : "ltr"; ctx.fillText(t("footer_credit"), W - 60, H - 70);
  ctx.textAlign = "left"; ctx.direction = "ltr";
}

export default function ShareCard({ matches, profile, onClose }) {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (canvasRef.current) renderCard(canvasRef.current, matches, profile, locale, t, localizeSchemeContent).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [matches, profile, locale, t, localizeSchemeContent]);

  function download() {
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "my-eligible-schemes.png"; a.click(); URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], "my-eligible-schemes.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: t("share_title") }); } catch {}
      } else download();
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-khadi rounded-xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-display text-lg text-ledger">{t("share_title")}</h3><button type="button" onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button></div>
        <div className="border border-borderc rounded-lg overflow-hidden bg-white/40"><canvas ref={canvasRef} className="w-full h-auto block" /></div>
        <div className="mt-4 flex gap-2"><button type="button" onClick={share} disabled={!ready} className="flex-1 px-4 py-2.5 rounded-lg bg-bottle text-white font-body font-semibold hover:bg-bottle-light transition-colors disabled:opacity-50">{t("share_button_share")}</button><button type="button" onClick={download} disabled={!ready} className="flex-1 px-4 py-2.5 rounded-lg border border-borderc bg-white/60 font-body font-semibold hover:bg-white transition-colors disabled:opacity-50">{t("share_button_download")}</button></div>
      </div>
    </div>
  );
}
