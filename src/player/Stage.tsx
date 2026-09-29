import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ZoneView } from "./ZoneView";
import { CampaignOverlay } from "./CampaignOverlay";
import { PLAYER_KEYFRAMES } from "./PlaylistRunner";
import { ensureFonts, mergeTheme, themeVars } from "./lib/theme";
import type { PlayerConfig } from "./lib/types";

function useWindowSize() {
  const [size, setSize] = useState({ w: 1920, h: 1080 });
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

/** Palco com a resolução do ecrã, escalado para caber na janela. */
export function Stage({ config, overlay }: { config: PlayerConfig; overlay?: ReactNode }) {
  const win = useWindowSize();
  const theme = useMemo(() => mergeTheme(config.theme), [config.theme]);
  useEffect(() => ensureFonts(theme), [theme]);

  const layout = config.layout;
  const orientation = layout?.orientation ?? config.screen.orientation ?? "landscape";
  let W = config.screen.width || 1920;
  let H = config.screen.height || 1080;
  // Se o layout for de outra orientação, troca as medidas para não deformar.
  if ((orientation === "portrait") !== H > W) [W, H] = [H, W];
  const scale = Math.min(win.w / W, win.h / H);

  const zones = useMemo(
    () => [...(layout?.zones ?? [])].sort((a, b) => a.z - b.z),
    [layout?.zones],
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <style>{PLAYER_KEYFRAMES}</style>
      <div
        data-stage
        style={{
          ...themeVars(theme),
          width: W,
          height: H,
          flex: "none",
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: layout?.background || theme.background,
          containerType: "size",
          color: theme.text,
        }}
      >
        {layout ? (
          zones.map((z) => (
            <ZoneView key={z.id} zone={z} config={config} theme={theme} orientation={orientation} />
          ))
        ) : (
          <NoLayout name={config.org.name} logo={config.org.logo_url} />
        )}
        <CampaignOverlay campaigns={config.campaigns} />
        {overlay}
      </div>
    </div>
  );
}

function NoLayout({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-[3cqh]"
      style={{ background: "var(--m-primary)" }}
    >
      {logo ? <img src={logo} alt="" className="max-h-[30%] max-w-[50%] object-contain" /> : null}
      <div style={{ fontFamily: "var(--font-display)", fontSize: "5cqh", fontWeight: 700 }}>
        {name}
      </div>
      <div style={{ fontSize: "2.4cqh", opacity: 0.6 }}>Sem layout atribuído a este ecrã.</div>
    </div>
  );
}
