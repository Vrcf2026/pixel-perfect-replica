import { useEffect, useRef } from "react";
import type { ZoneConfig } from "./types";

const SEP: Record<string, string> = { dot: "●", square: "■", bar: "|", none: "" };

/** Rodapé com texto a correr (velocidade em px/s de um ecrã de 1920). */
export function TickerZone({ config }: { config: ZoneConfig }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const messages = (config.messages ?? []).filter((m) => m.trim());
  const speed = Math.max(10, config.speed ?? 80);
  const sep = SEP[config.separator ?? "square"] ?? "";

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track || messages.length === 0) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let x = 0;
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const stage = wrap.closest("[data-stage]") as HTMLElement | null;
      const scale = (stage?.getBoundingClientRect().width ?? 1920) / 1920;
      const half = track.scrollWidth / 2;
      x -= speed * scale * dt;
      if (half > 0 && -x >= half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [messages.join("\u0000"), speed]);

  const items = messages.length ? messages : [""];
  const row = items.map((m, i) => (
    <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
      <span style={{ padding: "0 2.5cqh" }}>{config.uppercase ? m.toUpperCase() : m}</span>
      {sep ? (
        <span style={{ opacity: 0.8, padding: "0 2.5cqh", fontSize: "0.6em" }}>{sep}</span>
      ) : null}
    </span>
  ));

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: config.bg || "transparent",
        color: config.text_color || "#fff",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: `${config.font_size ?? 50}cqh`,
        whiteSpace: "nowrap",
      }}
    >
      <div ref={trackRef} style={{ display: "inline-flex", willChange: "transform" }}>
        {row}
        {row}
      </div>
    </div>
  );
}
