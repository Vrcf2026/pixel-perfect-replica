import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { ZoneConfig } from "./types";

type Wx = {
  temp: number;
  code: number;
  days: Array<{ date: string; code: number; max: number; min: number }>;
};

function wmo(code: number): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: Sun, label: "Céu limpo" };
  if (code <= 2) return { icon: CloudSun, label: "Pouco nublado" };
  if (code === 3) return { icon: Cloud, label: "Nublado" };
  if (code <= 48) return { icon: CloudFog, label: "Nevoeiro" };
  if (code <= 57) return { icon: CloudDrizzle, label: "Chuvisco" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { icon: CloudRain, label: "Chuva" };
  if (code <= 77 || code === 85 || code === 86) return { icon: CloudSnow, label: "Neve" };
  return { icon: CloudLightning, label: "Trovoada" };
}

const REFRESH_MS = 30 * 60 * 1000;

/** Meteorologia (Open-Meteo, sem chave). Guarda a última leitura para funcionar sem rede. */
export function WeatherZone({ config }: { config: ZoneConfig }) {
  const lat = config.lat ?? 38.7;
  const lon = config.lon ?? -8.97;
  const key = `montra:wx:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const [wx, setWx] = useState<Wx | null>(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as Wx) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;
        const r = await fetch(url);
        if (!r.ok) return;
        const j = (await r.json()) as {
          current: { temperature_2m: number; weather_code: number };
          daily: {
            time: string[];
            weather_code: number[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
          };
        };
        const next: Wx = {
          temp: j.current.temperature_2m,
          code: j.current.weather_code,
          days: j.daily.time.map((d, i) => ({
            date: d,
            code: j.daily.weather_code[i] ?? 0,
            max: j.daily.temperature_2m_max[i] ?? 0,
            min: j.daily.temperature_2m_min[i] ?? 0,
          })),
        };
        if (!alive) return;
        setWx(next);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      } catch {
        /* sem rede: mantém a última leitura */
      }
    };
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [lat, lon, key]);

  const color = config.text_color || "#fff";
  if (!wx) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ color, fontSize: "10cqh", opacity: 0.6 }}
      >
        {config.city || "Meteorologia"}
      </div>
    );
  }
  const now = wmo(wx.code);
  const days = Math.min(3, Math.max(0, config.forecast_days ?? 3));
  const wide = days > 0;
  return (
    <div
      className="flex h-full w-full items-center"
      style={{
        color,
        padding: "4cqh 4cqw",
        gap: "5cqw",
        justifyContent: wide ? "space-between" : "center",
      }}
    >
      <div className="flex items-center" style={{ gap: "3cqw" }}>
        <now.icon style={{ width: "min(45cqh, 22cqw)", height: "min(45cqh, 22cqw)" }} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "min(38cqh, 18cqw)",
              lineHeight: 1,
            }}
          >
            {Math.round(wx.temp)}°
          </div>
          <div style={{ fontSize: "min(10cqh, 5cqw)", opacity: 0.85 }}>
            {config.city ? `${config.city} · ` : ""}
            {now.label}
          </div>
        </div>
      </div>
      {wide ? (
        <div className="flex" style={{ gap: "3cqw" }}>
          {wx.days.slice(1, 1 + days).map((d) => {
            const w = wmo(d.code);
            const label = new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(
              new Date(`${d.date}T12:00:00`),
            );
            return (
              <div
                key={d.date}
                className="flex flex-col items-center"
                style={{ fontSize: "min(9cqh, 4cqw)", gap: "1.5cqh" }}
              >
                <div style={{ textTransform: "capitalize", opacity: 0.8 }}>
                  {label.replace(".", "")}
                </div>
                <w.icon style={{ width: "min(18cqh, 8cqw)", height: "min(18cqh, 8cqw)" }} />
                <div>
                  {Math.round(d.max)}° <span style={{ opacity: 0.6 }}>{Math.round(d.min)}°</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
