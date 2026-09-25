import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { isImage, isVideo, type MediaRow } from "./api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function MediaPicker({
  kind = "any",
  onPick,
  children,
}: {
  kind?: "image" | "video" | "any";
  onPick: (m: MediaRow) => void;
  children: ReactNode;
}) {
  const { org } = useOrg();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || !org) return;
    supabase
      .from("media")
      .select("*")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as MediaRow[]));
  }, [open, org]);

  const filtered = rows.filter((r) => {
    if (kind === "image" && !isImage(r.mime)) return false;
    if (kind === "video" && !isVideo(r.mime)) return false;
    return !q || r.name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Escolher da biblioteca</DialogTitle>
        </DialogHeader>
        <Input placeholder="Pesquisar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onPick(m);
                setOpen(false);
              }}
              className="group overflow-hidden rounded-md border text-left hover:border-accent"
            >
              <div className="aspect-video bg-muted">
                {isImage(m.mime) ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={m.url} muted className="h-full w-full object-cover" />
                )}
              </div>
              <div className="truncate p-2 text-xs">{m.name}</div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Sem ficheiros. Carregue-os na Biblioteca.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
