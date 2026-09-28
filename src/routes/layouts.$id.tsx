import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  Grid3x3,
  Loader2,
  Lock,
  MonitorPlay,
  Plus,
  Trash2,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Canvas } from "@/features/layouts/Canvas";
import { Inspector } from "@/features/layouts/Inspector";
import { useLayoutEditor, type SaveState } from "@/features/layouts/useLayoutEditor";
import { ZONE_KINDS, ZONE_META, round1 } from "@/features/layouts/templates";
import type { Orientation, Zone } from "@/features/layouts/types";

export const Route = createFileRoute("/layouts/$id")({
  head: () => ({
    meta: [
      { title: "Editar layout — VRCF Montra" },
      { name: "description", content: "Organize as zonas do ecrã." },
      { property: "og:title", content: "Editar layout — VRCF Montra" },
      { property: "og:description", content: "Organize as zonas do ecrã." },
    ],
  }),
  component: LayoutEditorPage,
});

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> A guardar…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <Check className="h-3 w-3" /> Guardado
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <TriangleAlert className="h-3 w-3" /> Erro ao guardar
      </span>
    );
  return null;
}

function LayoutEditorPage() {
  const { id } = Route.useParams();
  const { org, canEdit } = useOrg();
  const ed = useLayoutEditor(id, org?.org_id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const selected = ed.zones.find((z) => z.id === selectedId) ?? null;
  const ordered = useMemo(
    () => [...ed.zones].sort((a, b) => b.z - a.z || b.position - a.position),
    [ed.zones],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, zid: string) => {
    const next = new Set(set);
    if (next.has(zid)) next.delete(zid);
    else next.add(zid);
    setter(next);
  };

  /** Move uma zona na ordem de sobreposição e renumera z (topo = maior). */
  const moveLayer = (zid: string, delta: -1 | 1) => {
    const list = [...ordered];
    const i = list.findIndex((z) => z.id === zid);
    const j = i - delta; // lista está do topo para baixo
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j] as Zone, list[i] as Zone];
    const n = list.length;
    ed.updateZones(list.map((z, k) => ({ id: z.id, patch: { z: n - k } })));
  };

  const removeSelected = () => {
    if (!selected) return;
    if (!confirm(`Apagar a zona "${selected.name}"?`)) return;
    void ed.removeZone(selected.id);
    setSelectedId(null);
  };

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit || !selected) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.closest("[role=dialog],[role=listbox],[role=menu]"))
      )
        return;
      if (locked.has(selected.id)) return;
      const step = e.shiftKey ? 5 : 0.5;
      const move = (dx: number, dy: number) => {
        e.preventDefault();
        ed.updateZone(selected.id, {
          x: round1(Math.min(100 - selected.w, Math.max(0, selected.x + dx))),
          y: round1(Math.min(100 - selected.h, Math.max(0, selected.y + dy))),
        });
      };
      if (e.key === "ArrowLeft") move(-step, 0);
      else if (e.key === "ArrowRight") move(step, 0);
      else if (e.key === "ArrowUp") move(0, -step);
      else if (e.key === "ArrowDown") move(0, step);
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void ed.duplicateZone(selected.id).then((z) => z && setSelectedId(z.id));
      } else if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (ed.loading) {
    return (
      <AppShell title="Layout">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }
  if (!ed.layout) {
    return (
      <AppShell title="Layout">
        <p className="text-sm text-muted-foreground">Layout não encontrado.</p>
      </AppShell>
    );
  }
  const layout = ed.layout;

  return (
    <AppShell
      title={layout.name}
      actions={
        <>
          <SaveBadge state={ed.saveState} />
          <a href={`/preview/layout/${id}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <MonitorPlay className="mr-2 h-4 w-4" />
              Pré-visualizar
            </Button>
          </a>
          <Link to="/layouts">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </>
      }
    >
      <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 lg:hidden">
        O editor funciona melhor num ecrã grande. No telemóvel dá para ajustar valores, mas arrastar
        zonas é difícil.
      </div>

      {/* Barra do layout */}
      <fieldset
        disabled={!canEdit}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3"
      >
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input value={layout.name} onChange={(e) => ed.updateLayout({ name: e.target.value })} />
        </div>
        <div className="w-40 space-y-1.5">
          <Label className="text-xs">Orientação</Label>
          <Select
            value={layout.orientation}
            onValueChange={(v) => ed.updateLayout({ orientation: v as Orientation })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landscape">Horizontal</SelectItem>
              <SelectItem value="portrait">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fundo</Label>
          <input
            type="color"
            value={layout.background || "#000000"}
            onChange={(e) => ed.updateLayout({ background: e.target.value })}
            className="h-9 w-14 rounded border"
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="grid" checked={showGrid} onCheckedChange={setShowGrid} />
          <Label htmlFor="grid" className="flex items-center gap-1 text-xs">
            <Grid3x3 className="h-3.5 w-3.5" /> Grelha
          </Label>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="content" checked={showContent} onCheckedChange={setShowContent} />
          <Label htmlFor="content" className="flex items-center gap-1 text-xs">
            <MonitorPlay className="h-3.5 w-3.5" /> Ver conteúdo
          </Label>
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_320px]">
        {/* Zonas */}
        <div className="order-2 space-y-2 lg:order-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Zonas</div>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Zona
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ZONE_KINDS.map((k) => {
                    const Icon = ZONE_META[k].icon;
                    return (
                      <DropdownMenuItem
                        key={k}
                        onClick={() => void ed.addZone(k).then((z) => z && setSelectedId(z.id))}
                      >
                        <Icon className="mr-2 h-4 w-4" style={{ color: ZONE_META[k].color }} />
                        {ZONE_META[k].label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {ordered.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sem zonas. Acrescente uma com o botão acima.
            </p>
          ) : (
            <div className="space-y-1">
              {ordered.map((z, idx) => {
                const meta = ZONE_META[z.kind];
                const Icon = meta.icon;
                const sel = z.id === selectedId;
                return (
                  <div
                    key={z.id}
                    onClick={() => setSelectedId(z.id)}
                    className={`group flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm ${
                      sel ? "border-[#F28C28] bg-[#F28C28]/10" : "bg-card hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                    <span
                      className={`min-w-0 flex-1 truncate ${hidden.has(z.id) ? "opacity-40" : ""}`}
                    >
                      {z.name}
                    </span>
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          title="Subir camada"
                          disabled={idx === 0}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(z.id, 1);
                          }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Descer camada"
                          disabled={idx === ordered.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(z.id, -1);
                          }}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      title={hidden.has(z.id) ? "Mostrar no editor" : "Ocultar no editor"}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(hidden, setHidden, z.id);
                      }}
                    >
                      {hidden.has(z.id) ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title={locked.has(z.id) ? "Desbloquear" : "Bloquear"}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(locked, setLocked, z.id);
                      }}
                    >
                      {locked.has(z.id) ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            A lista vai da camada de cima para a de baixo. Ocultar e bloquear só afetam o editor.
          </p>
        </div>

        {/* Tela */}
        <div className="order-1 min-w-0 lg:order-2">
          <Canvas
            zones={ed.zones}
            orientation={layout.orientation}
            background={layout.background}
            selectedId={selectedId}
            hidden={hidden}
            locked={locked}
            showGrid={showGrid}
            showContent={showContent}
            preview={ed.preview}
            readOnly={!canEdit}
            onSelect={setSelectedId}
            onRect={(zid, rect) => ed.updateZone(zid, rect)}
          />
        </div>

        {/* Propriedades */}
        <div className="order-3 min-w-0 rounded-lg border bg-card p-3">
          {selected ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-sm font-semibold">{selected.name}</div>
                {canEdit ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Duplicar (Ctrl+D)"
                      onClick={() =>
                        void ed.duplicateZone(selected.id).then((z) => z && setSelectedId(z.id))
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Apagar (Delete)"
                      onClick={removeSelected}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
              <Inspector
                key={selected.id}
                zone={selected}
                readOnly={!canEdit}
                sources={ed.sources}
                playlists={ed.playlists}
                onChange={(patch) => ed.updateZone(selected.id, patch)}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Clique numa zona para a editar. Arraste para mover e use os cantos para redimensionar.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
