import type { CSSProperties } from "react";
import type { Orientation, ZoneStyle } from "./types";

/**
 * Converte medidas em "px de um ecrã de 1920 (ou 1080 na vertical) de largura"
 * para cqw, para ficarem iguais no editor, na pré-visualização e na TV.
 * O palco tem de ter `container-type: size`.
 */
export function px(n: number | undefined, orientation: Orientation = "landscape") {
  const base = orientation === "portrait" ? 10.8 : 19.2;
  return `${(n ?? 0) / base}cqw`;
}

export function zoneBoxStyle(
  zone: { x: number; y: number; w: number; h: number; z: number; radius: number; style: ZoneStyle },
  orientation: Orientation,
): CSSProperties {
  const s = zone.style ?? {};
  return {
    position: "absolute",
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.w}%`,
    height: `${zone.h}%`,
    zIndex: zone.z,
    borderRadius: px(zone.radius, orientation),
    overflow: "hidden",
    ...zoneBackground(s, orientation),
    ...(s.text_shadow
      ? { textShadow: "0 0.15cqw 0.6cqw rgba(0,0,0,.75), 0 0 1.2cqw rgba(0,0,0,.35)" }
      : {}),
    ...(s.font
      ? ({
          fontFamily: `"${s.font}", system-ui, sans-serif`,
          ["--font-display" as string]: `"${s.font}", system-ui, sans-serif`,
          ["--font-body" as string]: `"${s.font}", system-ui, sans-serif`,
        } as CSSProperties)
      : {}),
    border: s.border_width
      ? `${px(s.border_width, orientation)} solid ${s.border_color || "#000"}`
      : undefined,
    boxShadow: s.shadow ? "0 1cqw 3cqw rgba(0,0,0,.45)" : undefined,
    padding: s.padding ? px(s.padding, orientation) : undefined,
    opacity: s.opacity ?? 1,
    boxSizing: "border-box",
  };
}

/** "#RRGGBB" → "rgba(r,g,b,a)"; devolve a cor tal como está se não for hexadecimal. */
export function withAlpha(color: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const n = parseInt(m[1] as string, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function zoneBackground(s: ZoneStyle, orientation: Orientation): CSSProperties {
  const mode = s.bg_mode ?? (s.bg ? "solid" : "none");
  const c1 = s.bg || "#0F1E36";
  switch (mode) {
    case "none":
      return { background: "transparent" };
    case "gradient":
      return {
        background: `linear-gradient(${s.bg_angle ?? 135}deg, ${c1}, ${s.bg2 || "#2563EB"})`,
      };
    case "glass": {
      const blur = px(s.blur ?? 16, orientation);
      return {
        background: withAlpha(c1, s.glass_alpha ?? 0.45),
        backdropFilter: `blur(${blur}) saturate(1.3)`,
        WebkitBackdropFilter: `blur(${blur}) saturate(1.3)`,
      };
    }
    default:
      return { background: c1 };
  }
}

/** Estilo do elemento interior de cada zona: torna-a um contentor para medidas em cqh/cqw. */
export const zoneInnerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  containerType: "size",
};
