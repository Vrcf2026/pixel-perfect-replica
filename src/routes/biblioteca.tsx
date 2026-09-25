import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Images, Trash2, Pencil, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import {
  deleteMedia,
  formatBytes,
  isImage,
  isVideo,
  mediaUsage,
  uploadMedia,
  type MediaRow,
} from "@/features/media/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — VRCF Montra" },
      { name: "description", content: "Imagens e vídeos da sua organização." },
      { property: "og:title", content: "Biblioteca — VRCF Montra" },
      { property: "og:description", content: "Imagens e vídeos da sua organização." },
    ],
  }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const { org, canEdit } = useOrg();
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MediaRow | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as MediaRow[]);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!org) return;
    const list = Array.from(files);
    setUploading(list.length);
    for (const file of list) {
      try {
        await uploadMedia(org.org_id, file);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falhou o carregamento.");
      }
      setUploading((n) => n - 1);
    }
    toast.success("Ficheiros carregados.");
    void load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === "image" && !isImage(r.mime)) return false;
        if (filter === "video" && !isVideo(r.mime)) return false;
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          r.name.toLowerCase().includes(needle) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(needle))
        );
      }),
    [rows, filter, q],
  );

  const remove = async (row: MediaRow) => {
    const usage = await mediaUsage(row);
    const warn =
      usage.sources.length || usage.items.length
        ? `Atenção: este ficheiro está a ser usado em ${usage.sources.length} fonte(s) e ${usage.items.length} item(ns) de playlist. `
        : "";
    if (!confirm(`${warn}Apagar "${row.name}"?`)) return;
    try {
      await deleteMedia(row);
      toast.success("Ficheiro apagado.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  };

  return (
    <AppShell
      title="Biblioteca"
      actions={
        canEdit ? (
          <Button onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Carregar
          </Button>
        ) : null
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {canEdit ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`mb-4 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
            dragging ? "border-accent bg-accent/10" : "text-muted-foreground"
          }`}
        >
          {uploading > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar {uploading} ficheiro(s)…
            </span>
          ) : (
            <>Arraste ficheiros para aqui — imagens (jpg, png, webp, svg) e vídeos (mp4, webm) até 200 MB.</>
          )}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="image">Imagens</TabsTrigger>
            <TabsTrigger value="video">Vídeos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          className="max-w-xs"
          placeholder="Pesquisar por nome ou etiqueta"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sem ficheiros"
          description="Carregue imagens e vídeos para os usar nas suas playlists."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border bg-card">
              <div className="aspect-video bg-muted">
                {isImage(m.mime) ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={m.url} muted className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(m.size_bytes)}
                  {m.width ? ` · ${m.width}×${m.height}` : ""}
                  {m.duration_s ? ` · ${m.duration_s}s` : ""}
                </div>
                {m.tags?.length ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {m.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {canEdit ? (
                  <div className="flex gap-1 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditDialog row={editing} onClose={() => setEditing(null)} onSaved={load} />
    </AppShell>
  );
}

function EditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: MediaRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    setName(row?.name ?? "");
    setTags((row?.tags ?? []).join(", "));
  }, [row]);

  const save = async () => {
    if (!row) return;
    const { error } = await supabase
      .from("media")
      .update({
        name,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guardado.");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ficheiro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="n">Nome</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t">Etiquetas (separadas por vírgula)</Label>
            <Input id="t" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
