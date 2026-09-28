import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Crown, Loader2, LogIn, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { createManagedUser } from "@/lib/users.functions";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_META, lastSeen, screenStatus } from "@/features/screens/shared";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — VRCF Montra" },
      { name: "description", content: "Organizações, limites e estado de todos os ecrãs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientesPage,
});

type OrgRow = {
  id: string;
  name: string;
  suspended: boolean;
  max_screens: number | null;
  notes: string | null;
  created_at: string;
};
type ScreenLite = {
  id: string;
  org_id: string;
  name: string;
  enabled: boolean;
  last_seen_at: string | null;
};
type Draft = {
  id?: string;
  name: string;
  max_screens: string;
  notes: string;
  email: string;
  password: string;
};

const EMPTY: Draft = { name: "", max_screens: "1", notes: "", email: "", password: "" };

function ClientesPage() {
  const { isSuper, loading: orgLoading, setOrg, refresh } = useOrg();
  const navigate = useNavigate();
  const createUser = useServerFn(createManagedUser);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [screens, setScreens] = useState<ScreenLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([
      db
        .from("organizations")
        .select("id,name,suspended,max_screens,notes,created_at")
        .order("name"),
      db.from("screens").select("id,org_id,name,enabled,last_seen_at").order("name"),
    ]);
    if (o.error) toast.error(o.error.message);
    setOrgs((o.data ?? []) as OrgRow[]);
    setScreens((s.data ?? []) as ScreenLite[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSuper) return;
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [isSuper, load]);

  const byOrg = useMemo(() => {
    const m = new Map<string, ScreenLite[]>();
    for (const s of screens) m.set(s.org_id, [...(m.get(s.org_id) ?? []), s]);
    return m;
  }, [screens]);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "?";

  const enter = (orgId: string, to: "/" | "/ecras/$id" = "/", screenId?: string) => {
    setOrg(orgId);
    if (to === "/ecras/$id" && screenId) void navigate({ to, params: { id: screenId } });
    else void navigate({ to: "/" });
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error("Indique o nome do cliente.");
      return;
    }
    const max =
      draft.max_screens.trim() === "" ? null : Math.max(0, Math.round(Number(draft.max_screens)));
    if (draft.password && draft.password.length < 8) {
      toast.error("A palavra-passe tem de ter pelo menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (draft.id) {
        const { error } = await db
          .from("organizations")
          .update({ name, max_screens: max, notes: draft.notes || null })
          .eq("id", draft.id);
        if (error) throw error;
        toast.success("Cliente atualizado.");
      } else {
        const { data: id, error } = await db.rpc("admin_create_organization", {
          p_name: name,
          p_max_screens: max,
          p_notes: draft.notes || null,
        });
        if (error) throw error;
        if (draft.email.trim()) {
          try {
            await createUser({
              data: {
                email: draft.email.trim(),
                password: draft.password,
                org_id: id as string,
                role: "owner",
              },
            });
            toast.success("Cliente e utilizador criados.");
          } catch (e) {
            toast.error(
              `Cliente criado, mas o utilizador falhou: ${e instanceof Error ? e.message : "erro"}. Pode criá-lo em Utilizadores.`,
            );
          }
        } else toast.success("Cliente criado.");
      }
      setDraft(null);
      await Promise.all([load(), refresh()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async (o: OrgRow, suspended: boolean) => {
    if (
      suspended &&
      !confirm(
        `Suspender "${o.name}"? Os ecrãs deixam de mostrar conteúdo em cerca de 20 segundos.`,
      )
    )
      return;
    const { error } = await db.from("organizations").update({ suspended }).eq("id", o.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(suspended ? "Cliente suspenso." : "Cliente reativado.");
    await Promise.all([load(), refresh()]);
  };

  const remove = async (o: OrgRow) => {
    const typed = prompt(
      `Isto apaga "${o.name}" com TODOS os ecrãs, playlists, layouts e ficheiros registados. Não dá para desfazer.\n\nEscreva o nome do cliente para confirmar:`,
    );
    if (typed === null) return;
    if (typed.trim() !== o.name) {
      toast.error("O nome não corresponde. Nada foi apagado.");
      return;
    }
    const { error } = await db.from("organizations").delete().eq("id", o.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cliente apagado.");
    await Promise.all([load(), refresh()]);
  };

  if (orgLoading) {
    return (
      <AppShell title="Clientes">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }
  if (!isSuper) {
    return (
      <AppShell title="Clientes">
        <EmptyState
          icon={Crown}
          title="Sem acesso"
          description="Esta página é só para o administrador da plataforma."
        />
      </AppShell>
    );
  }

  const shownScreens = screens.filter((s) => {
    if (!onlyProblems) return true;
    const st = screenStatus(s);
    return st === "offline" || st === "never";
  });
  const totalOnline = screens.filter((s) => screenStatus(s) === "online").length;

  return (
    <AppShell
      title="Clientes"
      actions={
        <Button onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" />
          Novo cliente
        </Button>
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">{orgs.length}</div>
              <div className="text-sm text-muted-foreground">Clientes</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">
                {totalOnline}
                <span className="text-lg text-muted-foreground">/{screens.length}</span>
              </div>
              <div className="text-sm text-muted-foreground">Ecrãs online</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="font-display text-3xl font-bold">
                {orgs.filter((o) => o.suspended).length}
              </div>
              <div className="text-sm text-muted-foreground">Suspensos</div>
            </div>
          </div>

          {orgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Sem clientes"
              description="Crie o primeiro cliente com o botão acima."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              {orgs.map((o) => {
                const list = byOrg.get(o.id) ?? [];
                const online = list.filter((s) => screenStatus(s) === "online").length;
                const offline = list.filter((s) =>
                  ["offline", "never"].includes(screenStatus(s)),
                ).length;
                return (
                  <div
                    key={o.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 last:border-b-0 ${o.suspended ? "bg-amber-50/60" : ""}`}
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="font-medium">
                        {o.name}
                        {o.suspended ? (
                          <span className="ml-2 text-xs font-normal text-amber-700">suspenso</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {online}/{list.length} online
                        {offline ? (
                          <span className="text-red-600"> · {offline} sem sinal</span>
                        ) : null}
                        {" · "}
                        limite:{" "}
                        {o.max_screens === null
                          ? "ilimitado"
                          : `${list.length} de ${o.max_screens}`}
                        {o.notes ? ` · ${o.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`s-${o.id}`} className="text-xs text-muted-foreground">
                        Ativo
                      </Label>
                      <Switch
                        id={`s-${o.id}`}
                        checked={!o.suspended}
                        onCheckedChange={(on) => void toggleSuspend(o, !on)}
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => enter(o.id)}>
                      <LogIn className="mr-1.5 h-3.5 w-3.5" /> Entrar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Editar"
                      onClick={() =>
                        setDraft({
                          id: o.id,
                          name: o.name,
                          max_screens: o.max_screens === null ? "" : String(o.max_screens),
                          notes: o.notes ?? "",
                          email: "",
                          password: "",
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Apagar"
                      onClick={() => void remove(o)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Todos os ecrãs</div>
              <div className="flex items-center gap-2">
                <Switch id="prob" checked={onlyProblems} onCheckedChange={setOnlyProblems} />
                <Label htmlFor="prob" className="text-xs">
                  Só os que têm problemas
                </Label>
              </div>
            </div>
            {shownScreens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {onlyProblems ? "Nenhum ecrã com problemas." : "Ainda não há ecrãs."}
              </p>
            ) : (
              <div className="divide-y">
                {shownScreens.map((s) => {
                  const st = STATUS_META[screenStatus(s)];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => enter(s.org_id, "/ecras/$id", s.id)}
                      className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{s.name}</span>{" "}
                        <span className="text-muted-foreground">· {orgName(s.org_id)}</span>
                      </span>
                      <span className={`text-xs ${st.text}`}>
                        {st.label} · {lastSeen(s.last_seen_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={draft.name}
                  placeholder="Ex.: Café Central"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de ecrãs</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.max_screens}
                  placeholder="Vazio = ilimitado"
                  onChange={(e) => setDraft({ ...draft, max_screens: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Vazio = sem limite. Baixar o limite não apaga ecrãs já criados.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Notas (só visíveis para si)</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  placeholder="Ex.: pacote 3 ecrãs, 15 €/mês, contacto Sr. Rui"
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
              {!draft.id ? (
                <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                  <div className="text-sm font-medium">Utilizador do cliente (opcional)</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="email"
                      placeholder="email@cliente.pt"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                    <Input
                      type="text"
                      placeholder="Palavra-passe (mín. 8)"
                      value={draft.password}
                      onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fica como proprietário: gere os conteúdos e os utilizadores dele, mas não altera
                    o limite nem a suspensão.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
