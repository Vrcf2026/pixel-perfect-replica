import { ZONE_META } from "./templates";
import type { Orientation, ZoneKind } from "./types";

type ThumbZone = {
  kind: ZoneKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  name?: string;
};

/** Miniatura de um layout: retângulos proporcionais coloridos por tipo de zona. */
export function LayoutThumb({
  zones,
  orientation,
  background = "#0F1E36",
  className = "",
}: {
  zones: ThumbZone[];
  orientation: Orientation;
  background?: string | undefined;
  className?: string | undefined;
}) {
  const sorted = [...zones].sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
  return (
    <div
      className={`relative overflow-hidden rounded-md border ${orientation === "portrait" ? "aspect-[9/16]" : "aspect-video"} ${className}`}
      style={{ background }}
    >
      {sorted.map((z, i) => {
        const meta = ZONE_META[z.kind];
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center overflow-hidden border border-white/70 text-[9px] font-semibold text-white"
            style={{
              left: `${z.x}%`,
              top: `${z.y}%`,
              width: `${z.w}%`,
              height: `${z.h}%`,
              background: meta.color,
              opacity: 0.85,
            }}
            title={z.name ?? meta.label}
          >
            <span className="truncate px-0.5">{z.name ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
