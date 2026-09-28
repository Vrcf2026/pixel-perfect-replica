import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ListVideo, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { title: "Playlists — VRCF Montra" },
      { name: "description", content: "Sequências de conteúdos para os seus ecrãs." },
      { property: "og:title", content: "Playlists — VRCF Montra" },
      { property: "og:description", content: "Sequências de conteúdos para os seus ecrãs." },
    ],
  }),
  component: PlaylistsPage,
});

type Row = {
  id: string;
  name: string;
  default_duration_s: number;
  items: { duration_s: number | null }[];
};

function PlaylistsPage() {
  const { org, canEdit } = useOrg();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("playlists")
      .select("id, name, default_duration_s, playlist_items(duration_s)")
      .eq("org_id", org.org_id)
      .order("name");
    if (error) toast.error(error.message);
    setRows(
      (data ?? []).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        default_duration_s: p.default_duration_s as number,
        items: (p.playlist_items ?? []) as { duration_s: number | null }[],
      })),
    );
    setLoading(false);
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!org) return;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ org_id: org.org_id, name: "Nova playlist" })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    void navigate({ to: "/playlists/$id", params: { id: data.id as string } });
  };

  const remove = async (row: Row) => {
    if (!confirm(`Apagar a playlist "${row.name}"?`)) return;
    const { error } = await supabase.from("playlists").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Playlist apagada.");
    void load();
  };

  const total = (r: Row) =>
    r.items.reduce((sum, it) => sum + (it.duration_s ?? r.default_duration_s), 0);

  return (
    <AppShell
      title="Playlists"
      actions={
        canEdit ? (
          <Button onClick={create}>
            <Plus className="mr-2 h-4 w-4" />
            Nova playlist
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="Sem playlists"
          description="Crie uma playlist e acrescente produtos, imagens, vídeos ou canais."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Link to="/playlists/$id" params={{ id: r.id }} className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.items.length} item(ns) · {Math.round(total(r) / 60)} min {total(r) % 60}s
                </div>
              </Link>
              {canEdit ? (
                <Button size="sm" variant="outline" onClick={() => remove(r)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
