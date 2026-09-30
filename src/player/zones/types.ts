export type ZoneKind =
  "main" | "playlist" | "ticker" | "clock" | "logo" | "text" | "qr" | "webpage" | "weather" | "rss";
export type Orientation = "landscape" | "portrait";

/** layout_zones.style (medidas em px de um ecrã com 1920 de largura; escalam com o ecrã). */
export type ZoneStyle = {
  /** none = transparente; solid = cor; gradient = degradé; glass = vidro fosco */
  bg_mode?: "none" | "solid" | "gradient" | "glass";
  bg?: string;
  bg2?: string;
  bg_angle?: number;
  /** vidro: desfoque (px) e transparência (0–1) */
  blur?: number;
  glass_alpha?: number;
  text_shadow?: boolean;
  /** tipo de letra só desta zona (vazio = o do tema) */
  font?: string;
  border_color?: string;
  border_width?: number;
  shadow?: boolean;
  padding?: number;
  opacity?: number;
};

/** layout_zones.config: campos por tipo de zona (todos opcionais). */
export type ZoneConfig = {
  // main
  show_live_badge?: boolean;
  live_label?: string;
  // playlist
  transition_override?: "none" | "fade" | "slide" | "zoom" | null;
  show_progress?: boolean;
  // ticker
  messages?: string[];
  speed?: number;
  separator?: "dot" | "square" | "bar" | "none";
  font_size?: number;
  uppercase?: boolean;
  // clock
  format?: "HH:mm" | "HH:mm:ss";
  show_date?: boolean;
  date_format?: "long" | "short";
  // comuns
  bg?: string;
  text_color?: string;
  align?: "left" | "center" | "right";
  // logo
  image_url?: string;
  fit?: "contain" | "cover";
  // text
  title?: string;
  body?: string;
  size?: "s" | "m" | "l" | "xl";
  // qr
  url?: string;
  caption?: string;
  fg?: string;
  // webpage
  zoom?: number;
  refresh_s?: number;
  // weather
  city?: string;
  lat?: number;
  lon?: number;
  forecast_days?: number;
  // rss
  max_items?: number;
  mode?: "headline" | "ticker";
  source_label?: string;
};
