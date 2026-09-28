import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarX, Images, LayoutTemplate, ListVideo, MonitorPlay, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { STATUS_META, lastSeen, screenStatus } from "@/features/screens/shared";

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

type ScreenLite = { id: string; name: string; enabled: boolean; last_seen_at: string | null };
type Expiring = {
  id: string;
  playlist_id: string;
  kind: string;
  date_to: string;
  data: Record<string, unknown>;
  playlists: { name: string } | null;
};

const COUNTS = [
  { to: "/playlists", label: "Playlists", table: "playlists", icon: ListVideo },
  { to: "/layouts", label: "Layouts", table: "layouts", icon: LayoutTemplate },
  { to: "/fontes", label: "Fontes de vídeo", table: "sources", icon: Radio },
  { to: "/biblioteca", label: "Ficheiros", table: "media", icon: Images },
] as const;

function itemLabel(i: Expiring) {
  const d = i.data ?? {};
  return String(d["name"] ?? d["title"] ?? d["caption"] ?? i.kind);
}

function PainelPage() {
  const { org } = useOrg();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [screens, setScreens] = useState<ScreenLite[]>([]);
  const [expiring, setExpiring] = useState<Expiring[]>([]);

  useEffect(() => {
    if (!org) return;
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const [c, s, e] = await Promise.all([
        Promise.all(
          COUNTS.map(async (x) => {
            const { count } = await supabase
              .from(x.table)
              .select("id", { count: "exact", head: true })
              .eq("org_id", org.org_id);
            return [x.table, count ?? 0] as const;
          }),
        ),
        supabase
          .from("screens")
          .select("id,name,enabled,last_seen_at")
          .eq("org_id", org.org_id)
          .order("name"),
        supabase
          .from("playlist_items")
          .select("id,playlist_id,kind,date_to,data,playlists(name)")
          .eq("org_id", org.org_id)
          .eq("enabled", true)
          .gte("date_to", today)
          .lte("date_to", in7)
          .order("date_to"),
      ]);
      setCounts(Object.fromEntries(c));
      setScreens((s.data ?? []) as ScreenLite[]);
      setExpiring((e.data ?? []) as unknown as Expiring[]);
    };
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [org]);

  const online = screens.filter((s) => screenStatus(s) === "online").length;
  const problems = screens.filter((s) => ["offline", "never"].includes(screenStatus(s)));

  return (
    <AppShell title="Painel">
      <p className="mb-6 text-sm text-muted-foreground">{org ? `Organização: ${org.name}` : ""}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          to="/ecras"
          className="rounded-lg border bg-card p-5 transition-colors hover:border-accent"
        >
          <MonitorPlay className="h-5 w-5 text-accent" />
          <div className="font-display mt-3 text-3xl font-bold">
            {online}
            <span className="text-lg text-muted-foreground">/{screens.length}</span>
          </div>
          <div className="text-sm text-muted-foreground">Ecrãs online</div>
        </Link>
        {COUNTS.map((c) => (
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm font-semibold">Ecrãs sem sinal</div>
          {problems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {screens.length ? "Todos os ecrãs ativos estão ligados." : "Ainda não há ecrãs."}
            </p>
          ) : (
            <ul className="divide-y">
              {problems.map((s) => {
                const st = STATUS_META[screenStatus(s)];
                return (
                  <li key={s.id}>
                    <Link
                      to="/ecras/$id"
                      params={{ id: s.id }}
                      className="flex items-center gap-2 py-2 text-sm hover:underline"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {st.label} · {lastSeen(s.last_seen_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarX className="h-4 w-4 text-accent" /> A terminar nos próximos 7 dias
          </div>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conteúdo a expirar.</p>
          ) : (
            <ul className="divide-y">
              {expiring.map((i) => (
                <li key={i.id}>
                  <Link
                    to="/playlists/$id"
                    params={{ id: i.playlist_id }}
                    className="flex items-center gap-2 py-2 text-sm hover:underline"
                  >
                    <span className="min-w-0 flex-1 truncate">{itemLabel(i)}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.playlists?.name} · até {new Date(i.date_to).toLocaleDateString("pt-PT")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
