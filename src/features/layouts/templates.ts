import {
  Clock,
  Globe,
  Image as ImageIcon,
  ListVideo,
  QrCode,
  Radio,
  Type,
  AlignJustify,
  CloudSun,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import type { Orientation, ZoneConfig, ZoneKind, ZoneStyle } from "./types";

export const ZONE_KINDS: ZoneKind[] = [
  "main",
  "playlist",
  "ticker",
  "clock",
  "logo",
  "text",
  "qr",
  "webpage",
  "weather",
  "rss",
];

export const ZONE_META: Record<ZoneKind, { label: string; icon: LucideIcon; color: string }> = {
  main: { label: "TV / vídeo", icon: Radio, color: "#2563EB" },
  playlist: { label: "Playlist", icon: ListVideo, color: "#F28C28" },
  ticker: { label: "Rodapé", icon: AlignJustify, color: "#16A34A" },
  clock: { label: "Relógio", icon: Clock, color: "#7C3AED" },
  logo: { label: "Logótipo", icon: ImageIcon, color: "#0891B2" },
  text: { label: "Texto", icon: Type, color: "#DB2777" },
  qr: { label: "Código QR", icon: QrCode, color: "#475569" },
  webpage: { label: "Página web", icon: Globe, color: "#CA8A04" },
  weather: { label: "Meteorologia", icon: CloudSun, color: "#0EA5E9" },
  rss: { label: "Notícias (RSS)", icon: Newspaper, color: "#9333EA" },
};

export function defaultZoneConfig(kind: ZoneKind): ZoneConfig {
  switch (kind) {
    case "main":
      return { show_live_badge: false, live_label: "Em direto" };
    case "playlist":
      return { transition_override: null, show_progress: false };
    case "ticker":
      return {
        messages: ["Escreva aqui as suas mensagens"],
        speed: 80,
        bg: "#F28C28",
        text_color: "#0F1E36",
        separator: "square",
        font_size: 50,
        uppercase: false,
      };
    case "clock":
      return {
        format: "HH:mm",
        show_date: true,
        date_format: "long",
        align: "center",
        text_color: "#FFFFFF",
      };
    case "logo":
      return { fit: "contain", align: "center" };
    case "text":
      return { title: "Título", body: "", align: "center", text_color: "#FFFFFF", size: "m" };
    case "qr":
      return { url: "https://", caption: "", fg: "#0F1E36", bg: "#FFFFFF" };
    case "webpage":
      return { url: "https://", zoom: 1, refresh_s: 0 };
    case "weather":
      return { city: "Montijo", lat: 38.707, lon: -8.974, forecast_days: 3, text_color: "#FFFFFF" };
    case "rss":
      return { url: "", max_items: 10, mode: "headline", text_color: "#FFFFFF", source_label: "" };
  }
}

export function defaultZoneStyle(kind: ZoneKind): ZoneStyle {
  if (kind === "clock" || kind === "text" || kind === "weather" || kind === "rss")
    return { bg: "#0F1E36" };
  if (kind === "logo") return { bg: "#FFFFFF", padding: 16 };
  return {};
}

export type TemplateZone = {
  kind: ZoneKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  radius?: number;
};

export type LayoutTemplate = {
  id: string;
  name: string;
  description: string;
  orientation: Orientation;
  zones: TemplateZone[];
};

const TICKER: TemplateZone = {
  kind: "ticker",
  name: "Rodapé",
  x: 0,
  y: 93.3,
  w: 100,
  h: 6.7,
  z: 3,
};

export const TEMPLATES: LayoutTemplate[] = [
  {
    id: "fullscreen",
    name: "Ecrã inteiro",
    description: "Só a TV ou um vídeo, a ocupar tudo.",
    orientation: "landscape",
    zones: [{ kind: "main", name: "TV", x: 0, y: 0, w: 100, h: 100 }],
  },
  {
    id: "ads_only",
    name: "Só publicidade",
    description: "Playlist em grande com rodapé.",
    orientation: "landscape",
    zones: [{ kind: "playlist", name: "Publicidade", x: 0, y: 0, w: 100, h: 93.3 }, TICKER],
  },
  {
    id: "tv_products",
    name: "TV + produtos",
    description: "TV à esquerda, produtos à direita, serviços por baixo.",
    orientation: "landscape",
    zones: [
      { kind: "main", name: "TV", x: 0, y: 0, w: 64.6, h: 79.5 },
      { kind: "playlist", name: "Serviços", x: 0, y: 79.5, w: 64.6, h: 13.8 },
      { kind: "playlist", name: "Produtos", x: 64.6, y: 0, w: 35.4, h: 93.3 },
      TICKER,
    ],
  },
  {
    id: "tv_corner",
    name: "TV no canto",
    description: "Publicidade em grande, TV num quadrado.",
    orientation: "landscape",
    zones: [
      { kind: "playlist", name: "Publicidade", x: 0, y: 0, w: 100, h: 93.3 },
      { kind: "main", name: "TV", x: 65.4, y: 58.5, w: 31.2, h: 31.3, z: 2, radius: 12 },
      TICKER,
    ],
  },
  {
    id: "l_shape",
    name: "Forma em L",
    description: "TV grande com coluna e faixa de publicidade.",
    orientation: "landscape",
    zones: [
      { kind: "main", name: "TV", x: 0, y: 0, w: 75, h: 80 },
      { kind: "playlist", name: "Lateral", x: 75, y: 0, w: 25, h: 80 },
      { kind: "playlist", name: "Inferior", x: 0, y: 80, w: 75, h: 20 },
      { kind: "clock", name: "Relógio", x: 75, y: 80, w: 25, h: 20 },
    ],
  },
  {
    id: "two_cols",
    name: "Duas colunas",
    description: "Duas playlists lado a lado.",
    orientation: "landscape",
    zones: [
      { kind: "playlist", name: "Esquerda", x: 0, y: 0, w: 50, h: 93.3 },
      { kind: "playlist", name: "Direita", x: 50, y: 0, w: 50, h: 93.3 },
      TICKER,
    ],
  },
  {
    id: "blank_landscape",
    name: "Em branco",
    description: "Começar do zero.",
    orientation: "landscape",
    zones: [],
  },
  {
    id: "totem_ads",
    name: "Totem publicidade",
    description: "Ecrã vertical só com publicidade.",
    orientation: "portrait",
    zones: [
      { kind: "playlist", name: "Publicidade", x: 0, y: 0, w: 100, h: 95 },
      { kind: "ticker", name: "Rodapé", x: 0, y: 95, w: 100, h: 5, z: 3 },
    ],
  },
  {
    id: "totem_tv",
    name: "Totem com TV",
    description: "TV em cima, publicidade por baixo.",
    orientation: "portrait",
    zones: [
      { kind: "main", name: "TV", x: 0, y: 0, w: 100, h: 35 },
      { kind: "playlist", name: "Publicidade", x: 0, y: 35, w: 100, h: 60 },
      { kind: "ticker", name: "Rodapé", x: 0, y: 95, w: 100, h: 5, z: 3 },
    ],
  },
  {
    id: "blank_portrait",
    name: "Em branco",
    description: "Começar do zero.",
    orientation: "portrait",
    zones: [],
  },
];

export { px } from "@/player/zones/style";

export const round1 = (n: number) => Math.round(n * 10) / 10;
