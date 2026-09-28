import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, Plus, Pencil, Trash2, Play, ListPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { SourceView } from "@/player/components/SourceView";
import { parseM3U, type M3UChannel } from "@/features/sources/m3u";
import { MediaPicker } from "@/features/media/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/fontes")({
  head: () => ({
    meta: [
      { title: "Fontes de vídeo — VRCF Montra" },
      { name: "description", content: "Canais em direto, vídeos e páginas para os seus ecrãs." },
      { property: "og:title", content: "Fontes de vídeo — VRCF Montra" },
      { property: "og:description", content: "Canais em direto, vídeos e páginas para os seus ecrãs." },
    ],
  }),
  component: FontesPage,
});

type SourceRow = {
  id: string;
  org_id: string;
  name: string;
  kind: "hls" | "ts" | "mp4" | "youtube" | "webpage" | "image" | "none";
  url: string | null;
  media_id: string | null;
  fallback_media_id: string | null;
  muted: boolean;
  volume: number;
  loop: boolean;
  fit: string;
  retry_s: number;
};

const KINDS = [
  { value: "hls", label: "Direto HLS", hint: "Endereço terminado em .m3u8" },
  { value: "ts", label: "Direto TS", hint: "Endereço terminado em .ts" },
  { value: "mp4", label: "Vídeo MP4", hint: "Ligação direta para um ficheiro .mp4" },
  { value: "youtube", label: "YouTube", hint: "Cole a ligação normal do vídeo" },
  { value: "webpage", label: "Página web", hint: "Endereço completo com https://" },
  { value: "image", label: "Imagem", hint: "Ligação de uma imagem ou escolha da biblioteca" },
  { value: "none", label: "Sem imagem", hint: "Ecrã preto — útil como reserva" },
] as const;

const EMPTY: Omit<SourceRow, "id" | "org_id"> = {
  name: "",
  kind: "hls",
  url: "",
  media_id: null,
  fallback_media_id: null,
  muted: true,
  volume: 100,
  loop: true,
  fit: "cover",
  retry_s: 10,
};

