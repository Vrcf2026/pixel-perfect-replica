import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Megaphone, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignOverlay } from "@/player/CampaignOverlay";

export const Route = createFileRoute("/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos urgentes — VRCF Montra" },
      { name: "description", content: "Mensagens urgentes por cima de tudo, em todos os ecrãs." },
      { property: "og:title", content: "Avisos urgentes — VRCF Montra" },
      {
        property: "og:description",
        content: "Mensagens urgentes por cima de tudo, em todos os ecrãs.",
      },
    ],
  }),
  component: AvisosPage,
});

type Campaign = {
  id: string;
  title: string;
  body: string | null;
  style: "banner" | "fullscreen";
  bg: string;
  text_color: string;
  starts_at: string;
  ends_at: string;
  screen_ids: string[] | null;
  enabled: boolean;
};

const COLORS = [
  { bg: "#E11D48", text: "#FFFFFF", label: "Vermelho" },
  { bg: "#F28C28", text: "#0F1E36", label: "Laranja" },
  { bg: "#FACC15", text: "#0F1E36", label: "Amarelo" },
  { bg: "#16A34A", text: "#FFFFFF", label: "Verde" },
  { bg: "#0F1E36", text: "#FFFFFF", label: "Azul-noite" },
];

const DURATIONS = [
  { value: "1", label: "1 hora" },
  { value: "3", label: "3 horas" },
  { value: "today", label: "Até ao fim do dia" },
  { value: "24", label: "24 horas" },
  { value: "custom", label: "Escolher data e hora" },
];

