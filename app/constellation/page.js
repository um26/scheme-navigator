"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { localizeState } from "../../lib/i18n/entities";

const DEFAULT_TRANSFORM = { scale: 1, offsetX: 0, offsetY: 0 };

function themeColor(variable, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (!value) return fallback;
  return `rgb(${value.split(/\s+/).join(", ")})`;
}

export default function ConstellationPage() {
  const { t, locale, localizeSchemeContent } = useLanguage();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();
  const [data, setData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [themeVersion, setThemeVersion] = useState(0);
  const dragRef = useRef(null);

  useEffect(() => {
    fetch("/data/constellation.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ points: [] }));
  }, []);

  useEffect(() => {
    const onTheme = () => setThemeVersion((value) => value + 1);
    window.addEventListener("sn-theme-change", onTheme);
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("sn-theme-change", onTheme);
      observer.disconnect();
    };
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
    const central = themeColor("--c-saffron-dark", "#C46F14");
    const state = themeColor("--c-bottle", "#1F4B3F");
    const muted = themeColor("--c-muted", "#7A6F5D");
    const highlight = themeColor("--c-saffron", "#E38B29");

    ctx.clearRect(0, 0, w, h);
    for (const p of data.points) {
      const [px, py] = project(p.x, p.y, w, h);
      const isHovered = hovered?.id === p.id;
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.level === "Central" ? central : p.level === "State" ? state : muted;
      ctx.globalAlpha = isHovered ? 1 : 0.58;
      ctx.fill();
      if (isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = highlight;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [data, hovered, project, themeVersion]);

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
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  function pointerCoords(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top) * (canvas.height / rect.height),
    ];
  }

  function findNearestPoint(mx, my) {
    if (!data || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    let closest = null;
    let closestDist = 13;
    for (const p of data.points) {
      const [px, py] = project(p.x, p.y, canvas.width, canvas.height);
      const d = Math.hypot(px - mx, py - my);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    return closest;
  }

  function handlePointerMove(e) {
    const [mx, my] = pointerCoords(e);
    if (dragRef.current) {
      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
      setTransform((value) => ({
        ...value,
        offsetX: dragRef.current.origOffsetX + dx,
        offsetY: dragRef.current.origOffsetY + dy,
      }));
      return;
    }
    setHovered(findNearestPoint(mx, my));
  }

  function handlePointerDown(e) {
    const [mx, my] = pointerCoords(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setHovered(findNearestPoint(mx, my));
    dragRef.current = {
      startX: mx,
      startY: my,
      origOffsetX: transform.offsetX,
      origOffsetY: transform.offsetY,
      moved: false,
    };
  }

  function handlePointerUp(e) {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (drag && !drag.moved) {
      const [mx, my] = pointerCoords(e);
      const nearest = findNearestPoint(mx, my);
      if (nearest) router.push(`/scheme/${nearest.id}`);
    }
  }

  function handleWheel(e) {
    e.preventDefault();
    setTransform((value) => ({ ...value, scale: Math.min(6, Math.max(0.6, value.scale * (e.deltaY < 0 ? 1.12 : 0.9))) }));
  }

  const displayHovered = hovered ? localizeSchemeContent(hovered) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-ledger text-center">{t("constellation_title")}</h1>
      <p className="mt-2 text-center text-ink/70 font-body max-w-2xl mx-auto">
        {t("constellation_subtitle")}
        {data?.explainedVariance && (
          <span className="block text-xs text-muted mt-1">
            {t("constellation_variance", { a: (data.explainedVariance[0] * 100).toFixed(0), b: (data.explainedVariance[1] * 100).toFixed(0) })}
          </span>
        )}
      </p>

      <div className="mt-4 flex justify-center gap-4 text-xs font-body flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-saffron-dark" />{t("browse_central")}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-bottle" />{t("browse_state")}</span>
        <span className="text-muted">{t("constellation_legend_hint")}</span>
        <Link href="/browse" className="font-semibold text-saffron-dark hover:underline">{t("nav_browse")} →</Link>
      </div>

      <div ref={containerRef} className="mt-4 relative overflow-hidden rounded-xl border border-borderc bg-white/50 shadow-sm">
        <div className="absolute end-3 top-3 z-20 flex gap-1 rounded-lg border border-borderc bg-white/90 p-1 shadow-sm">
          <button type="button" onClick={() => setTransform((v) => ({ ...v, scale: Math.min(6, v.scale * 1.25) }))} aria-label="Zoom in" title="Zoom in" className="interactive-surface flex h-8 w-8 items-center justify-center rounded-md text-ledger hover:bg-khadi-dark/70">+</button>
          <button type="button" onClick={() => setTransform((v) => ({ ...v, scale: Math.max(0.6, v.scale / 1.25) }))} aria-label="Zoom out" title="Zoom out" className="interactive-surface flex h-8 w-8 items-center justify-center rounded-md text-ledger hover:bg-khadi-dark/70">−</button>
          <button type="button" onClick={() => setTransform(DEFAULT_TRANSFORM)} aria-label="Reset view" title="Reset" className="interactive-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-body font-semibold text-ledger hover:bg-khadi-dark/70">↺</button>
        </div>

        {!data ? (
          <div className="p-5" aria-live="polite" aria-label={t("constellation_loading")}>
            <div className="skeleton h-[520px] w-full rounded-xl" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            height={520}
            tabIndex={0}
            role="img"
            aria-label={t("constellation_title")}
            className="w-full cursor-grab active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { dragRef.current = null; }}
            onPointerLeave={() => { if (!dragRef.current) setHovered(null); }}
            onWheel={handleWheel}
          />
        )}

        {hovered && (
          <div className="absolute start-3 top-3 z-10 max-w-[70%] rounded-lg bg-ledger px-3 py-2 text-xs font-body text-white shadow-lg pointer-events-none">
            <p className="font-semibold">{displayHovered?.name || hovered.name}</p>
            <p className="mt-0.5 text-white/70">
              {hovered.level === "Central" ? t("browse_central") : t("browse_state")}
              {hovered.state ? ` · ${localizeState(locale, hovered.state)}` : ""}
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted font-body">
        <Link href="/browse" className="underline">{t("nav_browse")}</Link>
      </p>
    </div>
  );
}
