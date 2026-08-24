"use client";

import { useEffect, useRef, useState } from "react";
import { stripMarkdown } from "../lib/markdownLite";
import { useLanguage } from "../lib/i18n/LanguageContext";

const W = 1080;
const H = 1350;

async function ensureFontsLoaded() {
  try {
    await Promise.all([
      document.fonts.load('700 64px "Yatra One"'),
      document.fonts.load('600 28px "Hind"'),
      document.fonts.load('400 26px "Hind"'),
      document.fonts.load('700 30px "Hind"'),
    ]);
    await document.fonts.ready;
  } catch {
    // best-effort — canvas will fall back to system fonts if this fails
  }
}

function drawJaliStrip(ctx, x, y, width, color) {
  const step = 28;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  for (let px = x; px < x + width; px += step * 2) {
    ctx.beginPath();
    ctx.moveTo(px, y + 10);
    ctx.lineTo(px + step, y);
    ctx.lineTo(px + step * 2, y + 10);
    ctx.lineTo(px + step, y + 20);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines++;
      if (lines >= maxLines - 1) {
        ctx.fillText(line + "…", x, y);
        return y;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y;
}

async function renderCard(canvas, matches, profile) {
  await ensureFontsLoaded();
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;

  // background
  ctx.fillStyle = "#F4EDDD";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#D8CBA8";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // header
  ctx.fillStyle = "#C46F14";
  ctx.font = '600 28px "Hind", sans-serif';
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SCHEME NAVIGATOR", 60, 110);

  ctx.fillStyle = "#1F2A3C";
  ctx.font = '700 62px "Yatra One", cursive';
  ctx.fillText("My Eligible", 60, 195);
  ctx.fillText("Schemes", 60, 265);

  drawJaliStrip(ctx, 60, 300, W - 120, "#C46F14");

  // stat strip
  ctx.font = '400 26px "Hind", sans-serif';
  ctx.fillStyle = "#2A2118";
  const statParts = [];
  if (profile?.state) statParts.push(profile.state);
  statParts.push(`${matches.length} scheme${matches.length === 1 ? "" : "s"} matched`);
  ctx.fillText(statParts.join("  ·  "), 60, 350);

  // scheme cards
  let y = 400;
  const cardH = 165;
  const visibleMatches = matches.slice(0, 5);
  for (const scheme of visibleMatches) {
    ctx.fillStyle = "#FFFFFF";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(60, y, W - 120, cardH - 20);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#D8CBA8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, y, W - 120, cardH - 20);

    ctx.fillStyle = "#1F2A3C";
    ctx.font = '700 30px "Hind", sans-serif';
    wrapText(ctx, scheme.name, 84, y + 44, W - 168, 36, 2);

    ctx.fillStyle = "#1F4B3F";
    ctx.font = '600 22px "Hind", sans-serif';
    const tag = `${scheme.level}${scheme.state ? " · " + scheme.state : ""}`;
    ctx.fillText(tag, 84, y + 105);

    if (scheme.benefits) {
      ctx.fillStyle = "#7A6F5D";
      ctx.font = '400 22px "Hind", sans-serif';
      wrapText(ctx, stripMarkdown(scheme.benefits), 84, y + 135, W - 168, 26, 1);
    }

    y += cardH;
  }

  if (matches.length > visibleMatches.length) {
    ctx.fillStyle = "#7A6F5D";
    ctx.font = '400 24px "Hind", sans-serif';
    ctx.fillText(`+ ${matches.length - visibleMatches.length} more`, 60, y + 20);
  }

  // footer
  drawJaliStrip(ctx, 60, H - 130, W - 120, "#1F4B3F");
  ctx.fillStyle = "#7A6F5D";
  ctx.font = '400 24px "Hind", sans-serif';
  ctx.fillText("scheme-navigator-ten.vercel.app", 60, H - 70);
  ctx.textAlign = "right";
  ctx.fillText("Made with ❤ by BinaryBots", W - 60, H - 70);
  ctx.textAlign = "left";
}

export default function ShareCard({ matches, profile, onClose }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      renderCard(canvasRef.current, matches, profile).then(() => setReady(true));
    }
  }, [matches, profile]);

  function download() {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-eligible-schemes.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "my-eligible-schemes.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "My Eligible Schemes" });
        } catch {
          // user cancelled share sheet — no-op
        }
      } else {
        download();
      }
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-khadi rounded-xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg text-ledger">{t("share_title")}</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>
        <div className="border border-borderc rounded-lg overflow-hidden bg-white/40">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={share}
            disabled={!ready}
            className="flex-1 px-4 py-2.5 rounded-lg bg-bottle text-white font-body font-semibold hover:bg-bottle-light transition-colors disabled:opacity-50"
          >
            {t("share_button_share")}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!ready}
            className="flex-1 px-4 py-2.5 rounded-lg border border-borderc bg-white/60 font-body font-semibold hover:bg-white transition-colors disabled:opacity-50"
          >
            {t("share_button_download")}
          </button>
        </div>
      </div>
    </div>
  );
}
