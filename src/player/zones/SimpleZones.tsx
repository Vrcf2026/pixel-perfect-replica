import { useEffect, useState } from "react";
import { QrImage } from "@/player/components/QrImage";
import type { ZoneConfig } from "./types";

const justify = (a?: string) =>
  a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

export function LogoZone({
  config,
  fallbackUrl,
}: {
  config: ZoneConfig;
  fallbackUrl?: string | null | undefined;
}) {
  const src = config.image_url || fallbackUrl || "";
  if (!src) return null;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: justify(config.align),
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: config.fit === "cover" ? "100%" : undefined,
          height: config.fit === "cover" ? "100%" : undefined,
          objectFit: config.fit ?? "contain",
        }}
      />
    </div>
  );
}

const SIZES: Record<string, [number, number]> = {
  s: [10, 6],
  m: [14, 8],
  l: [20, 10],
  xl: [28, 13],
};

export function TextZone({ config }: { config: ZoneConfig }) {
  const [t, b] = SIZES[config.size ?? "m"] ?? [14, 8];
  const align = config.align ?? "center";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: justify(align),
        textAlign: align,
        color: config.text_color || "#fff",
        padding: "4cqh 5cqw",
        gap: "3cqh",
      }}
    >
      {config.title ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            lineHeight: 1.05,
            fontSize: `min(${t}cqh, ${t * 0.9}cqw)`,
          }}
        >
          {config.title}
        </div>
      ) : null}
      {config.body ? (
        <div
          style={{
            lineHeight: 1.3,
            opacity: 0.9,
            whiteSpace: "pre-line",
            fontSize: `min(${b}cqh, ${b * 0.6}cqw)`,
          }}
        >
          {config.body}
        </div>
      ) : null}
    </div>
  );
}

export function QrZone({ config }: { config: ZoneConfig }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4cqh",
        background: config.bg || "#fff",
        color: config.fg || "#000",
        padding: "5cqh",
      }}
    >
      <QrImage value={config.url ?? ""} className="aspect-square max-h-[75cqh] max-w-[90cqw]" />
      {config.caption ? (
        <div style={{ fontWeight: 600, textAlign: "center", fontSize: "min(9cqh, 8cqw)" }}>
          {config.caption}
        </div>
      ) : null}
    </div>
  );
}

export function WebpageZone({ config }: { config: ZoneConfig }) {
  const [tick, setTick] = useState(0);
  const zoom = Math.min(2, Math.max(0.5, config.zoom ?? 1));
  useEffect(() => {
    if (!config.refresh_s || config.refresh_s < 10) return;
    const id = setInterval(() => setTick((n) => n + 1), config.refresh_s * 1000);
    return () => clearInterval(id);
  }, [config.refresh_s]);
  if (!config.url || config.url === "https://") return null;
  return (
    <iframe
      key={tick}
      src={config.url}
      title="Página"
      style={{
        border: 0,
        background: "#fff",
        width: `${100 / zoom}%`,
        height: `${100 / zoom}%`,
        transform: `scale(${zoom})`,
        transformOrigin: "0 0",
      }}
    />
  );
}
