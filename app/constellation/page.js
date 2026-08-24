"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../lib/i18n/LanguageContext";

const LEVEL_COLORS = { Central: "#C46F14", State: "#1E3A5F" };

export default function ConstellationPage() {
  const { t } = useLanguage();
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

  const project = useCallback(
    (x, y, w, h) => {
      const cx = w / 2 + transform.offsetX;
      const cy = h / 2 + transform.offsetY;
      const scale = (Math.min(w, h) / 240) * transform.scale;
      return [cx + x * scale, cy + y * scale];
    },
    [transform]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const p of data.points) {
      const [px, py] = project(p.x, p.y, w, h);
      const isHovered = hovered?.id === p.id;
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = LEVEL_COLORS[p.level] || "#7A6F5D";
      ctx.globalAlpha = isHovered ? 1 : 0.55;
      ctx.fill();
      if (isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#E38B29";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [data, hovered, project]);

  useEffect(() => {
    draw();
  }, [draw]);

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

  function findNearestPoint(mx, my) {
    if (!data) return null;
    const canvas = canvasRef.current;
    let closest = null;
    let closestDist = 12; // px hit-radius
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

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragRef.current) {
      const dx = mx - dragRef.current.startX;
      const dy = my - dragRef.current.startY;
      setTransform((t) => ({ ...t, offsetX: dragRef.current.origOffsetX + dx, offsetY: dragRef.current.origOffsetY + dy }));
      return;
    }
    setHovered(findNearestPoint(mx, my));
  }

  function handleMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origOffsetX: transform.offsetX,
      origOffsetY: transform.offsetY,
    };
  }
  function handleMouseUp() {
    dragRef.current = null;
  }

  function handleClick() {
    if (hovered) router.push(`/scheme/${hovered.id}`);
  }

  function handleWheel(e) {
    e.preventDefault();
    setTransform((t) => ({
      ...t,
      scale: Math.min(6, Math.max(0.5, t.scale * (e.deltaY < 0 ? 1.1 : 0.9))),
    }));
  }

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

      <div className="mt-4 flex justify-center gap-4 text-xs font-body">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: LEVEL_COLORS.Central }} />
          Central
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: LEVEL_COLORS.State }} />
          State
        </span>
        <span className="text-muted">{t("constellation_legend_hint")}</span>
      </div>

      <div ref={containerRef} className="mt-4 border border-borderc rounded-lg bg-white/50 overflow-hidden relative">
        {!data ? (
          <p className="text-center py-20 text-muted font-body">{t("constellation_loading")}</p>
        ) : (
          <canvas
            ref={canvasRef}
            height={520}
            className="w-full cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onWheel={handleWheel}
          />
        )}
        {hovered && (
          <div className="absolute top-3 left-3 max-w-xs bg-ledger text-white text-xs font-body px-3 py-2 rounded-lg shadow-lg pointer-events-none">
            <p className="font-semibold">{hovered.name}</p>
            <p className="text-white/70 mt-0.5">
              {hovered.level}
              {hovered.state ? ` · ${hovered.state}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
