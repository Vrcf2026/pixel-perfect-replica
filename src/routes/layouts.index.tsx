import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, LayoutTemplate, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutThumb } from "@/features/layouts/LayoutThumb";
import { TEMPLATES, defaultZoneConfig, defaultZoneStyle } from "@/features/layouts/templates";
import type { Orientation, ZoneKind } from "@/features/layouts/types";

export const Route = createFileRoute("/layouts/")({
  head: () => ({
    meta: [
      { title: "Layouts — VRCF Montra" },
      { name: "description", content: "Divisão do ecrã em zonas." },
      { property: "og:title", content: "Layouts — VRCF Montra" },
      { property: "og:description", content: "Divisão do ecrã em zonas." },
    ],
  }),
  component: LayoutsPage,
});

type ZoneLite = {
  kind: ZoneKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  name: string;
};
type Row = {
  id: string;
  name: string;
  orientation: Orientation;
  background: string;
  template: string | null;
  zones: ZoneLite[];
  screens: number;
};

function LayoutsPage() {
  const { org, canEdit } = useOrg();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const [l, s, sc] = await Promise.all([
      supabase
        .from("layouts")
        .select("id,name,orientation,background,template,layout_zones(kind,x,y,w,h,z,name)")
        .eq("org_id", org.org_id)
        .order("name"),
      supabase.from("screens").select("id,default_layout_id").eq("org_id", org.org_id),
      supabase.from("schedules").select("screen_id,layout_id").eq("org_id", org.org_id),
    ]);
    if (l.error) toast.error(l.error.message);
    const usage = new Map<string, Set<string>>();
    const add = (layoutId: string | null, screenId: string) => {
      if (!layoutId) return;
      if (!usage.has(layoutId)) usage.set(layoutId, new Set());
      usage.get(layoutId)?.add(screenId);
    };
    for (const x of s.data ?? []) add(x.default_layout_id as string | null, x.id as string);
    for (const x of sc.data ?? []) add(x.layout_id as string, x.screen_id as string);
    setRows(
      (l.data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        orientation: r.orientation as Orientation,
        background: r.background as string,
        template: r.template as string | null,
        zones: ((r.layout_zones ?? []) as unknown as ZoneLite[]).map((z) => ({
          ...z,
          x: Number(z.x),
          y: Number(z.y),
          w: Number(z.w),
          h: Number(z.h),
        })),
        screens: usage.get(r.id as string)?.size ?? 0,
      })),
    );
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const duplicate = async (row: Row) => {
    if (!org) return;
    const { data: l, error } = await supabase
      .from("layouts")
      .insert({
        org_id: org.org_id,
        name: `${row.name} (cópia)`,
        orientation: row.orientation,
        background: row.background,
        template: row.template,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: zones } = await supabase.from("layout_zones").select("*").eq("layout_id", row.id);
    if (zones?.length) {
      const copies = zones.map((z) => {
        const { id: _id, created_at: _c, ...rest } = z;
        return { ...rest, layout_id: l.id as string };
      });
      const { error: zErr } = await supabase.from("layout_zones").insert(copies);
      if (zErr) toast.error(zErr.message);
    }
    toast.success("Layout duplicado.");
    void load();
  };

  const remove = async (row: Row) => {
    const warn = row.screens
      ? `\n\nEstá a ser usado em ${row.screens} ecrã(s): os horários que o usam também são apagados e esses ecrãs ficam sem layout por defeito.`
      : "";
    if (!confirm(`Apagar o layout "${row.name}"?${warn}`)) return;
    const { error } = await supabase.from("layouts").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Layout apagado.");
    void load();
  };

  return (
    <AppShell
      title="Layouts"
      actions={
        canEdit ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo layout
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Sem layouts"
          description="Um layout divide o ecrã em zonas: TV, publicidade, rodapé, relógio… Comece por um modelo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <Link to="/layouts/$id" params={{ id: r.id }} className="block">
                <LayoutThumb
                  zones={r.zones}
                  orientation={r.orientation}
                  background={r.background}
                  className={r.orientation === "portrait" ? "mx-auto h-48" : ""}
                />
              </Link>
              <div className="flex items-start gap-2">
                <Link to="/layouts/$id" params={{ id: r.id }} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.orientation === "portrait" ? "Vertical" : "Horizontal"} · {r.zones.length}{" "}
                    zona(s) · {r.screens ? `usado em ${r.screens} ecrã(s)` : "sem ecrãs"}
                  </div>
                </Link>
                {canEdit ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Duplicar"
                      onClick={() => duplicate(r)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" title="Apagar" onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewLayoutDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => void navigate({ to: "/layouts/$id", params: { id } })}
      />
    </AppShell>
  );
}

function NewLayoutDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { org } = useOrg();
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [templateId, setTemplateId] = useState("tv_corner");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const list = TEMPLATES.filter((t) => t.orientation === orientation);
  const tpl =
    TEMPLATES.find((t) => t.id === templateId && t.orientation === orientation) ?? list[0];

  const create = async () => {
    if (!org || !tpl) return;
    setBusy(true);
    const { data: l, error } = await supabase
      .from("layouts")
      .insert({
        org_id: org.org_id,
        name: name.trim() || tpl.name,
        template: tpl.id,
        orientation,
        background: "#0F1E36",
      })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (tpl.zones.length) {
      const { error: zErr } = await supabase.from("layout_zones").insert(
        tpl.zones.map((z, i) => ({
          org_id: org.org_id,
          layout_id: l.id as string,
          name: z.name,
          kind: z.kind,
          x: z.x,
          y: z.y,
          w: z.w,
          h: z.h,
          z: z.z ?? 1,
          position: i,
          radius: z.radius ?? 0,
          style: defaultZoneStyle(z.kind) as unknown as Json,
          config: defaultZoneConfig(z.kind) as unknown as Json,
        })) as never,
      );
      if (zErr) toast.error(zErr.message);
    }
    setBusy(false);
    setName("");
    onClose();
    onCreated(l.id as string);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo layout</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              placeholder={tpl?.name ?? ""}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Tabs
            value={orientation}
            onValueChange={(v) => {
              const o = v as Orientation;
              setOrientation(o);
              setTemplateId(TEMPLATES.find((t) => t.orientation === o)?.id ?? "");
            }}
          >
            <TabsList>
              <TabsTrigger value="landscape">Horizontal</TabsTrigger>
              <TabsTrigger value="portrait">Vertical</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div
          className={`grid gap-3 ${orientation === "portrait" ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}
        >
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`rounded-lg border p-2 text-left transition ${
                tpl?.id === t.id
                  ? "border-[#F28C28] ring-2 ring-[#F28C28]"
                  : "hover:border-foreground/30"
              }`}
            >
              <LayoutThumb
                zones={t.zones}
                orientation={t.orientation}
                className={t.orientation === "portrait" ? "mx-auto h-40" : ""}
              />
              <div className="mt-2 text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={create} disabled={busy || !tpl}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Criar e editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
