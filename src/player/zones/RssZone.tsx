import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchRss } from "@/lib/rss.functions";
import { TickerZone } from "./TickerZone";
import type { ZoneConfig } from "./types";

const REFRESH_MS = 10 * 60 * 1000;

/** Notícias por RSS: uma manchete de cada vez, ou em rodapé a correr. */
export function RssZone({ zoneId, config }: { zoneId: string; config: ZoneConfig }) {
  const load = useServerFn(fetchRss);
  const cacheKey = `montra:rss:${zoneId}`;
  const [items, setItems] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await load({ data: { zone_id: zoneId } });
        if (!alive || !r.items.length) return;
        setItems(r.items);
        setTitle(r.title);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(r.items));
        } catch {
          /* ignore */
        }
      } catch {
        /* mantém o que já tem */
      }
    };
    void run();
    const t = setInterval(() => void run(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [zoneId, config.url, config.max_items]);

  useEffect(() => {
    if (config.mode === "ticker" || items.length < 2) return;
    const t = setInterval(() => setIdx((i) => i + 1), 9000);
    return () => clearInterval(t);
  }, [config.mode, items.length]);

  const label = config.source_label || title;
  if (config.mode === "ticker") {
    return (
      <TickerZone
        config={{
          ...config,
          messages: label ? [label.toUpperCase(), ...items] : items,
          bg: config.bg || "transparent",
        }}
      />
    );
  }
  const current = items.length ? items[idx % items.length] : "";
  return (
    <div
      className="flex h-full w-full flex-col justify-center"
      style={{
        color: config.text_color || "#fff",
        background: config.bg || undefined,
        padding: "5cqh 4cqw",
        gap: "3cqh",
      }}
    >
      {label ? (
        <div
          style={{
            fontSize: "min(10cqh, 3.5cqw)",
            fontWeight: 600,
            textTransform: "uppercase",
            opacity: 0.75,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        key={idx}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "min(20cqh, 5.5cqw)",
          lineHeight: 1.1,
          animation: "montra-fade 600ms ease both",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {current || "A carregar notícias…"}
      </div>
    </div>
  );
}
