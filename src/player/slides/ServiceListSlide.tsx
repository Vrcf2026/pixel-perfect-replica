import { useEffect, useRef, useState } from "react";
import { findIcon } from "./icons";
import type { SlideProps } from "./types";

type Row = { icon?: string; title?: string; note?: string; price?: string };

const CSS = `
@keyframes msl-in { from { opacity: 0; transform: translateY(1.5cqh) } to { opacity: 1; transform: none } }
@keyframes msl-shine { from { transform: translateX(-120%) } to { transform: translateX(220%) } }
@media (prefers-reduced-motion: reduce) { .msl-anim { animation: none !important } }
`;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Lista de serviços tipo "quadro de menu": colunas automáticas, páginas e destaque a passar. */
export function ServiceListSlide({ data }: SlideProps) {
  const d = data as Record<string, unknown>;
  const rows = (Array.isArray(d["list"]) ? (d["list"] as Row[]) : []).filter((r) =>
    str(r.title).trim(),
  );
  const bg = str(d["bg"]) || "var(--m-primary, #0F1E36)";
  const text = str(d["text_color"]) || "var(--m-text, #FFFFFF)";
  const accent = str(d["accent"]) || "var(--m-accent, #F28C28)";
  const pageMs = Math.max(4, Number(d["page_s"]) || 8) * 1000;
  const highlight = d["highlight"] !== false;

  const ref = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(16 / 9);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const r = e?.contentRect;
      if (r && r.height > 0) setRatio(r.width / r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const forced = Number(d["columns"]);
  let cols = forced >= 1 && forced <= 4 ? forced : ratio >= 1.7 ? 3 : ratio >= 1.05 ? 2 : 1;
  cols = Math.max(1, Math.min(cols, rows.length || 1));
  const perCol = cols === 1 ? (ratio < 0.6 ? 8 : 6) : cols === 2 ? 4 : 3;
  const perPage = cols * perCol;
  const pages = Math.max(1, Math.ceil(rows.length / perPage));

  const [page, setPage] = useState(0);
  const [hi, setHi] = useState(0);
  useEffect(() => {
    if (pages < 2) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), pageMs);
    return () => clearInterval(t);
  }, [pages, pageMs]);
  const visible = rows.slice((page % pages) * perPage, (page % pages) * perPage + perPage);
  useEffect(() => {
    if (!highlight || visible.length < 2) return;
    setHi(0);
    const t = setInterval(() => setHi((h) => (h + 1) % visible.length), 2400);
    return () => clearInterval(t);
  }, [highlight, visible.length, page]);

  const narrow = cols === 1;
  const titleSize = narrow ? "min(5.5cqw, 4.2cqh)" : `min(${cols === 3 ? 2.2 : 2.8}cqw, 4.4cqh)`;
  const noteSize = narrow ? "min(3.8cqw, 2.8cqh)" : `min(${cols === 3 ? 1.5 : 1.9}cqw, 3cqh)`;
  const iconBox = narrow ? "min(10cqw, 7cqh)" : `min(${cols === 3 ? 4.6 : 5.6}cqw, 8.5cqh)`;
  const heading = str(d["title"]);
  const footer = str(d["footer"]);

  return (
    <div
      ref={ref}
      className="flex h-full w-full flex-col overflow-hidden"
      style={{
        background: bg,
        color: text,
        padding: narrow ? "5cqh 6cqw" : "5cqh 4cqw",
        gap: "3cqh",
      }}
    >
      <style>{CSS}</style>
      {heading || d["subtitle"] ? (
        <div className="shrink-0">
          {heading ? (
            <div
              className="font-display leading-none font-bold"
              style={{ fontSize: narrow ? "min(8cqw, 6.5cqh)" : "min(4.6cqw, 8cqh)" }}
            >
              {heading}
            </div>
          ) : null}
          <div className="mt-[1.4cqh] flex items-center gap-[1.5cqw]">
            <span
              style={{
                display: "block",
                height: "0.7cqh",
                width: "6cqw",
                background: accent,
                borderRadius: 99,
              }}
            />
            {d["subtitle"] ? (
              <span
                style={{
                  fontSize: narrow ? "min(4cqw, 3cqh)" : "min(1.9cqw, 3.2cqh)",
                  opacity: 0.8,
                }}
              >
                {str(d["subtitle"])}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        key={page}
        className="grid min-h-0 flex-1 content-start"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: `calc((100% - ${(perCol - 1) * 1.8}cqh) / ${perCol})`,
          gap: `1.8cqh ${narrow ? 0 : 1.6}cqw`,
        }}
      >
        {visible.map((r, i) => {
          const Icon = findIcon(r.icon);
          const on = highlight && i === hi;
          return (
            <div
              key={`${page}-${i}`}
              className="msl-anim relative flex items-center overflow-hidden"
              style={{
                gap: narrow ? "3cqw" : "1.2cqw",
                padding: narrow ? "0 3cqw" : "0 1.4cqw",
                borderRadius: "1.2cqh",
                background: on
                  ? `color-mix(in srgb, ${accent} 22%, transparent)`
                  : "rgba(255,255,255,.06)",
                border: `0.25cqh solid ${on ? accent : "rgba(255,255,255,.1)"}`,
                transform: on ? "scale(1.02)" : "none",
                transition: "background .5s, border-color .5s, transform .5s",
                animation: `msl-in 500ms ${i * 70}ms both`,
              }}
            >
              {on ? (
                <span
                  className="msl-anim pointer-events-none absolute inset-y-0 left-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent)",
                    animation: "msl-shine 1.6s ease-out 1",
                  }}
                />
              ) : null}
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: iconBox,
                  height: iconBox,
                  background: on ? accent : "transparent",
                  border: `0.3cqh solid ${accent}`,
                  color: on ? "#fff" : accent,
                  transition: "background .5s, color .5s",
                }}
              >
                {Icon ? <Icon style={{ width: "55%", height: "55%" }} /> : null}
              </span>
              <span
                className="flex min-w-0 flex-1 flex-col justify-center"
                style={{ gap: "0.4cqh" }}
              >
                <span
                  className="font-display truncate leading-tight font-bold"
                  style={{ fontSize: titleSize }}
                >
                  {str(r.title)}
                </span>
                {r.note ? (
                  <span
                    className="truncate leading-tight"
                    style={{ fontSize: noteSize, opacity: 0.72 }}
                  >
                    {str(r.note)}
                  </span>
                ) : null}
              </span>
              {r.price ? (
                <span
                  className="font-display shrink-0 text-right leading-none font-bold"
                  style={{ color: accent, fontSize: titleSize }}
                >
                  {str(r.price)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {footer || pages > 1 ? (
        <div
          className="flex shrink-0 items-center justify-between"
          style={{ fontSize: narrow ? "min(3.6cqw, 2.6cqh)" : "min(1.7cqw, 3cqh)" }}
        >
          <span style={{ opacity: 0.85 }}>{footer}</span>
          {pages > 1 ? (
            <span className="flex" style={{ gap: "0.8cqw" }}>
              {Array.from({ length: pages }, (_, p) => (
                <span
                  key={p}
                  style={{
                    width: p === page % pages ? "2.4cqw" : "0.9cqw",
                    height: "0.9cqw",
                    minHeight: 6,
                    borderRadius: 99,
                    background: p === page % pages ? accent : "rgba(255,255,255,.35)",
                    transition: "width .4s",
                  }}
                />
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
