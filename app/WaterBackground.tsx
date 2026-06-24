"use client";

import { useEffect, useRef } from "react";

export function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;

    const cv: HTMLCanvasElement = el;
    const c: CanvasRenderingContext2D = context;
    const TAU = Math.PI * 2;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let w = 0;
    let h = 0;
    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Soft caustic glow blobs
    const blobs = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random(),
      y: Math.random() * 0.8,
      r: 200 + Math.random() * 240,
      hue: i % 2 === 0 ? "45,212,191" : "56,189,248",
      sx: 0.00004 + Math.random() * 0.00006,
      sy: 0.00003 + Math.random() * 0.00005,
      px: Math.random() * 1000,
      py: Math.random() * 1000,
    }));

    // Rippling light bands on the water surface
    const streaks = Array.from({ length: 7 }, () => ({
      y: Math.random(),
      amp: 8 + Math.random() * 22,
      phase: Math.random() * TAU,
      speed: 0.0003 + Math.random() * 0.0005,
      freq: 0.006 + Math.random() * 0.01,
      alpha: 0.05 + Math.random() * 0.06,
    }));

    // Star-shaped glints — refined but present
    const glints = Array.from({ length: 17 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1.2 + Math.random() * 1.8,
      phase: Math.random() * TAU,
      speed: 0.0009 + Math.random() * 0.0016,
      drift: 0.00001 + Math.random() * 0.00002,
    }));

    // Tiny dust flecks
    const dust = Array.from({ length: 32 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.0,
      phase: Math.random() * TAU,
      speed: 0.0009 + Math.random() * 0.0018,
    }));

    function drawGlint(x: number, y: number, size: number, a: number) {
      const glow = c.createRadialGradient(x, y, 0, x, y, size * 5);
      glow.addColorStop(0, `rgba(190,240,235,${a * 0.32})`);
      glow.addColorStop(1, "rgba(190,240,235,0)");
      c.fillStyle = glow;
      c.beginPath();
      c.arc(x, y, size * 5, 0, TAU);
      c.fill();

      c.strokeStyle = `rgba(226,250,247,${a * 0.85})`;
      c.lineWidth = 0.8;
      const sp = size * 3;
      c.beginPath();
      c.moveTo(x - sp, y);
      c.lineTo(x + sp, y);
      c.moveTo(x, y - sp);
      c.lineTo(x, y + sp);
      c.stroke();

      c.fillStyle = `rgba(245,252,250,${a * 0.9})`;
      c.beginPath();
      c.arc(x, y, size * 0.6, 0, TAU);
      c.fill();
    }

    function paintBase() {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0e3640");
      g.addColorStop(0.5, "#0a262d");
      g.addColorStop(1, "#06161b");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    let raf = 0;
    function frame(t: number) {
      paintBase();
      c.globalCompositeOperation = "lighter";

      // glow blobs
      for (const b of blobs) {
        const cx = (b.x * w + Math.sin(t * b.sx + b.px) * 120) % (w + 200);
        const cy = b.y * h + Math.cos(t * b.sy + b.py) * 90;
        const rg = c.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        rg.addColorStop(0, `rgba(${b.hue},0.10)`);
        rg.addColorStop(0.5, `rgba(${b.hue},0.04)`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = rg;
        c.fillRect(cx - b.r, cy - b.r, b.r * 2, b.r * 2);
      }

      // rippling light bands
      for (const s of streaks) {
        const yb = s.y * h;
        c.beginPath();
        for (let px = 0; px <= w; px += 14) {
          const py = yb + Math.sin(px * s.freq + t * s.speed + s.phase) * s.amp;
          if (px === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.strokeStyle = `rgba(120,232,212,${s.alpha})`;
        c.lineWidth = 1.4;
        c.stroke();
      }

      // dust flecks
      for (const d of dust) {
        const a = 0.2 + 0.55 * Math.abs(Math.sin(t * d.speed + d.phase));
        c.beginPath();
        c.arc(d.x * w, d.y * h, d.r, 0, TAU);
        c.fillStyle = `rgba(180,245,235,${a * 0.6})`;
        c.fill();
      }

      // star glints
      for (const g of glints) {
        g.y -= g.drift;
        if (g.y < 0) g.y = 1;
        const tw = Math.abs(Math.sin(t * g.speed + g.phase));
        const a = 0.14 + 0.6 * tw * tw;
        drawGlint(g.x * w, g.y * h, g.size, a);
      }

      c.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    if (reduced) {
      paintBase();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
