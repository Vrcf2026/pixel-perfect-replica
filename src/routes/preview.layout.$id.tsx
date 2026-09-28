import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useOrg } from "@/features/org/OrgContext";
import { buildPreviewConfig } from "@/features/layouts/previewConfig";
import type { PlayerConfig } from "@/player/lib/types";

const Stage = lazy(() => import("@/player/Stage").then((m) => ({ default: m.Stage })));

export const Route = createFileRoute("/preview/layout/$id")({
  head: () => ({
    meta: [
      { title: "Pré-visualizar layout — VRCF Montra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewLayout,
});

function PreviewLayout() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { org, loading } = useOrg();
  const [config, setConfig] = useState<PlayerConfig | null>(null);
  const [missing, setMissing] = useState(false);
  const [bar, setBar] = useState(true);

  useEffect(() => {
    if (!org) return;
    void buildPreviewConfig(id, org.org_id).then((c) => {
      setConfig(c);
      setMissing(!c);
    });
  }, [id, org]);

  useEffect(() => {
    const t = setTimeout(() => setBar(false), 4000);
    const show = () => {
      setBar(true);
      clearTimeout(t);
    };
    window.addEventListener("mousemove", show, { once: true });
    return () => clearTimeout(t);
  }, [bar]);

  if (authLoading || loading) return <div className="fixed inset-0 bg-black" />;
  if (!user)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <Link to="/login" className="underline">
          Inicie sessão para pré-visualizar
        </Link>
      </div>
    );
  if (missing)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white/70">
        Layout não encontrado.
      </div>
    );
  if (!config) return <div className="fixed inset-0 bg-black" />;

  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
        <Stage config={config} />
      </Suspense>
      <div
        className={`fixed top-3 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 px-4 py-2 text-sm text-white transition-opacity ${
          bar ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span>Pré-visualização: {config.layout?.name}</span>
        <Link
          to="/layouts/$id"
          params={{ id }}
          className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
        >
          Voltar ao editor
        </Link>
      </div>
    </>
  );
}
