import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slide } from "@/player/slides";
import type { SlideData } from "@/player/slides";
import { SourceView } from "@/player/components/SourceView";
import { isItemActive } from "./lib/time";
import { expandCatalog } from "./lib/catalog";
import { reportPlayerError } from "./lib/errors";
import type { PlayerPlaylist, PlayerSource, Theme } from "./lib/types";

type Entry = {
  key: string;
  kind: string;
  data: Record<string, unknown>;
  /** null = até o vídeo acabar */
  durationMs: number | null;
};

const MAX_VIDEO_MS = 15 * 60 * 1000;
const EMPTY_RETRY_MS = 30 * 1000;

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

function preload(entry: Entry | undefined) {
  if (!entry || typeof Image === "undefined") return;
  const url = entry.data["image_url"] ?? entry.data["bg_image_url"];
  if (typeof url === "string" && url) {
    const img = new Image();
    img.src = url;
  }
}

async function buildQueue(playlist: PlayerPlaylist, tz: string): Promise<Entry[]> {
  const def = Math.max(1, playlist.default_duration_s || 8) * 1000;
  let items = playlist.items.filter((it) => isItemActive(it, tz));
  if (playlist.shuffle) items = shuffle(items);
  const out: Entry[] = [];
  for (const it of items) {
    const dur = it.duration_s ? it.duration_s * 1000 : null;
    if (it.kind === "catalog_feed") {
      try {
        const rows = await expandCatalog(it.data);
        const per = Math.max(2, Number(it.data["per_item_s"]) || 8) * 1000;
        rows.forEach((row, i) =>
          out.push({ key: `${it.id}:${i}`, kind: "product", data: row, durationMs: per }),
        );
      } catch (e) {
        reportPlayerError(`Catálogo: ${e instanceof Error ? e.message : String(e)}`);
      }
      continue;
    }
    if (it.kind === "video") {
      out.push({ key: it.id, kind: "video", data: it.data, durationMs: dur });
      continue;
    }
    out.push({ key: it.id, kind: it.kind, data: it.data, durationMs: dur ?? def });
  }
  return out;
}

const ANIM: Record<string, string> = {
  fade: "montra-fade 600ms ease both",
  slide: "montra-slide 600ms cubic-bezier(.2,.7,.2,1) both",
  zoom: "montra-zoom 600ms ease both",
  none: "none",
};

export function PlaylistRunner({
  playlist,
  sources,
  tz,
  theme,
  transitionOverride,
  showProgress,
  logoUrl,
}: {
  playlist: PlayerPlaylist;
  sources: Record<string, PlayerSource>;
  tz: string;
  theme: Required<Theme>;
  transitionOverride?: string | null | undefined;
  showProgress?: boolean | undefined;
  logoUrl?: string | null | undefined;
}) {
  const [current, setCurrent] = useState<Entry | null>(null);
  const [prev, setPrev] = useState<Entry | null>(null);
  const [empty, setEmpty] = useState(false);
  const [tick, setTick] = useState(0);
  const queue = useRef<Entry[]>([]);
  const pos = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const currentRef = useRef<Entry | null>(null);
  currentRef.current = current;

  // Muda só quando o conteúdo da playlist muda de facto.
  const signature = useMemo(() => JSON.stringify(playlist), [playlist]);
  const transition = transitionOverride || playlist.transition || "fade";
  const sourceList = useMemo(() => Object.values(sources), [sources]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const advance = useCallback(async () => {
    clear();
    if (pos.current >= queue.current.length) {
      queue.current = await buildQueue(JSON.parse(signature) as PlayerPlaylist, tz);
      pos.current = 0;
      if (!alive.current) return;
      if (queue.current.length === 0) {
        setEmpty(true);
        setPrev(null);
        setCurrent(null);
        timer.current = setTimeout(() => void advance(), EMPTY_RETRY_MS);
        return;
      }
    }
    setEmpty(false);
    const entry = queue.current[pos.current++] as Entry;
    preload(queue.current[pos.current]);
    const cur = currentRef.current;
    if (cur && cur.key === entry.key) {
      setTick((n) => n + 1); // mesmo item: não repete a animação
    } else {
      setPrev(cur);
      setCurrent(entry);
    }
    const ms = entry.durationMs ?? MAX_VIDEO_MS;
    timer.current = setTimeout(() => void advance(), ms);
  }, [signature, tz]);

  useEffect(() => {
    alive.current = true;
    queue.current = [];
    pos.current = 0;
    void advance();
    return () => {
      alive.current = false;
      clear();
    };
  }, [advance]);

  // Remove a camada anterior depois da transição.
  useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 700);
    return () => clearTimeout(t);
  }, [prev]);

  const render = (e: Entry) => {
    if (e.kind === "video") {
      const d = e.data;
      return (
        <video
          src={String(d["video_url"] ?? "")}
          autoPlay
          playsInline
          muted={d["muted"] !== false}
          loop={e.durationMs !== null}
          onEnded={() => e.durationMs === null && void advance()}
          onError={() => {
            reportPlayerError(`Vídeo falhou: ${String(d["video_url"] ?? "")}`);
            void advance();
          }}
          className="h-full w-full"
          style={{
            objectFit: d["fit"] === "contain" ? "contain" : "cover",
            background: String(d["bg"] ?? "#000"),
          }}
        />
      );
    }
    if (e.kind === "stream") {
      const src = sources[String(e.data["source_id"] ?? "")];
      return src ? <SourceView source={src} /> : null;
    }
    const data = (
      e.kind === "product"
        ? {
            currency: theme.currency,
            locale: theme.locale,
            ...e.data,
            price_suffix: e.data["price_suffix"] ?? theme.price_suffix,
          }
        : e.data
    ) as SlideData;
    return <Slide kind={e.kind} data={data} sources={sourceList} />;
  };

  if (empty || !current) {
    return logoUrl ? (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: "var(--m-primary)" }}
      >
        <img src={logoUrl} alt="" className="max-h-[40%] max-w-[60%] object-contain" />
      </div>
    ) : (
      <div className="h-full w-full" style={{ background: "var(--m-primary)" }} />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {(prev ? [prev, current] : [current]).map((e) => (
        <div
          key={e.key}
          className="absolute inset-0"
          style={{ animation: prev && e === current ? ANIM[transition] : "none" }}
        >
          {render(e)}
        </div>
      ))}
      {showProgress && current.durationMs ? (
        <div className="absolute right-0 bottom-0 left-0 z-10 h-[0.8cqh] bg-black/20">
          <div
            key={`${current.key}-${tick}`}
            className="h-full"
            style={{
              background: "var(--m-accent)",
              animation: `montra-progress ${current.durationMs}ms linear both`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Keyframes usados pelo player (incluir uma vez no palco). */
export const PLAYER_KEYFRAMES = `
@keyframes montra-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes montra-slide { from { transform: translateX(100%) } to { transform: none } }
@keyframes montra-zoom { from { opacity: 0; transform: scale(1.06) } to { opacity: 1; transform: none } }
@keyframes montra-progress { from { width: 0 } to { width: 100% } }
@keyframes montra-kenburns { from { transform: scale(1) } to { transform: scale(1.08) } }
@media (prefers-reduced-motion: reduce) {
  [style*="montra-slide"], [style*="montra-zoom"] { animation: montra-fade 300ms ease both !important; }
}
`;
