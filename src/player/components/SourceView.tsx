import { useEffect, useRef } from "react";

export type SourceKind = "hls" | "ts" | "mp4" | "youtube" | "webpage" | "image" | "none";

export type SourceLike = {
  kind: SourceKind | string;
  url?: string | null;
  muted?: boolean | null;
  volume?: number | null;
  loop?: boolean | null;
  fit?: string | null;
};

function youtubeEmbed(url: string, muted: boolean) {
  let id = "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else id = u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? "";
  } catch {
    id = url;
  }
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    controls: "0",
    loop: "1",
    playlist: id,
    modestbranding: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Reprodutor único para todos os tipos de fonte. */
export function SourceView({ source, className = "" }: { source: SourceLike; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const url = source.url ?? "";
  const muted = source.muted ?? true;
  const fit = (source.fit as "cover" | "contain") ?? "cover";
  const kind = source.kind;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    if (kind !== "hls" && kind !== "ts" && kind !== "mp4") return;

    let destroy: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      video.muted = muted;
      video.volume = Math.min(1, Math.max(0, (source.volume ?? 100) / 100));
      video.loop = source.loop ?? true;

      if (kind === "mp4") {
        video.src = url;
        void video.play().catch(() => {});
        return;
      }

      if (kind === "hls") {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          void video.play().catch(() => {});
          return;
        }
        const Hls = (await import("hls.js")).default;
        if (cancelled || !Hls.isSupported()) return;
        const hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => void video.play().catch(() => {}));
        destroy = () => hls.destroy();
        return;
      }

      // ts
      const mpegts = (await import("mpegts.js")).default;
      if (cancelled || !mpegts.getFeatureList().mseLivePlayback) return;
      const player = mpegts.createPlayer({ type: "mpegts", isLive: true, url });
      player.attachMediaElement(video);
      player.load();
      void player.play()?.catch?.(() => {});
      destroy = () => {
        player.destroy();
      };
    };

    void start();
    return () => {
      cancelled = true;
      destroy?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [kind, url, muted, source.volume, source.loop]);

  if (!url && kind !== "none") {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-black text-white/60 ${className}`}>
        Sem endereço definido
      </div>
    );
  }

  if (kind === "none") {
    return <div className={`h-full w-full bg-black ${className}`} />;
  }

  if (kind === "image") {
    return <img src={url} alt="" className={`h-full w-full object-${fit} ${className}`} />;
  }

  if (kind === "youtube") {
    return (
      <iframe
        src={youtubeEmbed(url, muted)}
        className={`h-full w-full border-0 ${className}`}
        allow="autoplay; encrypted-media"
        title="YouTube"
      />
    );
  }

  if (kind === "webpage") {
    return <iframe src={url} className={`h-full w-full border-0 bg-white ${className}`} title="Página" />;
  }

  return (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      muted={muted}
      className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} bg-black ${className}`}
    />
  );
}

export default SourceView;
