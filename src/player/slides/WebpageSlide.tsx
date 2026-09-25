import { useEffect, useState } from "react";
import type { SlideProps } from "./types";

export function WebpageSlide({ data }: SlideProps) {
  const url = String(data.url ?? "");
  const zoom = Math.min(2, Math.max(0.5, Number(data.zoom) || 1));
  const refresh = Number(data.refresh_s) || 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!refresh) return;
    const id = setInterval(() => setTick((t) => t + 1), refresh * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[2.5cqw] text-white/60">
        Sem endereço
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <iframe
        key={`${url}-${tick}`}
        src={url}
        title="Página"
        className="border-0"
        style={{
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

export default WebpageSlide;
