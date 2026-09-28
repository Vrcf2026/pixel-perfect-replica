import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Lock } from "lucide-react";
import { zoneBoxStyle, zoneInnerStyle } from "@/player/zones/style";
import { ZONE_META } from "./templates";
import { ZonePreview, type PreviewContext } from "./ZonePreview";
import type { Orientation, Zone } from "./types";

type Rect = { x: number; y: number; w: number; h: number };
type Dir = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN = 2;
const snap = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (n: number) => Math.round(n * 10) / 10;

export function applyDrag(start: Rect, dir: Dir, dx: number, dy: number, step: number): Rect {
  let { x, y, w, h } = start;
  if (dir === "move") {
    x = clamp(snap(start.x + dx, step), 0, 100 - w);
    y = clamp(snap(start.y + dy, step), 0, 100 - h);
    return { x: r1(x), y: r1(y), w, h };
  }
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  if (dir.includes("e")) w = clamp(snap(right + dx, step), start.x + MIN, 100) - start.x;
  if (dir.includes("s")) h = clamp(snap(bottom + dy, step), start.y + MIN, 100) - start.y;
  if (dir.includes("w")) {
    x = clamp(snap(start.x + dx, step), 0, right - MIN);
    w = right - x;
  }
  if (dir.includes("n")) {
    y = clamp(snap(start.y + dy, step), 0, bottom - MIN);
    h = bottom - y;
  }
  return { x: r1(x), y: r1(y), w: r1(w), h: r1(h) };
}

const HANDLES: Array<{ dir: Dir; cls: string; cursor: string }> = [
  { dir: "nw", cls: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
  { dir: "n", cls: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { dir: "ne", cls: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
  { dir: "e", cls: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { dir: "se", cls: "-right-1.5 -bottom-1.5", cursor: "nwse-resize" },
  { dir: "s", cls: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { dir: "sw", cls: "-left-1.5 -bottom-1.5", cursor: "nesw-resize" },
  { dir: "w", cls: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

export function Canvas({
  zones,
  orientation,
  background,
  selectedId,
  hidden,
  locked,
  showGrid,
  showContent,
  preview,
  readOnly,
  onSelect,
  onRect,
}: {
  zones: Zone[];
  orientation: Orientation;
  background: string;
  selectedId: string | null;
  hidden: Set<string>;
  locked: Set<string>;
  showGrid: boolean;
  showContent: boolean;
  preview: PreviewContext;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onRect: (id: string, rect: Rect) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const startDrag = (e: ReactPointerEvent, zone: Zone, dir: Dir) => {
    e.stopPropagation();
    onSelect(zone.id);
    if (readOnly || locked.has(zone.id) || e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const box = el.getBoundingClientRect();
    const start = { x: zone.x, y: zone.y, w: zone.w, h: zone.h };
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / box.width) * 100;
      const dy = ((ev.clientY - sy) / box.height) * 100;
      if (!moved && Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
      moved = true;
      const step = ev.altKey ? 0.1 : 0.5;
      onRect(zone.id, applyDrag(start, dir, dx, dy, step));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const visible = [...zones]
    .filter((z) => !hidden.has(z.id))
    .sort((a, b) => a.z - b.z || a.position - b.position);

  return (
    <div
      ref={ref}
      data-stage
      onPointerDown={() => onSelect(null)}
      className={`relative mx-auto w-full touch-none overflow-hidden rounded-md shadow-inner select-none ${
        orientation === "portrait" ? "aspect-[9/16] max-w-[420px]" : "aspect-video"
      }`}
      style={{ background, containerType: "size" }}
    >
      {visible.map((zone) => {
        const meta = ZONE_META[zone.kind];
        const Icon = meta.icon;
        const selected = zone.id === selectedId;
        const isLocked = locked.has(zone.id);
        const needsContent =
          (zone.kind === "main" && !zone.source_id) ||
          (zone.kind === "playlist" && !zone.playlist_id);
        return (
          <div
            key={zone.id}
            style={{ ...zoneBoxStyle(zone, orientation), overflow: "visible" }}
            onPointerDown={(e) => startDrag(e, zone, "move")}
            className={isLocked || readOnly ? "cursor-default" : "cursor-move"}
          >
            <div
              style={{
                ...zoneInnerStyle,
                borderRadius: zoneBoxStyle(zone, orientation).borderRadius,
              }}
            >
              {showContent ? (
                <div className="pointer-events-none h-full w-full">
                  <ZonePreview zone={zone} ctx={preview} />
                </div>
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-white"
                  style={{
                    background: `${meta.color}cc`,
                    outline: needsContent ? "2px dashed #F28C28" : undefined,
                    outlineOffset: -4,
                  }}
                >
                  <Icon className="h-[min(22cqh,24px)] w-[min(22cqh,24px)] opacity-90" />
                  <div className="max-w-full truncate px-1 text-[min(14cqh,13px)] font-semibold">
                    {zone.name}
                  </div>
                  {needsContent ? (
                    <div className="text-[min(11cqh,11px)] text-[#FFD7B0]">Escolher…</div>
                  ) : null}
                </div>
              )}
            </div>
            {selected ? (
              <div className="pointer-events-none absolute inset-0 z-10 ring-2 ring-[#F28C28] ring-inset" />
            ) : null}
            {isLocked ? (
              <Lock className="absolute top-1 right-1 z-10 h-3.5 w-3.5 rounded bg-black/50 p-0.5 text-white" />
            ) : null}
            {selected && !isLocked && !readOnly
              ? HANDLES.map((hd) => (
                  <div
                    key={hd.dir}
                    onPointerDown={(e) => startDrag(e, zone, hd.dir)}
                    className={`absolute z-20 h-3 w-3 rounded-sm border border-[#0F1E36] bg-white ${hd.cls}`}
                    style={{ cursor: hd.cursor }}
                  />
                ))
              : null}
          </div>
        );
      })}
      {showGrid ? (
        <div
          className="pointer-events-none absolute inset-0 z-[999]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "5% 5%",
          }}
        />
      ) : null}
    </div>
  );
}
