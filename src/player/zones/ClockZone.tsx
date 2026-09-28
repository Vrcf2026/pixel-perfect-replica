import { useEffect, useState } from "react";
import type { ZoneConfig } from "./types";

export function ClockZone({
  config,
  timezone = "Europe/Lisbon",
}: {
  config: ZoneConfig;
  timezone?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const withSeconds = config.format === "HH:mm:ss";
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), withSeconds ? 1000 : 5000);
    return () => clearInterval(id);
  }, [withSeconds]);

  const time = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    timeZone: timezone,
  }).format(now);
  const date = new Intl.DateTimeFormat(
    "pt-PT",
    config.date_format === "short"
      ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: timezone }
      : { weekday: "long", day: "numeric", month: "long", timeZone: timezone },
  ).format(now);
  const align = config.align ?? "center";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        textAlign: align,
        color: config.text_color || "#fff",
        padding: "0 6cqw",
        lineHeight: 1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: `min(${config.show_date ? 45 : 60}cqh, ${withSeconds ? 20 : 28}cqw)`,
        }}
      >
        {time}
      </div>
      {config.show_date ? (
        <div style={{ marginTop: "4cqh", fontSize: "min(14cqh, 8cqw)", opacity: 0.8 }}>{date}</div>
      ) : null}
    </div>
  );
}