function FontesPage() {
  const { org, canEdit } = useOrg();
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SourceRow> | null>(null);
  const [preview, setPreview] = useState<SourceRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("org_id", org.org_id)
      .order("name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as SourceRow[]);
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (row: SourceRow) => {
    if (!confirm(`Apagar a fonte "${row.name}"?`)) return;
    const { error } = await supabase.from("sources").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Fonte apagada.");
    void load();
  };

  return (
    <AppShell
      title="Fontes de vídeo"
      actions={
        canEdit ? (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <ListPlus className="mr-2 h-4 w-4" />
              Importar lista M3U
            </Button>
            <Button onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-2 h-4 w-4" />
              Nova fonte
            </Button>
          </>
        ) : null
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Sem fontes de vídeo"
          description="Crie uma fonte ou importe uma lista de canais M3U."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.name}</div>
                <div className="truncate text-xs text-muted-foreground">{s.url || "—"}</div>
              </div>
              <Badge variant="secondary">{KINDS.find((k) => k.value === s.kind)?.label ?? s.kind}</Badge>
              <Button size="sm" variant="outline" onClick={() => setPreview(s)}>
                <Play className="h-3.5 w-3.5" />
              </Button>
              {canEdit ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <SourceDialog row={editing} onClose={() => setEditing(null)} onSaved={load} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onSaved={load} />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {preview ? <SourceView source={preview} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SourceDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Partial<SourceRow> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { org } = useOrg();
  const [form, setForm] = useState<Partial<SourceRow>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(row ?? {}), [row]);
  const set = (patch: Partial<SourceRow>) => setForm((f) => ({ ...f, ...patch }));
  const hint = KINDS.find((k) => k.value === form.kind)?.hint;

  const save = async () => {
    if (!org) return;
    if (!form.name?.trim()) { toast.error("Dê um nome à fonte."); return; }
    setBusy(true);
    const payload = {
      org_id: org.org_id,
      name: form.name.trim(),
      kind: (form.kind ?? "hls") as SourceRow["kind"],
      url: form.url || null,
      media_id: form.media_id ?? null,
      fallback_media_id: form.fallback_media_id ?? null,
      muted: form.muted ?? true,
      volume: form.volume ?? 100,
      loop: form.loop ?? true,
      fit: form.fit ?? "cover",
      retry_s: form.retry_s ?? 10,
    };
    const { error } = form.id
      ? await supabase.from("sources").update(payload).eq("id", form.id)
      : await supabase.from("sources").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fonte guardada.");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar fonte" : "Nova fonte"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.kind ?? "hls"}
              onValueChange={(v) => set({ kind: v as SourceRow["kind"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {form.kind !== "none" ? (
            <div className="space-y-2">
              <Label>Endereço</Label>
              <div className="flex gap-2">
                <Input value={form.url ?? ""} onChange={(e) => set({ url: e.target.value })} />
                {form.kind === "image" ? (
                  <MediaPicker kind="image" onPick={(m) => set({ url: m.url, media_id: m.id })}>
                    <Button type="button" variant="outline">
                      Biblioteca
                    </Button>
                  </MediaPicker>
                ) : null}
                {form.kind === "mp4" ? (
                  <MediaPicker kind="video" onPick={(m) => set({ url: m.url, media_id: m.id })}>
                    <Button type="button" variant="outline">
                      Biblioteca
                    </Button>
                  </MediaPicker>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ajuste da imagem</Label>
              <Select value={form.fit ?? "cover"} onValueChange={(v) => set({ fit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Preencher</SelectItem>
                  <SelectItem value="contain">Caber todo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nova tentativa (s)</Label>
              <Input
                type="number"
                value={form.retry_s ?? 10}
                onChange={(e) => set({ retry_s: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Sem som</Label>
            <Switch checked={form.muted ?? true} onCheckedChange={(v) => set({ muted: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Repetir em ciclo</Label>
            <Switch checked={form.loop ?? true} onCheckedChange={(v) => set({ loop: v })} />
          </div>
          <div className="space-y-2">
            <Label>Volume: {form.volume ?? 100}%</Label>
            <Slider
              value={[form.volume ?? 100]}
              max={100}
              step={5}
              onValueChange={([v]) => set({ volume: v ?? 100 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Imagem de reserva</Label>
            <div className="flex items-center gap-2">
              <MediaPicker kind="any" onPick={(m) => set({ fallback_media_id: m.id })}>
                <Button type="button" variant="outline" size="sm">
                  Escolher
                </Button>
              </MediaPicker>
              {form.fallback_media_id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ fallback_media_id: null })}
                >
                  Remover
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Nenhuma</span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { org } = useOrg();
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setChannels([]);
      setSelected(new Set());
      setQ("");
    }
  }, [open]);

  const groups = useMemo(() => {
    const filtered = channels.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.group ?? "").toLowerCase().includes(q.toLowerCase()),
    );
    const map = new Map<string, M3UChannel[]>();
    for (const c of filtered) {
      const g = c.group || "Sem grupo";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt"));
  }, [channels, q]);

  const importSelected = async () => {
    if (!org) return;
    const chosen = channels.filter((c) => selected.has(c.url));
    if (chosen.length === 0) { toast.error("Escolha pelo menos um canal."); return; }
    setBusy(true);
    const { error } = await supabase.from("sources").insert(
      chosen.map((c) => ({
        org_id: org.org_id,
        name: c.name,
        kind: c.kind,
        url: c.url,
      })),
    );
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${chosen.length} canal(is) importado(s).`);
    onClose();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar lista M3U</DialogTitle>
          <DialogDescription>
            Escolha um ficheiro .m3u ou .m3u8 do seu computador e selecione os canais a importar.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".m3u,.m3u8,text/plain"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const list = parseM3U(await file.text());
            setChannels(list);
            setSelected(new Set(list.map((c) => c.url)));
            toast.success(`${list.length} canal(is) encontrados.`);
          }}
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Escolher ficheiro
          </Button>
          {channels.length > 0 ? (
            <Input placeholder="Pesquisar canal ou grupo" value={q} onChange={(e) => setQ(e.target.value)} />
          ) : null}
        </div>

        {channels.length > 0 ? (
          <>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto">
              {groups.map(([group, list]) => (
                <div key={group}>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{group}</div>
                  <div className="space-y-1">
                    {list.map((c) => (
                      <label key={c.url} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                        <Checkbox
                          checked={selected.has(c.url)}
                          onCheckedChange={(v) =>
                            setSelected((s) => {
                              const next = new Set(s);
                              if (v) next.add(c.url);
                              else next.delete(c.url);
                              return next;
                            })
                          }
                        />
                        {c.logo ? <img src={c.logo} alt="" className="h-5 w-5 object-contain" /> : null}
                        <span className="flex-1 truncate text-sm">{c.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {c.kind}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <span className="mr-auto self-center text-sm text-muted-foreground">
                {selected.size} selecionado(s)
              </span>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={importSelected} disabled={busy}>
                Importar
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
