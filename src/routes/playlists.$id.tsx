import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Copy, GripVertical, Loader2, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Slide, SlideFrame } from "@/player/slides";
import { ItemForm } from "@/features/playlists/ItemForm";
import {
  ITEM_KINDS,
  KIND_META,
  defaultData,
  validateData,
  type ItemData,
  type ItemKind,
} from "@/features/playlists/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/playlists/$id")({
  head: () => ({
    meta: [
      { title: "Editar playlist — VRCF Montra" },
      { name: "description", content: "Organize os conteúdos que passam no ecrã." },
      { property: "og:title", content: "Editar playlist — VRCF Montra" },
      { property: "og:description", content: "Organize os conteúdos que passam no ecrã." },
    ],
  }),
  component: PlaylistEditor,
});

type Playlist = {
  id: string;
  name: string;
  shuffle: boolean;
  default_duration_s: number;
  transition: string;
};

type Item = {
  id: string;
  org_id: string;
  playlist_id: string;
  kind: ItemKind;
  data: ItemData;
  position: number;
  enabled: boolean;
  duration_s: number | null;
  date_from: string | null;
  date_to: string | null;
  days: number[];
  time_from: string | null;
  time_to: string | null;
};

const DAYS = [
  { n: 1, l: "Seg" },
  { n: 2, l: "Ter" },
  { n: 3, l: "Qua" },
  { n: 4, l: "Qui" },
  { n: 5, l: "Sex" },
  { n: 6, l: "Sáb" },
  { n: 7, l: "Dom" },
];

