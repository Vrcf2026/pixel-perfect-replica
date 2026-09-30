import type { CSSProperties } from "react";
import type { Theme } from "./types";

export const DEFAULT_THEME: Required<Theme> = {
  primary: "#0F1E36",
  accent: "#F28C28",
  background: "#0F1E36",
  surface: "#F3F5F8",
  text: "#F3F5F8",
  text_on_surface: "#0F1E36",
  muted: "#9DB0CC",
  font_display: "Barlow Condensed",
  font_body: "Barlow",
  radius: 12,
  currency: "EUR",
  locale: "pt-PT",
  price_suffix: "IVA incluído",
};

export const FONTS = [
  "Barlow Condensed",
  "Barlow",
  "Inter",
  "Oswald",
  "Bebas Neue",
  "Montserrat",
  "Roboto Condensed",
  "Archivo",
  "Anton",
  "Manrope",
  "Poppins",
  "Space Grotesk",
  "Orbitron",
  "Rajdhani",
  "Playfair Display",
];

export function mergeTheme(t?: Theme | null): Required<Theme> {
  return { ...DEFAULT_THEME, ...(t ?? {}) } as Required<Theme>;
}

/** Variáveis CSS lidas pelos slides e zonas (--m-*) e pelas fontes. */
export function themeVars(t: Required<Theme>): CSSProperties {
  return {
    ["--m-primary" as string]: t.primary,
    ["--m-accent" as string]: t.accent,
    ["--m-bg" as string]: t.background,
    ["--m-surface" as string]: t.surface,
    ["--m-text" as string]: t.text,
    ["--m-text-on-surface" as string]: t.text_on_surface,
    ["--m-muted" as string]: t.muted,
    ["--m-radius" as string]: `${t.radius}px`,
    ["--font-display" as string]: `"${t.font_display}", "Barlow Condensed", system-ui, sans-serif`,
    ["--font-body" as string]: `"${t.font_body}", "Barlow", system-ui, sans-serif`,
    fontFamily: "var(--font-body)",
  } as CSSProperties;
}

/** Carrega uma fonte do Google Fonts (uma vez). */
export function ensureFont(fam?: string | null) {
  if (typeof document === "undefined" || !fam || fam === "Barlow" || fam === "Barlow Condensed")
    return;
  const id = `font-${fam.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Carrega as fontes do tema a partir do Google Fonts (uma vez por família). */
export function ensureFonts(t: Required<Theme>) {
  if (typeof document === "undefined") return;
  for (const fam of new Set([t.font_display, t.font_body])) {
    if (!fam || fam === "Barlow" || fam === "Barlow Condensed") continue; // já carregadas
    const id = `font-${fam.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
}