function endOf(value: string, custom: string) {
  const now = new Date();
  if (value === "today") {
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    return d;
  }
  if (value === "custom") return custom ? new Date(custom) : null;
  return new Date(now.getTime() + Number(value) * 3600_000);
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function AvisosPage() {
  const { org, canEdit } = useOrg();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [screens, setScreens] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<"banner" | "fullscreen">("banner");
  const [color, setColor] = useState(0);
  const [duration, setDuration] = useState("3");
  const [custom, setCustom] = useState("");
  const [allScreens, setAllScreens] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!org) return;
    const [c, s] = await Promise.all([
      db
        .from("campaigns")
        .select("*")
        .eq("org_id", org.org_id)
        .order("starts_at", { ascending: false })
        .limit(50),
      supabase.from("screens").select("id,name").eq("org_id", org.org_id).order("name"),
    ]);
    if (c.error) toast.error(c.error.message);
    setRows((c.data ?? []) as Campaign[]);
    setScreens((s.data ?? []) as Array<{ id: string; name: string }>);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!org || !title.trim()) {
      toast.error("Escreva o título do aviso.");
      return;
    }
    const end = endOf(duration, custom);
    if (!end || end.getTime() <= Date.now()) {
      toast.error("A hora de fim tem de ser no futuro.");
      return;
    }
    if (!allScreens && picked.size === 0) {
      toast.error("Escolha pelo menos um ecrã.");
      return;
    }
    setBusy(true);
    const c = COLORS[color] ?? COLORS[0]!;
    const { error } = await db.from("campaigns").insert({
      org_id: org.org_id,
      title: title.trim(),
      body: body.trim() || null,
      style,
      bg: c.bg,
      text_color: c.text,
      ends_at: end.toISOString(),
      screen_ids: allScreens ? null : [...picked],
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aviso publicado. Aparece nos ecrãs em cerca de 20 segundos.");
    setOpen(false);
    setTitle("");
    setBody("");
    void load();
  };

  const stop = async (c: Campaign) => {
    const { error } = await db
      .from("campaigns")
      .update({ ends_at: new Date(Date.now() + 1000).toISOString() })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success("Aviso terminado.");
    void load();
  };

  const remove = async (c: Campaign) => {
    if (!confirm("Apagar este aviso do histórico?")) return;
    const { error } = await db.from("campaigns").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    void load();
  };

  const now = Date.now();
  const active = rows.filter((r) => new Date(r.ends_at).getTime() > now);
  const past = rows.filter((r) => new Date(r.ends_at).getTime() <= now);
  const c = COLORS[color] ?? COLORS[0]!;

  return (
    <AppShell
      title="Avisos urgentes"
      actions={
        canEdit ? (
          <Button
            onClick={() => setOpen(true)}
            className="bg-[#E11D48] text-white hover:bg-[#E11D48]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo aviso
          </Button>
        ) : null
      }
    >
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Um aviso aparece por cima de tudo, em todos os ecrãs (ou só nos que escolher), durante o
        tempo definido. Serve para encerramentos, avarias, promoções-relâmpago ou informações
        importantes.
      </p>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Sem avisos"
          description="Quando precisar, crie um aviso e ele aparece logo nos ecrãs."
        />
      ) : (
        <div className="space-y-6">
          {[
            { label: "A decorrer ou agendados", list: active },
            { label: "Terminados", list: past },
          ].map((g) =>
            g.list.length ? (
              <section key={g.label}>
                <div className="mb-2 text-sm font-semibold">{g.label}</div>
                <div className="divide-y rounded-lg border bg-card">
                  {g.list.map((r) => {
                    const running =
                      new Date(r.starts_at).getTime() <= now && new Date(r.ends_at).getTime() > now;
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="h-8 w-2 shrink-0 rounded" style={{ background: r.bg }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {r.title}
                            {running ? (
                              <span className="ml-2 text-xs font-normal text-red-600">● no ar</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.style === "fullscreen" ? "Ecrã inteiro" : "Faixa no topo"} ·{" "}
                            {fmt(r.starts_at)} → {fmt(r.ends_at)} ·{" "}
                            {r.screen_ids?.length
                              ? `${r.screen_ids.length} ecrã(s)`
                              : "todos os ecrãs"}
                          </div>
                        </div>
                        {canEdit && new Date(r.ends_at).getTime() > now ? (
                          <Button size="sm" variant="outline" onClick={() => void stop(r)}>
                            <Square className="mr-1.5 h-3.5 w-3.5" /> Terminar já
                          </Button>
                        ) : null}
                        {canEdit ? (
                          <Button size="sm" variant="ghost" onClick={() => void remove(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo aviso urgente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={title}
                maxLength={60}
                placeholder="Ex.: Fechado para inventário"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Texto (opcional)</Label>
              <Textarea
                rows={2}
                value={body}
                maxLength={200}
                placeholder="Ex.: Reabrimos amanhã às 9h00."
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Faixa no topo</SelectItem>
                    <SelectItem value="fullscreen">Ecrã inteiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {duration === "custom" ? (
              <div className="space-y-1.5">
                <Label>Termina em</Label>
                <Input
                  type="datetime-local"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((col, i) => (
                  <button
                    key={col.bg}
                    type="button"
                    title={col.label}
                    onClick={() => setColor(i)}
                    className={`h-8 w-8 rounded-full border-2 ${i === color ? "border-foreground" : "border-transparent"}`}
                    style={{ background: col.bg }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all"
                  checked={allScreens}
                  onCheckedChange={(v) => setAllScreens(v === true)}
                />
                <Label htmlFor="all">Todos os ecrãs</Label>
              </div>
              {!allScreens ? (
                <div className="grid gap-1.5 rounded-md border p-2 sm:grid-cols-2">
                  {screens.map((sc) => (
                    <label key={sc.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={picked.has(sc.id)}
                        onCheckedChange={(v) =>
                          setPicked((cur) => {
                            const n = new Set(cur);
                            if (v === true) n.add(sc.id);
                            else n.delete(sc.id);
                            return n;
                          })
                        }
                      />
                      {sc.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Pré-visualização</Label>
              <div
                className="relative aspect-video overflow-hidden rounded-md bg-[#0F1E36]"
                style={{ containerType: "size" }}
              >
                <CampaignOverlay
                  campaigns={[
                    {
                      id: "prev",
                      title: title || "Título do aviso",
                      body: body || null,
                      style,
                      bg: c.bg,
                      text_color: c.text,
                      starts_at: new Date(0).toISOString(),
                      ends_at: new Date(Date.now() + 86400_000).toISOString(),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publicar aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
