import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrImage } from "@/player/components/QrImage";
import { ScreenForm, orientationOf, type ScreenFormValue } from "@/features/screens/ScreenForm";
import { KioskHelp } from "@/features/screens/KioskHelp";
import { WeekView, type ScheduleRow } from "@/features/screens/WeekView";
import {
  EMPTY_SCHEDULE,
  ScheduleDialog,
  type ScheduleDraft,
} from "@/features/screens/ScheduleDialog";
import {
  DAYS,
  STATUS_META,
  lastSeen,
  layoutColor,
  newToken,
  playerUrl,
  screenStatus,
  shortAgent,
  type ScreenRow,
} from "@/features/screens/shared";

export const Route = createFileRoute("/ecras/$id")({
  head: () => ({
    meta: [
      { title: "Ecrã — VRCF Montra" },
      { name: "description", content: "Estado, horários e instalação do ecrã." },
      { property: "og:title", content: "Ecrã — VRCF Montra" },
      { property: "og:description", content: "Estado, horários e instalação do ecrã." },
    ],
  }),
  component: ScreenPage,
});

type LayoutLite = { id: string; name: string; orientation: string };

function ScreenPage() {
  const { id } = Route.useParams();
  const { org, canEdit } = useOrg();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenRow | null>(null);
  const [layouts, setLayouts] = useState<LayoutLite[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [form, setForm] = useState<ScreenFormValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ScheduleDraft | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [, setTick] = useState(0);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (initial = false) => {
      if (!org) return;
      const [s, l, sc] = await Promise.all([
        supabase.from("screens").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("layouts")
          .select("id,name,orientation")
          .eq("org_id", org.org_id)
          .order("name"),
        supabase
          .from("schedules")
          .select("*")
          .eq("screen_id", id)
          .order("priority", { ascending: false }),
      ]);
      const row = (s.data ?? null) as unknown as ScreenRow | null;
      setScreen(row);
      setLayouts((l.data ?? []) as LayoutLite[]);
      setSchedules((sc.data ?? []) as unknown as ScheduleRow[]);
      if (initial && row) {
        setForm({
          name: row.name,
          width: row.width,
          height: row.height,
          timezone: row.timezone,
          default_layout_id: row.default_layout_id,
          notes: row.notes ?? "",
        });
      }
      setLoading(false);
    },
    [id, org],
  );

  useEffect(() => {
    void load(true);
    const t = setInterval(() => {
      void load();
      setTick((n) => n + 1);
    }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const url = screen ? playerUrl(screen.token) : "";
  const layoutName = useCallback(
    (lid: string) => layouts.find((l) => l.id === lid)?.name ?? "?",
    [layouts],
  );
  const defaultLayoutName = useMemo(
    () => (screen?.default_layout_id ? layoutName(screen.default_layout_id) : null),
    [screen, layoutName],
  );

  const update = async (patch: Record<string, unknown>, ok?: string) => {
    if (!screen) return false;
    const { error } = await supabase
      .from("screens")
      .update(patch as never)
      .eq("id", screen.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (ok) toast.success(ok);
    await load();
    return true;
  };

  const saveSettings = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }
    setSaving(true);
    await update(
      {
        name: form.name.trim(),
        width: form.width,
        height: form.height,
        orientation: orientationOf(form.width, form.height),
        timezone: form.timezone,
        default_layout_id: form.default_layout_id,
        notes: form.notes || null,
      },
      "Definições guardadas.",
    );
    setSaving(false);
    setPreviewKey((n) => n + 1);
  };

  const saveSchedule = async (d: ScheduleDraft) => {
    if (!screen) return;
    const payload = {
      name: d.name || null,
      layout_id: d.layout_id,
      days: d.days,
      time_from: d.time_from,
      time_to: d.time_to,
      date_from: d.date_from,
      date_to: d.date_to,
      priority: d.priority,
      enabled: d.enabled,
    };
    const { error } = d.id
      ? await supabase.from("schedules").update(payload).eq("id", d.id)
      : await supabase
          .from("schedules")
          .insert({ ...payload, org_id: screen.org_id, screen_id: screen.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Horário guardado.");
    setEditing(null);
    void load();
  };

  const removeSchedule = async (s: ScheduleRow) => {
    if (!confirm("Apagar este horário?")) return;
    const { error } = await supabase.from("schedules").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    void load();
  };

  if (loading) {
    return (
      <AppShell title="Ecrã">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }
  if (!screen || !form) {
    return (
      <AppShell title="Ecrã">
        <p className="text-sm text-muted-foreground">Ecrã não encontrado.</p>
      </AppShell>
    );
  }

  const st = STATUS_META[screenStatus(screen)];
  const info = screen.player_info ?? {};
  const errors = (info["errors"] as Array<{ at: string; msg: string }> | undefined) ?? [];
  const portrait = screen.height > screen.width;
  const override = (screen.theme_override ?? {}) as Record<string, string>;

  return (
    <AppShell
      title={screen.name}
      actions={
        <Link to="/ecras">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      }
    >
      {/* Estado */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <span className={`h-3 w-3 rounded-full ${st.dot}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${st.text}`}>{st.label}</div>
          <div className="text-xs text-muted-foreground">
            Visto {lastSeen(screen.last_seen_at)}
            {shortAgent(info["userAgent"]) ? ` · ${shortAgent(info["userAgent"])}` : ""}
            {info["screen"] ? ` · janela ${String(info["screen"])}` : ""}
            {screen.pending_command ? ` · comando pendente: ${screen.pending_command}` : ""}
          </div>
        </div>
        {canEdit ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void update(
                  { pending_command: "reload" },
                  "O ecrã recarrega no próximo contacto (até 20 s).",
                )
              }
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Recarregar ecrã
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void update({ pending_command: "clear_cache" }, "A cache do ecrã vai ser limpa.")
              }
            >
              <Eraser className="mr-1.5 h-3.5 w-3.5" /> Limpar cache
            </Button>
          </>
        ) : null}
      </div>

      <Tabs defaultValue="geral">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="instalar">Instalar</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-2 text-sm font-semibold">Link do player</div>
                <div className="flex gap-2">
                  <Input readOnly value={url} onFocus={(e) => e.target.select()} />
                  <Button
                    variant="outline"
                    size="icon"
                    title="Copiar"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(url)
                        .then(() => toast.success("Link copiado."))
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a href={url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="icon" title="Abrir">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <QrImage value={url} className="h-24 w-24 rounded border bg-white p-1" />
                  <p className="text-xs text-muted-foreground">
                    Aponte a câmara de uma box Android ou tablet para abrir o link. Quem tiver o
                    link só vê a publicidade deste ecrã; não dá acesso ao painel.
                  </p>
                </div>
              </div>

              <fieldset disabled={!canEdit} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Definições</div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="en" className="text-xs">
                      Ativo
                    </Label>
                    <Switch
                      id="en"
                      checked={screen.enabled}
                      onCheckedChange={(enabled) =>
                        void update({ enabled }, enabled ? "Ecrã ativado." : "Ecrã desativado.")
                      }
                    />
                  </div>
                </div>
                <ScreenForm value={form} onChange={setForm} layouts={layouts} />
                <div className="mt-3 flex justify-end">
                  <Button onClick={saveSettings} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar
                  </Button>
                </div>
              </fieldset>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Pré-visualização ao vivo</div>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewKey((n) => n + 1)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div
                  className={`overflow-hidden rounded-md bg-black ${portrait ? "mx-auto aspect-[9/16] max-h-[520px]" : "aspect-video"}`}
                >
                  <iframe
                    key={previewKey}
                    src={`${url}?preview=1`}
                    title="Pré-visualização"
                    className="h-full w-full border-0"
                    allow="autoplay"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  A pré-visualização não conta como ecrã ligado.
                </p>
              </div>

              {errors.length ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="mb-1 font-semibold">Últimos avisos do ecrã</div>
                  <ul className="space-y-0.5">
                    {errors
                      .slice()
                      .reverse()
                      .map((e, i) => (
                        <li key={i}>
                          {new Date(e.at).toLocaleString("pt-PT")} — {e.msg}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              {canEdit ? (
                <div className="rounded-lg border border-destructive/30 bg-card p-4">
                  <div className="mb-2 text-sm font-semibold">Zona de perigo</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            "Gerar um novo link? O link atual deixa de funcionar e vai ter de o trocar no aparelho.",
                          )
                        )
                          void update({ token: newToken() }, "Novo link gerado.");
                      }}
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Gerar novo link
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`Apagar o ecrã "${screen.name}" e os seus horários?`)) return;
                        const { error } = await supabase
                          .from("screens")
                          .delete()
                          .eq("id", screen.id);
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success("Ecrã apagado.");
                        void navigate({ to: "/ecras" });
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Apagar ecrã
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Horários</div>
                <div className="text-xs text-muted-foreground">
                  Troque de layout por hora e dia, por exemplo TV no canto de manhã e só publicidade
                  à tarde.
                </div>
              </div>
              {canEdit ? (
                <Button
                  size="sm"
                  disabled={!layouts.length}
                  onClick={() => setEditing({ ...EMPTY_SCHEDULE, layout_id: layouts[0]?.id ?? "" })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Horário
                </Button>
              ) : null}
            </div>
            {schedules.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" /> Sem horários: o ecrã mostra sempre o layout
                por defeito.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: layoutColor(s.layout_id) }}
                    />
                    <div className={`min-w-0 flex-1 ${s.enabled ? "" : "opacity-50"}`}>
                      <div className="font-medium">
                        {s.name || layoutName(s.layout_id)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          → {layoutName(s.layout_id)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.days.length === 7
                          ? "Todos os dias"
                          : DAYS.filter((d) => s.days.includes(d.n))
                              .map((d) => d.short)
                              .join(", ")}
                        {" · "}
                        {s.time_from && s.time_to
                          ? `${s.time_from.slice(0, 5)}–${s.time_to.slice(0, 5)}`
                          : "dia todo"}
                        {s.date_from || s.date_to
                          ? ` · ${s.date_from ? new Date(s.date_from).toLocaleDateString("pt-PT") : "…"} a ${s.date_to ? new Date(s.date_to).toLocaleDateString("pt-PT") : "…"}`
                          : ""}
                        {` · prioridade ${s.priority}`}
                        {s.enabled ? "" : " · inativo"}
                      </div>
                    </div>
                    {canEdit ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ ...s })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void removeSchedule(s)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Semana</div>
            <WeekView
              schedules={schedules}
              layoutName={layoutName}
              defaultLayoutName={defaultLayoutName}
            />
          </div>
          <ScheduleDialog
            open={!!editing}
            initial={editing ?? EMPTY_SCHEDULE}
            layouts={layouts}
            onClose={() => setEditing(null)}
            onSave={saveSchedule}
          />
        </TabsContent>

        <TabsContent value="aparencia">
          <fieldset disabled={!canEdit} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="text-sm font-semibold">Cores só deste ecrã</div>
            <p className="text-xs text-muted-foreground">
              Por defeito o ecrã usa as cores da organização (Aparência). Aqui pode sobrepor algumas
              só para este ecrã.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["primary", "Cor principal (fundos)"],
                  ["accent", "Cor de destaque (preços)"],
                  ["text", "Texto"],
                  ["background", "Fundo do ecrã"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={!!override[key]}
                    onCheckedChange={(on) => {
                      const next = { ...override };
                      if (on) next[key] = key === "accent" ? "#F28C28" : "#0F1E36";
                      else delete next[key];
                      void update({ theme_override: next as unknown as Json });
                    }}
                  />
                  <Label className="flex-1 text-sm">{label}</Label>
                  {override[key] ? (
                    <input
                      type="color"
                      defaultValue={override[key]}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (colorTimer.current) clearTimeout(colorTimer.current);
                        colorTimer.current = setTimeout(
                          () =>
                            void update({
                              theme_override: { ...override, [key]: value } as unknown as Json,
                            }),
                          500,
                        );
                      }}
                      className="h-8 w-12 rounded border"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </fieldset>
        </TabsContent>

        <TabsContent value="instalar">
          <div className="rounded-lg border bg-card p-4">
            <KioskHelp url={url} />
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
