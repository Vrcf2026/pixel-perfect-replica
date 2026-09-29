import { SourceView, type SourceLike } from "@/player/components/SourceView";
import { Slide } from "@/player/slides";
import type { SlideData } from "@/player/slides";
import { TickerZone } from "@/player/zones/TickerZone";
import { ClockZone } from "@/player/zones/ClockZone";
import { LogoZone, QrZone, TextZone, WebpageZone } from "@/player/zones/SimpleZones";
import { WeatherZone } from "@/player/zones/WeatherZone";
import { RssZone } from "@/player/zones/RssZone";
import type { Zone } from "./types";

export type PreviewContext = {
  sources: Array<SourceLike & { id: string; name: string }>;
  /** Primeiro item ativo de cada playlist, para a pré-visualização. */
  firstItems: Record<string, { kind: string; data: SlideData } | undefined>;
  logoUrl: string | null;
};

/** Conteúdo real de uma zona (usado no editor com "Ver conteúdo"). */
export function ZonePreview({ zone, ctx }: { zone: Zone; ctx: PreviewContext }) {
  const c = zone.config ?? {};
  switch (zone.kind) {
    case "main": {
      const src = ctx.sources.find((s) => s.id === zone.source_id);
      if (!src) return <Empty text="Sem fonte escolhida" />;
      return (
        <div className="relative h-full w-full">
          <SourceView source={src} />
          {c.show_live_badge ? (
            <div
              className="absolute top-[4cqh] left-[3cqw] flex items-center gap-[1cqw] rounded bg-black/60 px-[1.5cqw] py-[0.8cqh] font-semibold text-white"
              style={{ fontSize: "min(6cqh, 3cqw)" }}
            >
              <span className="inline-block h-[0.6em] w-[0.6em] rounded-full bg-red-600" />
              {c.live_label || "Em direto"}
            </div>
          ) : null}
        </div>
      );
    }
    case "playlist": {
      if (!zone.playlist_id) return <Empty text="Sem playlist escolhida" />;
      const first = ctx.firstItems[zone.playlist_id];
      if (!first) return <Empty text="Playlist vazia" />;
      return <Slide kind={first.kind} data={first.data} sources={ctx.sources} />;
    }
    case "ticker":
      return <TickerZone config={c} />;
    case "clock":
      return <ClockZone config={c} />;
    case "logo":
      return <LogoZone config={c} fallbackUrl={ctx.logoUrl} />;
    case "text":
      return <TextZone config={c} />;
    case "qr":
      return <QrZone config={c} />;
    case "webpage":
      return <WebpageZone config={c} />;
    case "weather":
      return <WeatherZone config={c} />;
    case "rss":
      return <RssZone zoneId={zone.id} config={c} />;
  }
}

function Empty({ text }: { text: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-black/80 text-white/60"
      style={{ fontSize: "min(8cqh, 4cqw)" }}
    >
      {text}
    </div>
  );
}
