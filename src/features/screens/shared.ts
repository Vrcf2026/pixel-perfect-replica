import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export const ONLINE_MS = 90_000;

export type ScreenRow = {
  id: string;
  org_id: string;
  name: string;
  token: string;
  orientation: "landscape" | "portrait";
  width: number;
  height: number;
  timezone: string;
  default_layout_id: string | null;
  theme_override: Record<string, string>;
  enabled: boolean;
  pending_command: string | null;
  last_seen_at: string | null;
  player_info: Record<string, unknown>;
  notes: string | null;
};

export type ScreenStatus = "online" | "offline" | "disabled" | "never";

export function screenStatus(s: Pick<ScreenRow, "enabled" | "last_seen_at">): ScreenStatus {
  if (!s.enabled) return "disabled";
  if (!s.last_seen_at) return "never";
  return Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_MS ? "online" : "offline";
}

export const STATUS_META: Record<ScreenStatus, { label: string; dot: string; text: string }> = {
  online: { label: "Online", dot: "bg-emerald-500", text: "text-emerald-700" },
  offline: { label: "Sem sinal", dot: "bg-red-500", text: "text-red-700" },
  disabled: { label: "Desativado", dot: "bg-slate-400", text: "text-slate-500" },
  never: { label: "Nunca ligado", dot: "bg-amber-400", text: "text-amber-700" },
};

export function lastSeen(iso: string | null) {
  if (!iso) return "nunca";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: pt });
}

/** Resumo legível do navegador/sistema a partir do user agent. */
export function shortAgent(ua: unknown) {
  const s = String(ua ?? "");
  if (!s) return "";
  const os = /Windows/.test(s)
    ? "Windows"
    : /Android/.test(s)
      ? "Android"
      : /CrOS/.test(s)
        ? "ChromeOS"
        : /Linux/.test(s)
          ? /arm|aarch64/i.test(s)
            ? "Linux ARM (Raspberry?)"
            : "Linux"
          : /Mac OS X/.test(s)
            ? "macOS"
            : "";
  const br = /Edg\//.test(s)
    ? "Edge"
    : /Chrome\//.test(s)
      ? "Chrome"
      : /Firefox\//.test(s)
        ? "Firefox"
        : /Safari\//.test(s)
          ? "Safari"
          : "";
  return [br, os].filter(Boolean).join(" · ");
}

export const RESOLUTIONS = [
  { value: "1920x1080", label: "Full HD horizontal (1920×1080)" },
  { value: "1280x720", label: "HD horizontal (1280×720)" },
  { value: "3840x2160", label: "4K horizontal (3840×2160)" },
  { value: "1080x1920", label: "Full HD vertical (1080×1920)" },
  { value: "custom", label: "Personalizada" },
];

export const TIMEZONES = [
  { value: "Europe/Lisbon", label: "Lisboa (Continente)" },
  { value: "Atlantic/Madeira", label: "Madeira" },
  { value: "Atlantic/Azores", label: "Açores" },
  { value: "Europe/London", label: "Londres" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Paris", label: "Paris" },
];

export const DAYS = [
  { n: 1, short: "Seg" },
  { n: 2, short: "Ter" },
  { n: 3, short: "Qua" },
  { n: 4, short: "Qui" },
  { n: 5, short: "Sex" },
  { n: 6, short: "Sáb" },
  { n: 7, short: "Dom" },
];

export function playerUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/player/${token}`;
}

export function newToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

const PALETTE = [
  "#2563EB",
  "#F28C28",
  "#16A34A",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#CA8A04",
  "#475569",
];
export function layoutColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length] as string;
}
