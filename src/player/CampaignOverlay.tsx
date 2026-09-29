import { useEffect, useState } from "react";
import type { Campaign } from "./lib/types";

/** Avisos urgentes por cima de tudo (faixa ou ecrã inteiro), dentro do período definido. */
export function CampaignOverlay({ campaigns }: { campaigns: Campaign[] | undefined }) {
  const [now, setNow] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const active = (campaigns ?? []).filter(
    (c) => new Date(c.starts_at).getTime() <= now && new Date(c.ends_at).getTime() > now,
  );
  useEffect(() => {
    if (active.length < 2) return;
    const t = setInterval(() => setIdx((i) => i + 1), 10_000);
    return () => clearInterval(t);
  }, [active.length]);
  if (!active.length) return null;

  const full = active.find((c) => c.style === "fullscreen");
  const c = full ?? (active[idx % active.length] as Campaign);

  if (c.style === "fullscreen") {
    return (
      <div
        className="absolute inset-0 z-[5000] flex flex-col items-center justify-center gap-[3cqh] px-[8cqw] text-center"
        style={{ background: c.bg, color: c.text_color, animation: "montra-fade 500ms ease both" }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "9cqh",
            lineHeight: 1.05,
          }}
        >
          {c.title}
        </div>
        {c.body ? (
          <div style={{ fontSize: "4cqh", lineHeight: 1.3, whiteSpace: "pre-line", opacity: 0.95 }}>
            {c.body}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div
      key={c.id}
      className="absolute inset-x-0 top-0 z-[5000] flex items-center gap-[2cqw] px-[3cqw] py-[1.6cqh] shadow-lg"
      style={{ background: c.bg, color: c.text_color, animation: "montra-fade 500ms ease both" }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "5cqh",
          whiteSpace: "nowrap",
        }}
      >
        {c.title}
      </div>
      {c.body ? (
        <div className="min-w-0 truncate" style={{ fontSize: "3.2cqh", opacity: 0.95 }}>
          {c.body}
        </div>
      ) : null}
    </div>
  );
}
