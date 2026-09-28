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
    background: s.bg || undefined,
    border: s.border_width
      ? `${px(s.border_width, orientation)} solid ${s.border_color || "#000"}`
      : undefined,
    boxShadow: s.shadow ? "0 1cqw 3cqw rgba(0,0,0,.45)" : undefined,
    padding: s.padding ? px(s.padding, orientation) : undefined,
    opacity: s.opacity ?? 1,
    boxSizing: "border-box",
  };
}

/** Estilo do elemento interior de cada zona: torna-a um contentor para medidas em cqh/cqw. */
export const zoneInnerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  containerType: "size",
};
