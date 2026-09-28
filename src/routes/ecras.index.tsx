import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MonitorPlay, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/untypedDb";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenForm, orientationOf, type ScreenFormValue } from "@/features/screens/ScreenForm";
import {
  STATUS_META,
  lastSeen,
  screenStatus,
  shortAgent,
  type ScreenRow,
} from "@/features/screens/shared";

export const Route = createFileRoute("/ecras/")({
  head: () => ({
    meta: [
      { title: "Ecrãs — VRCF Montra" },
      { name: "description", content: "Ecrãs ligados, estado e layouts." },
      { property: "og:title", content: "Ecrãs — VRCF Montra" },
      { property: "og:description", content: "Ecrãs ligados, estado e layouts." },
    ],
  }),
  component: ScreensPage,
});

type LayoutLite = { id: string; name: string; orientation: string };

const EMPTY: ScreenFormValue = {
  name: "",
  width: 1920,
  height: 1080,
  timezone: "Europe/Lisbon",
  default_layout_id: null,
  notes: "",
};

function ScreensPage() {
  const { org, canEdit } = useOrg();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScreenRow[]>([]);
  const [layouts, setLayouts] = useState<LayoutLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ScreenFormValue>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [, setNow] = useState(0);
  const [maxScreens, setMaxScreens] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    const [s, l, o] = await Promise.all([
      supabase.from("screens").select("*").eq("org_id", org.org_id).order("name"),
      supabase.from("layouts").select("id,name,orientation").eq("org_id", org.org_id).order("name"),
      db.from("organizations").select("max_screens").eq("id", org.org_id).maybeSingle(),
    ]);
    setMaxScreens(
      ((o.data as { max_screens?: number | null } | null)?.max_screens ?? null) as number | null,
    );
    if (s.error) toast.error(s.error.message);
    setRows((s.data ?? []) as unknown as ScreenRow[]);
    setLayouts((l.data ?? []) as LayoutLite[]);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
      setNow((n) => n + 1);
    }, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const create = async () => {
    if (!org || !form.name.trim()) {
      toast.error("Dê um nome ao ecrã.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("screens")
      .insert({
        org_id: org.org_id,
        name: form.name.trim(),
        width: form.width,
        height: form.height,
        orientation: orientationOf(form.width, form.height),
        timezone: form.timezone,
        default_layout_id: form.default_layout_id,
        notes: form.notes || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setForm(EMPTY);
    void navigate({ to: "/ecras/$id", params: { id: data.id as string } });
  };

  const atLimit = maxScreens !== null && rows.length >= maxScreens;
  const layoutName = (id: string | null) => layouts.find((l) => l.id === id)?.name ?? "—";

  return (
    <AppShell
      title="Ecrãs"
      actions={
        <>
          {maxScreens !== null ? (
            <span className={`text-xs ${atLimit ? "text-amber-700" : "text-muted-foreground"}`}>
              {rows.length} de {maxScreens} ecrãs
            </span>
          ) : null}
          {canEdit ? (
            <Button
              onClick={() => setOpen(true)}
              disabled={atLimit}
              title={atLimit ? "Limite de ecrãs atingido. Contacte o administrador." : undefined}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo ecrã
            </Button>
          ) : null}
        </>
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="Sem ecrãs"
          description="Cada TV ou monitor é um ecrã. Crie um, abra o link no aparelho e fica a funcionar."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {rows.map((s) => {
            const st = STATUS_META[screenStatus(s)];
            return (
              <Link
                key={s.id}
                to="/ecras/$id"
                params={{ id: s.id }}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                <div className="min-w-[160px] flex-1">
                  <div className="font-medium">{s.name}</div>
                  <div className={`text-xs ${st.text}`}>
                    {st.label} · visto {lastSeen(s.last_seen_at)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Layout: <span className="text-foreground">{layoutName(s.default_layout_id)}</span>
                </div>
                <div className="w-full text-xs text-muted-foreground sm:w-auto">
                  {s.width}×{s.height}
                  {shortAgent(s.player_info?.["userAgent"])
                    ? ` · ${shortAgent(s.player_info?.["userAgent"])}`
                    : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo ecrã</DialogTitle>
          </DialogHeader>
          <ScreenForm value={form} onChange={setForm} layouts={layouts} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
