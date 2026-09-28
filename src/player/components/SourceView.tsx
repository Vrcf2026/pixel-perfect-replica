import { useEffect, useRef, useState } from "react";

export type SourceKind = "hls" | "ts" | "mp4" | "youtube" | "webpage" | "image" | "none";

export type SourceLike = {
  kind: SourceKind | string;
  url?: string | null;
  /** URL do vídeo/imagem da biblioteca (get_player_config devolve media_url). */
  media_url?: string | null;
  /** O que mostrar se a fonte falhar (imagem ou vídeo). */
  fallback_url?: string | null;
  muted?: boolean | null;
  volume?: number | null;
  loop?: boolean | null;
  fit?: string | null;
  /** Segundos até voltar a tentar depois de uma falha. */
  retry_s?: number | null;
};

const STALL_MS = 20_000;

function youtubeEmbed(url: string, muted: boolean) {
  let id = "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else id = u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop() ?? "";
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
    playsinline: "1",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function Fallback({ url, fit }: { url?: string | null | undefined; fit: "cover" | "contain" }) {
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/40">
        <span className="text-sm">A ligar…</span>
      </div>
    );
  }
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full bg-black"
        style={{ objectFit: fit }}
      />
    );
  }
  return <img src={url} alt="" className="h-full w-full bg-black" style={{ objectFit: fit }} />;
}

/** Reprodutor único para todos os tipos de fonte, com reserva e nova tentativa automática. */
export function SourceView({ source, className = "" }: { source: SourceLike; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const url = source.url || source.media_url || "";
  const muted = source.muted ?? true;
  const fit: "cover" | "contain" = source.fit === "contain" ? "contain" : "cover";
  const kind = source.kind;
  const retryMs = Math.max(5, source.retry_s ?? 60) * 1000;

  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Depois de uma falha, volta a tentar passado retry_s.
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => {
      setFailed(false);
      setAttempt((n) => n + 1);
    }, retryMs);
    return () => clearTimeout(t);
  }, [failed, retryMs]);

  // Se a fonte mudar, recomeça do zero.
  useEffect(() => {
    setFailed(false);
  }, [kind, url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || failed) return;
    if (kind !== "hls" && kind !== "ts" && kind !== "mp4") return;

    let destroy: (() => void) | undefined;
    let cancelled = false;
    const fail = () => {
      if (!cancelled) setFailed(true);
    };

    // Vigia: se o vídeo não avançar durante STALL_MS, dá como falhado.
    let lastTime = -1;
    let lastProgress = Date.now();
    const watchdog = setInterval(() => {
      if (video.paused && video.readyState < 2 && Date.now() - lastProgress > STALL_MS)
        return fail();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastProgress = Date.now();
      } else if (Date.now() - lastProgress > STALL_MS) {
        fail();
      }
    }, 5000);

    const onError = () => fail();
    video.addEventListener("error", onError);

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay com som bloqueado: força sem som para não ficar parado.
        if (!video.muted) {
          video.muted = true;
          void video.play().catch(() => {});
        }
      });
    };

    const start = async () => {
      video.muted = muted;
      video.volume = Math.min(1, Math.max(0, (source.volume ?? 100) / 100));
      video.loop = kind === "mp4" ? (source.loop ?? true) : false;

      if (kind === "mp4") {
        video.src = url;
        tryPlay();
        return;
      }

      if (kind === "hls") {
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;
        if (!Hls.isSupported()) {
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            tryPlay();
          } else fail();
          return;
        }
        const hls = new Hls({ liveSyncDurationCount: 3, backBufferLength: 30 });
        let mediaRecovered = false;
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
            mediaRecovered = true;
            hls.recoverMediaError();
            return;
          }
          fail();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        hls.loadSource(url);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
        return;
      }

      // ts (MPEG-TS por HTTP)
      const mpegts = (await import("mpegts.js")).default;
      if (cancelled) return;
      if (!mpegts.getFeatureList().mseLivePlayback) return fail();
      const player = mpegts.createPlayer({ type: "mpegts", isLive: true, url });
      player.on(mpegts.Events.ERROR, fail);
      player.attachMediaElement(video);
      player.load();
      tryPlay();
      destroy = () => player.destroy();
    };

    void start().catch(fail);
    return () => {
      cancelled = true;
      clearInterval(watchdog);
      video.removeEventListener("error", onError);
      destroy?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [kind, url, muted, source.volume, source.loop, attempt, failed]);

  if (kind === "none") {
    return (
      <div className={`h-full w-full ${className}`}>
        <Fallback url={source.fallback_url} fit={fit} />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-black text-white/60 ${className}`}
      >
        Sem endereço definido
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`h-full w-full ${className}`}>
        <Fallback url={source.fallback_url} fit={fit} />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className={`h-full w-full bg-black ${className}`}
        style={{ objectFit: fit }}
      />
    );
  }

  if (kind === "youtube") {
    return (
      <iframe
        key={attempt}
        src={youtubeEmbed(url, muted)}
        className={`h-full w-full border-0 bg-black ${className}`}
        allow="autoplay; encrypted-media"
        title="YouTube"
      />
    );
  }

  if (kind === "webpage") {
    return (
      <iframe
        key={attempt}
        src={url}
        className={`h-full w-full border-0 bg-white ${className}`}
        title="Página"
      />
    );
  }

  return (
    <video
      key={attempt}
      ref={videoRef}
      playsInline
      autoPlay
      muted={muted}
      className={`h-full w-full bg-black ${className}`}
      style={{ objectFit: fit }}
    />
  );
}

export default SourceView;
