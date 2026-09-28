import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const PlayerApp = lazy(() => import("@/player/PlayerApp").then((m) => ({ default: m.PlayerApp })));

export const Route = createFileRoute("/player/$token")({
  validateSearch: (s: Record<string, unknown>) => ({
    preview: s["preview"] === "1" || s["preview"] === 1,
  }),
  head: () => ({
    meta: [
      { title: "VRCF Montra" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: PlayerRoute,
});

function PlayerRoute() {
  const { token } = Route.useParams();
  const { preview } = Route.useSearch();
  // O player só corre no browser (sem renderização no servidor).
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (!client) return <div className="fixed inset-0 bg-black" />;
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <PlayerApp token={token} preview={preview} />
    </Suspense>
  );
}
