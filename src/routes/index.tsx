import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Images, ListVideo, MonitorPlay, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — VRCF Montra" },
      { name: "description", content: "Resumo dos seus ecrãs, playlists e conteúdos." },
      { property: "og:title", content: "Painel — VRCF Montra" },
      { property: "og:description", content: "Resumo dos seus ecrãs, playlists e conteúdos." },
    ],
  }),
  component: PainelPage,
});

const CARDS = [
  { to: "/ecras", label: "Ecrãs", table: "screens", icon: MonitorPlay },
  { to: "/playlists", label: "Playlists", table: "playlists", icon: ListVideo },
  { to: "/fontes", label: "Fontes de vídeo", table: "sources", icon: Radio },
  { to: "/biblioteca", label: "Ficheiros", table: "media", icon: Images },
] as const;

function PainelPage() {
  const { org } = useOrg();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!org) return;
    Promise.all(
      CARDS.map(async (c) => {
        const { count } = await supabase
          .from(c.table)
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.org_id);
        return [c.table, count ?? 0] as const;
      }),
    ).then((entries) => setCounts(Object.fromEntries(entries)));
  }, [org]);

  return (
    <AppShell title="Painel">
      <p className="mb-6 text-sm text-muted-foreground">
        {org ? `Organização: ${org.name}` : ""}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-lg border bg-card p-5 transition-colors hover:border-accent"
          >
            <c.icon className="h-5 w-5 text-accent" />
            <div className="font-display mt-3 text-3xl font-bold">{counts[c.table] ?? "—"}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
