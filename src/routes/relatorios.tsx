import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — VRCF Montra" },
      { name: "description", content: "Quantas vezes passou cada conteúdo, por ecrã e por dia." },
      { property: "og:title", content: "Relatórios — VRCF Montra" },
      {
        property: "og:description",
        content: "Quantas vezes passou cada conteúdo, por ecrã e por dia.",
      },
    ],
  }),
  component: RelatoriosPage,
});

type Stat = {
  screen_id: string;
  item_key: string;
  item_id: string | null;
  playlist_id: string | null;
  label: string | null;
  kind: string | null;
  day: string;
  plays: number;
  seconds: number;
};

const KIND_LABEL: Record<string, string> = {
  product: "Produto",
  service: "Serviço",
  image: "Imagem",
  video: "Vídeo",
  stream: "Canal",
  text: "Texto",
  qr: "QR",
  webpage: "Página",
};

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function duration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

function RelatoriosPage() {
  const { org } = useOrg();
  const [days, setDays] = useState("7");
  const [screen, setScreen] = useState("all");
  const [screens, setScreens] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (Number(days) - 1));
    return isoDay(d);
  }, [days]);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    let q = db
      .from("play_stats")
      .select("*")
      .eq("org_id", org.org_id)
      .gte("day", from)
      .limit(10000);
    if (screen !== "all") q = q.eq("screen_id", screen);
    const [st, sc] = await Promise.all([
      q,
      supabase.from("screens").select("id,name").eq("org_id", org.org_id).order("name"),
    ]);
    if (st.error) toast.error(st.error.message);
    setRows((st.data ?? []) as Stat[]);
    setScreens((sc.data ?? []) as Array<{ id: string; name: string }>);
    setLoading(false);
  }, [org, from, screen]);

  useEffect(() => {
    void load();
  }, [load]);

  const byItem = useMemo(() => {
    const m = new Map<
      string,
      { label: string; kind: string; plays: number; seconds: number; screens: Set<string> }
    >();
    for (const r of rows) {
      const cur = m.get(r.item_key) ?? {
        label: r.label || r.item_key,
        kind: r.kind ?? "",
        plays: 0,
        seconds: 0,
        screens: new Set<string>(),
      };
      cur.plays += r.plays;
      cur.seconds += r.seconds;
      cur.screens.add(r.screen_id);
      if (r.label) cur.label = r.label;
      m.set(r.item_key, cur);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.plays - a.plays);
  }, [rows]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.day, (m.get(r.day) ?? 0) + r.plays);
    const out: Array<{ day: string; plays: number }> = [];
    const d = new Date(`${from}T12:00:00`);
    for (let i = 0; i < Number(days); i++) {
      const k = isoDay(d);
      out.push({ day: k, plays: m.get(k) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [rows, from, days]);

  const total = byItem.reduce((a, b) => a + b.plays, 0);
  const totalSec = byItem.reduce((a, b) => a + b.seconds, 0);
  const maxDay = Math.max(1, ...byDay.map((d) => d.plays));
  const screenName = (id: string) => screens.find((s) => s.id === id)?.name ?? "?";

  const exportCsv = () => {
    const lines = [["Data", "Ecrã", "Conteúdo", "Tipo", "Exibições", "Segundos"].join(";")];
    for (const r of [...rows].sort((a, b) => a.day.localeCompare(b.day))) {
      lines.push(
        [
          r.day,
          screenName(r.screen_id),
          (r.label ?? r.item_key).replace(/;/g, ","),
          KIND_LABEL[r.kind ?? ""] ?? r.kind ?? "",
          r.plays,
          r.seconds,
        ].join(";"),
      );
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `exibicoes-${org?.name ?? "montra"}-${from}.csv`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AppShell
      title="Relatórios"
      actions={
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hoje</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={screen} onValueChange={setScreen}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os ecrãs</SelectItem>
            {screens.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Ainda sem dados"
          description="Os ecrãs enviam o registo de exibições de 5 em 5 minutos. Volte daqui a pouco."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">{total.toLocaleString("pt-PT")}</div>
              <div className="text-sm text-muted-foreground">Exibições</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">{duration(totalSec)}</div>
              <div className="text-sm text-muted-foreground">Tempo no ecrã</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">{byItem.length}</div>
              <div className="text-sm text-muted-foreground">Conteúdos diferentes</div>
            </div>
          </div>

          {Number(days) > 1 ? (
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-3 text-sm font-semibold">Exibições por dia</div>
              <div className="flex h-36 items-end gap-1">
                {byDay.map((d) => (
                  <div
                    key={d.day}
                    className="group relative flex h-full flex-1 flex-col justify-end"
                    title={`${d.day}: ${d.plays}`}
                  >
                    <div
                      className="rounded-t bg-[#F28C28]"
                      style={{ height: `${(d.plays / maxDay) * 100}%`, minHeight: d.plays ? 2 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{new Date(`${byDay[0]?.day}T12:00:00`).toLocaleDateString("pt-PT")}</span>
                <span>
                  {new Date(`${byDay[byDay.length - 1]?.day}T12:00:00`).toLocaleDateString("pt-PT")}
                </span>
              </div>
            </section>
          ) : null}

          <section className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Conteúdo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium">Exibições</th>
                  <th className="px-4 py-2 text-right font-medium">Tempo</th>
                  <th className="px-4 py-2 text-right font-medium">Ecrãs</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byItem.map((r) => (
                  <tr key={r.key}>
                    <td className="max-w-[320px] truncate px-4 py-2">{r.label}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {r.plays.toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {duration(r.seconds)}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{r.screens.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-muted-foreground">
            Útil como prova de exibição para clientes ou anunciantes. O CSV abre diretamente no
            Excel.
          </p>
        </div>
      )}
    </AppShell>
  );
}
