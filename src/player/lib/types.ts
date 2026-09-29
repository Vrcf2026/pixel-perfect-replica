import type { SourceLike } from "@/player/components/SourceView";
import type { ZoneConfig, ZoneKind, ZoneStyle, Orientation } from "@/player/zones/types";

export type Theme = {
  primary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  text_on_surface?: string;
  muted?: string;
  font_display?: string;
  font_body?: string;
  radius?: number;
  currency?: string;
  locale?: string;
  price_suffix?: string;
};

export type PlayerItem = {
  id: string;
  kind: string;
  position?: number;
  duration_s: number | null;
  data: Record<string, unknown>;
  date_from: string | null;
  date_to: string | null;
  days: number[] | null;
  time_from: string | null;
  time_to: string | null;
};

export type PlayerPlaylist = {
  id: string;
  name: string;
  shuffle: boolean;
  default_duration_s: number;
  transition: "none" | "fade" | "slide" | "zoom" | string;
  items: PlayerItem[];
};

export type PlayerZone = {
  id: string;
  name: string;
  kind: ZoneKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  radius: number;
  style: ZoneStyle;
  config: ZoneConfig;
  source_id: string | null;
  playlist: PlayerPlaylist | null;
};

export type PlayerSource = SourceLike & { id: string; name?: string };

export type Campaign = {
  id: string;
  title: string;
  body: string | null;
  style: "banner" | "fullscreen";
  bg: string;
  text_color: string;
  starts_at: string;
  ends_at: string;
};

export type PlayerConfig = {
  campaigns?: Campaign[];
  error?: string;
  version: string;
  generated_at?: string;
  screen: {
    id: string;
    name: string;
    orientation: Orientation;
    width: number;
    height: number;
    timezone: string;
  };
  org: { name: string; logo_url: string | null };
  theme: Theme;
  sources: Record<string, PlayerSource>;
  layout: {
    id: string;
    name: string;
    orientation: Orientation;
    background: string;
    zones: PlayerZone[];
  } | null;
};
