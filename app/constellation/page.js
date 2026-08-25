"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

function cssColor(variable, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `rgb(${value})` : fallback;
}

export default function ConstellationPage() {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();
  const [data, setData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    fetch("/data/constellation.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ points: [] }));
  }, []);

  const project = useCallback((x, y, w, h) => {
    const cx = w / 2 + transform.offsetX;
    const cy = h / 2 + transform.offsetY;
    const scale = (Math.min(w, h) / 240) * transform.scale;
    return [cx + x * scale, cy + y * scale];
  }, [transform]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const central = cssColor("--c-saffron-dark", "#C46F14");
    const state = cssColor("--c-ledger", "#1E3A5F");
    const accent = cssColor("--c-saffron", "#E38B29");
    ctx.clearRect(0, 0, w, h);
    for (const p of data.points) {
      const [px, py] = project(p.x, p.y, w, h);
      const isHovered = hovered?.id === p.id;
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 5.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.level === "Central" ? central : state;
      ctx.globalAlpha = isHovered ? 1 : p.level === "Central" ? 0.62 : 0.42;
      ctx.fill();
      if (isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [data, hovered, project]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = 520;
      draw();
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    const observer = new MutationObserver(draw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [draw]);

  function findNearestPoint(mx, my) {
    if (!data) return null;
    const canvas = canvasRef.current;
    let closest = null;
    let closestDist = 12;
    for (const p of data.points) {
      const [px, py] = project(p.x, p.y, canvas.width, canvas.height);
      const d = Math.hypot(px - mx, py - my);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    return closest;
  }

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (dragRef.current) {
      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;
      setTransform((v) => ({ ...v, offsetX: dragRef.current.origOffsetX + dx, offsetY: dragRef.current.origOffsetY + dy }));
      return;
    }
    setHovered(findNearestPoint(mx, my));
  }

  function handleMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top, origOffsetX: transform.offsetX, origOffsetY: transform.offsetY };
  }
  function handleMouseUp() { dragRef.current = null; }
  function handleClick() { if (hovered) router.push(`/scheme/${hovered.id}`); }
  function handleWheel(e) {
    e.preventDefault();
    setTransform((v) => ({ ...v, scale: Math.min(6, Math.max(0.5, v.scale * (e.deltaY < 0 ? 1.1 : 0.9))) }));
  }

  const displayHovered = hovered ? localizeSchemeContent(hovered) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 page-enter">
      <div className="text-center max-w-2xl mx-auto">
        <div className="section-kicker">4,693 POINTS · ONE ELIGIBILITY SPACE</div>
        <h1 className="mt-2 font-display text-3xl md:text-5xl text-ledger">{t("constellation_title")}</h1>
        <p className="mt-3 text-center text-ink/70 font-body">
          {t("constellation_subtitle")}
          {data?.explainedVariance && <span className="block text-xs text-muted mt-2">{t("constellation_variance", { a: (data.explainedVariance[0] * 100).toFixed(0), b: (data.explainedVariance[1] * 100).toFixed(0) })}</span>}
        </p>
      </div>

      <div className="mt-5 flex justify-center gap-4 text-xs font-body flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-saffron-dark" />{t("browse_central")}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-ledger" />{t("browse_state")}</span>
        <span className="text-muted">{t("constellation_legend_hint")}</span>
      </div>

      <div ref={containerRef} className="mt-5 border border-borderc rounded-[1.5rem] bg-white/50 overflow-hidden relative shadow-sm">
        <div className="map-grid" aria-hidden="true" />
        {!data ? (
          <div className="p-6 space-y-3">
            <div className="skeleton h-[430px] rounded-2xl" />
            <div className="flex items-center justify-center gap-2 text-xs text-muted font-body"><span className="loading-spark">✦</span>{t("constellation_loading")}</div>
          </div>
        ) : (
          <canvas ref={canvasRef} height={520} className="relative z-[1] w-full cursor-grab active:cursor-grabbing" onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleClick} onWheel={handleWheel} />
        )}
        {hovered && (
          <div className="absolute z-[3] top-3 start-3 max-w-xs bg-khadi/90 border border-borderc text-xs font-body px-3 py-2 rounded-xl shadow-lg pointer-events-none backdrop-blur-md">
            <p className="font-semibold text-ledger">{displayHovered?.name || hovered.name}</p>
            <p className="text-muted mt-0.5">{hovered.level === "Central" ? t("browse_central") : t("browse_state")}{hovered.state ? ` · ${localizeState(locale, hovered.state)}` : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
