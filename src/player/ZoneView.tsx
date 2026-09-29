import { SourceView } from "@/player/components/SourceView";
import { TickerZone } from "@/player/zones/TickerZone";
import { ClockZone } from "@/player/zones/ClockZone";
import { LogoZone, QrZone, TextZone, WebpageZone } from "@/player/zones/SimpleZones";
import { WeatherZone } from "@/player/zones/WeatherZone";
import { RssZone } from "@/player/zones/RssZone";
import { zoneBoxStyle, zoneInnerStyle } from "@/player/zones/style";
import type { Orientation } from "@/player/zones/types";
import { PlaylistRunner } from "./PlaylistRunner";
import { ZoneErrorBoundary } from "./ZoneErrorBoundary";
import type { PlayerConfig, PlayerZone, Theme } from "./lib/types";

function Content({
  zone,
  config,
  theme,
}: {
  zone: PlayerZone;
  config: PlayerConfig;
  theme: Required<Theme>;
}) {
  const c = zone.config ?? {};
  const tz = config.screen.timezone;
  switch (zone.kind) {
    case "main": {
      const src = zone.source_id ? config.sources[zone.source_id] : undefined;
      if (!src) return <div className="h-full w-full bg-black" />;
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
    case "playlist":
      return zone.playlist ? (
        <PlaylistRunner
          playlist={zone.playlist}
          sources={config.sources}
          tz={tz}
          theme={theme}
          transitionOverride={c.transition_override}
          showProgress={c.show_progress}
          logoUrl={config.org.logo_url}
        />
      ) : null;
    case "ticker":
      return <TickerZone config={c} />;
    case "clock":
      return <ClockZone config={c} timezone={tz} />;
    case "logo":
      return <LogoZone config={c} fallbackUrl={config.org.logo_url} />;
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
    default:
      return null;
  }
}

export function ZoneView({
  zone,
  config,
  theme,
  orientation,
}: {
  zone: PlayerZone;
  config: PlayerConfig;
  theme: Required<Theme>;
  orientation: Orientation;
}) {
  const box = zoneBoxStyle(
    { ...zone, x: Number(zone.x), y: Number(zone.y), w: Number(zone.w), h: Number(zone.h) },
    orientation,
  );
  return (
    <div style={box}>
      <div style={{ ...zoneInnerStyle, borderRadius: box.borderRadius }}>
        <ZoneErrorBoundary name={zone.name}>
          <Content zone={zone} config={config} theme={theme} />
        </ZoneErrorBoundary>
      </div>
    </div>
  );
}