function PlaylistEditor() {
  const { id } = Route.useParams();
  const { org, canEdit } = useOrg();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [sources, setSources] = useState<
    Array<{
      id: string;
      name: string;
      kind: string;
      url: string | null;
      muted: boolean;
      fit: string;
    }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const [p, it, src] = await Promise.all([
      supabase.from("playlists").select("*").eq("id", id).maybeSingle(),
      supabase.from("playlist_items").select("*").eq("playlist_id", id).order("position"),
      supabase
        .from("sources")
        .select("id,name,kind,url,muted,fit")
        .eq("org_id", org.org_id)
        .order("name"),
    ]);
    if (p.error) toast.error(p.error.message);
    setPlaylist(p.data as Playlist | null);
    setItems((it.data ?? []) as unknown as Item[]);
    setSources((src.data ?? []) as typeof sources);
    setSelectedId((prev) => prev ?? (it.data?.[0]?.id as string | undefined) ?? null);
    setLoading(false);
  }, [id, org]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const savePlaylist = async (patch: Partial<Playlist>) => {
    if (!playlist) return;
    setPlaylist({ ...playlist, ...patch });
    const { error } = await supabase.from("playlists").update(patch).eq("id", playlist.id);
    if (error) toast.error(error.message);
  };

  const saveItem = async (itemId: string, patch: Partial<Item>) => {
    setItems((list) => list.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    const { error } = await supabase
      .from("playlist_items")
      .update(patch as never)
      .eq("id", itemId);
    if (error) toast.error(error.message);
  };

  const addItem = async (kind: ItemKind) => {
    if (!org || !playlist) return;
    const { data, error } = await supabase
      .from("playlist_items")
      .insert({
        org_id: org.org_id,
        playlist_id: playlist.id,
        kind,
        data: defaultData(kind) as never,
        position: items.length,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdding(false);
    setItems((l) => [...l, data as unknown as Item]);
    setSelectedId(data.id as string);
  };

  const duplicate = async (item: Item) => {
    const { data, error } = await supabase
      .from("playlist_items")
      .insert({
        org_id: item.org_id,
        playlist_id: item.playlist_id,
        kind: item.kind,
        data: item.data as never,
        position: items.length,
        enabled: item.enabled,
        duration_s: item.duration_s,
        date_from: item.date_from,
        date_to: item.date_to,
        days: item.days,
        time_from: item.time_from,
        time_to: item.time_to,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((l) => [...l, data as unknown as Item]);
    toast.success("Item duplicado.");
  };

  const removeItem = async (item: Item) => {
    if (!confirm("Apagar este item?")) return;
    const { error } = await supabase.from("playlist_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((l) => l.filter((i) => i.id !== item.id));
    if (selectedId === item.id) setSelectedId(null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await Promise.all(
      next.map((it, idx) =>
        supabase.from("playlist_items").update({ position: idx }).eq("id", it.id),
      ),
    );
  };

  if (loading) {
    return (
      <AppShell title="Playlist">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  if (!playlist) {
    return (
      <AppShell title="Playlist">
        <p className="text-sm text-muted-foreground">Playlist não encontrada.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={playlist.name}
      actions={
        <>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Play className="mr-2 h-4 w-4" />
            Pré-visualizar
          </Button>
          <Link to="/playlists">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={playlist.name}
                disabled={!canEdit}
                onChange={(e) => setPlaylist({ ...playlist, name: e.target.value })}
                onBlur={(e) => savePlaylist({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duração por defeito (s)</Label>
              <Input
                type="number"
                disabled={!canEdit}
                value={playlist.default_duration_s}
                min={1}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  if (n >= 1) void savePlaylist({ default_duration_s: n });
                  else setPlaylist({ ...playlist, default_duration_s: n });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Transição</Label>
              <Select
                value={playlist.transition}
                disabled={!canEdit}
                onValueChange={(v) => savePlaylist({ transition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Suave</SelectItem>
                  <SelectItem value="none">Sem transição</SelectItem>
                  <SelectItem value="slide">Deslizar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ordem aleatória</Label>
              <Switch
                checked={playlist.shuffle}
                disabled={!canEdit}
                onCheckedChange={(v) => savePlaylist({ shuffle: v })}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {items.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      active={item.id === selectedId}
                      canEdit={canEdit}
                      onSelect={() => setSelectedId(item.id)}
                      onDuplicate={() => duplicate(item)}
                      onRemove={() => removeItem(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sem itens.</p>
            ) : null}
            {canEdit ? (
              <Button variant="outline" className="mt-2 w-full" onClick={() => setAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar item
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <SlideFrame>
                <Slide kind={selected.kind} data={selected.data} sources={sources} />
              </SlideFrame>

              <Tabs defaultValue="conteudo">
                <TabsList>
                  <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                  <TabsTrigger value="quando">Quando mostrar</TabsTrigger>
                </TabsList>

                <TabsContent value="conteudo" className="space-y-4 rounded-lg border bg-card p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Duração (s)</Label>
                      <Input
                        type="number"
                        disabled={!canEdit}
                        placeholder={
                          selected.kind === "video"
                            ? "vazio = até acabar"
                            : `vazio = ${playlist.default_duration_s}s`
                        }
                        value={selected.duration_s ?? ""}
                        onChange={(e) =>
                          saveItem(selected.id, {
                            duration_s:
                              e.target.value === "" || Number(e.target.value) < 1
                                ? null
                                : Math.round(Number(e.target.value)),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <Label>Ativo</Label>
                      <Switch
                        checked={selected.enabled}
                        disabled={!canEdit}
                        onCheckedChange={(v) => saveItem(selected.id, { enabled: v })}
                      />
                    </div>
                  </div>

                  <fieldset disabled={!canEdit} className="space-y-4">
                    <ItemForm
                      kind={selected.kind}
                      data={selected.data}
                      sources={sources}
                      onChange={(data) =>
                        setItems((l) => l.map((i) => (i.id === selected.id ? { ...i, data } : i)))
                      }
                    />
                  </fieldset>

                  {canEdit ? (
                    <Button
                      onClick={async () => {
                        const err = validateData(selected.kind, selected.data);
                        if (err) {
                          toast.error(err);
                          return;
                        }
                        await saveItem(selected.id, { data: selected.data });
                        toast.success("Item guardado.");
                      }}
                    >
                      Guardar item
                    </Button>
                  ) : null}
                </TabsContent>

                <TabsContent value="quando" className="space-y-4 rounded-lg border bg-card p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>A partir de</Label>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={selected.date_from ?? ""}
                        onChange={(e) =>
                          saveItem(selected.id, { date_from: e.target.value || null })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Até</Label>
                      <Input
                        type="date"
                        disabled={!canEdit}
                        value={selected.date_to ?? ""}
                        onChange={(e) => saveItem(selected.id, { date_to: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hora de início</Label>
                      <Input
                        type="time"
                        disabled={!canEdit}
                        value={selected.time_from?.slice(0, 5) ?? ""}
                        onChange={(e) =>
                          saveItem(selected.id, { time_from: e.target.value || null })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hora de fim</Label>
                      <Input
                        type="time"
                        disabled={!canEdit}
                        value={selected.time_to?.slice(0, 5) ?? ""}
                        onChange={(e) => saveItem(selected.id, { time_to: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dias da semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => {
                        const on = (selected.days ?? []).includes(d.n);
                        return (
                          <button
                            key={d.n}
                            disabled={!canEdit}
                            onClick={() => {
                              const days = on
                                ? selected.days.filter((x) => x !== d.n)
                                : [...(selected.days ?? []), d.n].sort((a, b) => a - b);
                              if (days.length === 0) {
                                toast.error("Tem de ficar pelo menos um dia escolhido.");
                                return;
                              }
                              void saveItem(selected.id, { days });
                            }}
                            className={`rounded-full border px-3 py-1 text-sm ${
                              on
                                ? "border-accent bg-accent text-accent-foreground"
                                : "bg-background"
                            }`}
                          >
                            {d.l}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por defeito passa todos os dias.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Escolha um item à esquerda.</p>
          )}
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Que tipo de item?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {ITEM_KINDS.map((k) => {
              const meta = KIND_META[k];
              return (
                <button
                  key={k}
                  onClick={() => addItem(k)}
                  className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center hover:border-accent"
                >
                  <meta.icon className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-[11px] text-muted-foreground">{meta.hint}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={items.filter((i) => i.enabled)}
        defaultDuration={playlist.default_duration_s}
        sources={sources}
      />
    </AppShell>
  );
}

function SortableRow({
  item,
  active,
  canEdit,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  item: Item;
  active: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const meta = KIND_META[item.kind];
  const title =
    (item.data.name as string) ||
    (item.data.title as string) ||
    (item.data.url as string) ||
    meta.label;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border px-2 py-2 ${
        active ? "border-accent bg-accent/10" : "bg-background"
      }`}
    >
      {canEdit ? (
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <meta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{title}</span>
        {!item.enabled ? (
          <Badge variant="secondary" className="text-[10px]">
            inativo
          </Badge>
        ) : null}
      </button>
      {canEdit ? (
        <>
          <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

function PreviewDialog({
  open,
  onClose,
  items,
  defaultDuration,
  sources,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  defaultDuration: number;
  sources: Array<{ id: string; kind: string; url: string | null; muted: boolean; fit: string }>;
}) {
  const [i, setI] = useState(0);
  const current = items[i];
  const duration = useMemo(
    () => (current?.duration_s ?? defaultDuration) * 1000,
    [current, defaultDuration],
  );

  useEffect(() => {
    if (!open || items.length === 0) return;
    const t = setTimeout(() => setI((n) => (n + 1) % items.length), duration);
    return () => clearTimeout(t);
  }, [open, i, duration, items.length]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pré-visualização</DialogTitle>
        </DialogHeader>
        {current ? (
          <SlideFrame>
            <Slide kind={current.kind} data={current.data} sources={sources} />
          </SlideFrame>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem itens ativos.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
