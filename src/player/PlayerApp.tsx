import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "./Stage";
import { playerClient } from "./lib/client";
import { recentErrors, reportPlayerError } from "./lib/errors";
import type { PlayerConfig } from "./lib/types";

const PING_MS = 20_000;
const REFRESH_MS = 5 * 60_000;
const PREVIEW_POLL_MS = 30_000;
const cacheKey = (token: string) => `montra:${token}`;

type Status = "loading" | "ok" | "offline" | "notfound";

function readCache(token: string): PlayerConfig | null {
  try {
    const raw = localStorage.getItem(cacheKey(token));
    return raw ? (JSON.parse(raw) as PlayerConfig) : null;
  } catch {
    return null;
  }
}

function msUntil4am() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function clearCaches() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("montra:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("montra-")).map((k) => caches.delete(k)));
  }
}

export function PlayerApp({ token, preview }: { token: string; preview: boolean }) {
  const [config, setConfig] = useState<PlayerConfig | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const versionRef = useRef<string | null>(null);
  const startedAt = useRef(Date.now());

  const apply = useCallback(
    (cfg: PlayerConfig) => {
      versionRef.current = cfg.version;
      setConfig(cfg);
      setStatus("ok");
      try {
        localStorage.setItem(cacheKey(token), JSON.stringify(cfg));
      } catch {
        /* armazenamento cheio: segue sem cache */
      }
    },
    [token],
  );

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await playerClient().rpc("get_player_config", { p_token: token });
      if (error) throw error;
      const cfg = data as PlayerConfig;
      if (cfg?.error === "screen_not_found") {
        setStatus("notfound");
        setConfig(null);
        return;
      }
      if (cfg.version !== versionRef.current) apply(cfg);
    } catch (e) {
      reportPlayerError(`Config: ${e instanceof Error ? e.message : String(e)}`);
      setStatus((s) => (s === "ok" ? s : "offline"));
    }
  }, [token, apply]);

  // Arranque: cache primeiro, depois rede.
  useEffect(() => {
    const cached = readCache(token);
    if (cached) {
      versionRef.current = null; // força aplicar a versão da rede quando chegar
      setConfig(cached);
      setStatus("ok");
    }
    void fetchConfig();
  }, [token, fetchConfig]);

  // Ping (ecrã online, comandos remotos, deteção de alterações).
  useEffect(() => {
    if (preview) {
      const id = setInterval(() => void fetchConfig(), PREVIEW_POLL_MS);
      return () => clearInterval(id);
    }
    const ping = async () => {
      try {
        const { data, error } = await playerClient().rpc("player_ping", {
          p_token: token,
          p_info: {
            userAgent: navigator.userAgent,
            screen: `${window.innerWidth}x${window.innerHeight}`,
            version: versionRef.current,
            uptime_s: Math.round((Date.now() - startedAt.current) / 1000),
            errors: recentErrors(),
          },
        });
        if (error) throw error;
        const res = data as { version?: string; command?: string | null; error?: string };
        if (res.error === "screen_not_found") {
          setStatus("notfound");
          return;
        }
        if (res.command === "reload") return window.location.reload();
        if (res.command === "clear_cache") {
          await clearCaches();
          return window.location.reload();
        }
        if (res.version && res.version !== versionRef.current) await fetchConfig();
      } catch (e) {
        reportPlayerError(`Ping: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    void ping();
    const a = setInterval(() => void ping(), PING_MS);
    const b = setInterval(() => void fetchConfig(), REFRESH_MS);
    const c = setTimeout(() => window.location.reload(), msUntil4am());
    return () => {
      clearInterval(a);
      clearInterval(b);
      clearTimeout(c);
    };
  }, [token, preview, fetchConfig]);

  // Ecrã sempre ligado, cursor escondido, cache de ficheiros.
  useEffect(() => {
    if (preview) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<typeof lock> };
    };
    const request = () =>
      nav.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    void request();
    const onVis = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVis);
    document.body.style.cursor = "none";
    document.body.style.background = "#000";
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.cursor = "";
      void lock?.release();
    };
  }, [preview]);

  if (status === "notfound") {
    return (
      <Message title="Ecrã não encontrado" text="Este link não existe ou o ecrã está desativado." />
    );
  }
  if (!config) {
    return status === "offline" ? (
      <Message title="Sem ligação" text="A tentar de novo…" />
    ) : (
      <Message title="" text="A carregar…" />
    );
  }

  return (
    <Stage
      config={config}
      overlay={
        preview ? (
          <div className="absolute top-[1.5%] right-[1.5%] z-[9999] rounded bg-black/70 px-[1%] py-[0.5%] text-[1.2cqw] text-white">
            {config.layout?.name ?? "Sem layout"} · v
            {config.version.split(".").slice(0, 2).join(".")}
          </div>
        ) : null
      }
    />
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-2 bg-black text-white/70">
      {title ? <div className="font-display text-2xl text-white">{title}</div> : null}
      <div className="text-sm">{text}</div>
    </div>
  );
}
