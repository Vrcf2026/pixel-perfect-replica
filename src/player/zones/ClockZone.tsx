import { useEffect, useMemo, useState } from "react";
import type { ZoneConfig } from "./types";

const KEYFRAMES = `
@keyframes mclk-sweep { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes mclk-ring { from { stroke-dashoffset: var(--mclk-len) } to { stroke-dashoffset: 0 } }
@keyframes mclk-flip { 0% { transform: rotateX(-90deg); opacity: .2 } 60% { transform: rotateX(12deg); opacity: 1 } 100% { transform: rotateX(0deg) } }
@keyframes mclk-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: .25 } }
@media (prefers-reduced-motion: reduce) { .mclk-anim { animation: none !important } }
`;

function partsIn(tz: string, d: Date) {
  let p: Intl.DateTimeFormatPart[];
  try {
    p = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
  } catch {
    p = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
  }
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { h: g("hour"), m: g("minute"), s: g("second"), ms: d.getMilliseconds() };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function ClockZone({
  config,
  timezone = "Europe/Lisbon",
}: {
  config: ZoneConfig;
  timezone?: string;
}) {
  const style = config.clock_style ?? "digital";
  const withSeconds = config.format === "HH:mm:ss";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const every = style === "digital" && !withSeconds ? 5000 : 1000;
    const id = setInterval(() => setNow(new Date()), every);
    return () => clearInterval(id);
  }, [style, withSeconds]);

  const t = partsIn(timezone, now);
  const color = config.text_color || "#fff";
  const accent = config.accent || "var(--m-accent, #F28C28)";
  const align = config.align ?? "center";
  const date = config.show_date
    ? new Intl.DateTimeFormat(
        "pt-PT",
        config.date_format === "short"
          ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: timezone }
          : { weekday: "long", day: "numeric", month: "long", timeZone: timezone },
      ).format(now)
    : "";
  // Atraso negativo = a animação começa já no segundo certo (movimento suave sem JS a cada frame).
  // Recalcula-se só quando muda o minuto, para não reiniciar a animação.
  const minuteKey = `${t.h}:${t.m}`;
  const sweepDelay = useMemo(() => `-${t.s + t.ms / 1000}s`, [minuteKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const wrap = (children: React.ReactNode) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        gap: "5cqw",
        color,
        padding: "4cqh 5cqw",
      }}
    >
      <style>{KEYFRAMES}</style>
      {children}
    </div>
  );

  const dateBlock = date ? (
    <div
      style={{
        fontSize: "min(13cqh, 6cqw)",
        opacity: 0.85,
        lineHeight: 1.15,
        textTransform: "capitalize",
        maxWidth: "45cqw",
      }}
    >
      {date}
    </div>
  ) : null;

  if (style === "ring") {
    const r = 44;
    const len = 2 * Math.PI * r;
    return wrap(
      <>
        <div
          style={{
            position: "relative",
            width: "min(90cqh, 50cqw)",
            aspectRatio: "1",
            flex: "none",
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth="5"
            />
            <circle
              key={minuteKey}
              className="mclk-anim"
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={accent}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={len}
              style={
                {
                  ["--mclk-len" as string]: `${len}`,
                  strokeDashoffset: len,
                  animation: `mclk-ring 60s linear ${sweepDelay} 1 forwards`,
                } as React.CSSProperties
              }
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "min(26cqh, 14cqw)",
              }}
            >
              {pad(t.h)}:{pad(t.m)}
            </div>
            <div
              style={{
                fontSize: "min(10cqh, 5.5cqw)",
                opacity: 0.7,
                marginTop: "2cqh",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pad(t.s)}
            </div>
          </div>
        </div>
        {dateBlock}
      </>,
    );
  }

  if (style === "analog") {
    const hourDeg = ((t.h % 12) + t.m / 60) * 30;
    const minDeg = (t.m + t.s / 60) * 6;
    return wrap(
      <>
        <svg
          viewBox="0 0 100 100"
          style={{ width: "min(90cqh, 50cqw)", aspectRatio: "1", flex: "none" }}
        >
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="currentColor"
            fillOpacity={0.08}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeWidth="1.5"
          />
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1="50"
              y1={i % 5 === 0 ? 7 : 8.5}
              x2="50"
              y2="11"
              stroke="currentColor"
              strokeOpacity={i % 5 === 0 ? 0.9 : 0.35}
              strokeWidth={i % 5 === 0 ? 2 : 0.8}
              strokeLinecap="round"
              transform={`rotate(${i * 6} 50 50)`}
            />
          ))}
          <line
            x1="50"
            y1="53"
            x2="50"
            y2="27"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${hourDeg} 50 50)`}
          />
          <line
            x1="50"
            y1="55"
            x2="50"
            y2="15"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            transform={`rotate(${minDeg} 50 50)`}
          />
          <g
            key={minuteKey}
            className="mclk-anim"
            style={{
              transformOrigin: "50px 50px",
              animation: `mclk-sweep 60s linear ${sweepDelay} infinite`,
            }}
          >
            <line
              x1="50"
              y1="60"
              x2="50"
              y2="12"
              stroke={accent}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="2.6" fill={accent} />
          </g>
        </svg>
        {dateBlock}
      </>,
    );
  }

  if (style === "flip") {
    const digits = `${pad(t.h)}${pad(t.m)}${withSeconds ? pad(t.s) : ""}`.split("");
    const groups = withSeconds
      ? [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)]
      : [digits.slice(0, 2), digits.slice(2, 4)];
    const cardH = withSeconds ? "min(55cqh, 11cqw)" : "min(60cqh, 16cqw)";
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4cqh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5cqw", perspective: "60cqw" }}>
          {groups.map((g, gi) => (
            <div key={gi} style={{ display: "flex", alignItems: "center", gap: "1cqw" }}>
              {gi > 0 ? (
                <span
                  className="mclk-anim"
                  style={{
                    fontSize: cardH,
                    fontWeight: 700,
                    lineHeight: 1,
                    animation: "mclk-blink 1s steps(1) infinite",
                    padding: "0 0.5cqw",
                  }}
                >
                  :
                </span>
              ) : null}
              {g.map((dgt, di) => (
                <span
                  key={`${gi}-${di}-${dgt}`}
                  className="mclk-anim"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: cardH,
                    width: `calc(${cardH} * 0.68)`,
                    borderRadius: "1cqw",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,.14) 0 49.5%, rgba(0,0,0,.35) 49.5% 50.5%, rgba(255,255,255,.08) 50.5%)",
                    boxShadow: "0 1cqh 2cqh rgba(0,0,0,.35)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: `calc(${cardH} * 0.78)`,
                    lineHeight: 1,
                    animation: "mclk-flip 450ms cubic-bezier(.3,1.4,.5,1) both",
                    transformOrigin: "50% 50%",
                  }}
                >
                  {dgt}
                </span>
              ))}
            </div>
          ))}
        </div>
        {dateBlock}
      </div>,
    );
  }

  // digital (com os dois pontos a piscar se mostrar segundos)
  return wrap(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        textAlign: align,
        lineHeight: 1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: `min(${config.show_date ? 45 : 60}cqh, ${withSeconds ? 20 : 28}cqw)`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pad(t.h)}
        <span
          className="mclk-anim"
          style={{ animation: withSeconds ? "none" : "mclk-blink 2s steps(1) infinite" }}
        >
          :
        </span>
        {pad(t.m)}
        {withSeconds ? (
          <>
            :<span style={{ color: accent }}>{pad(t.s)}</span>
          </>
        ) : null}
      </div>
      {date ? (
        <div
          style={{
            marginTop: "4cqh",
            fontSize: "min(14cqh, 8cqw)",
            opacity: 0.8,
            textTransform: "capitalize",
          }}
        >
          {date}
        </div>
      ) : null}
    </div>,
  );
}
