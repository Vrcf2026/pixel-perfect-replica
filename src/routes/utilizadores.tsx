import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useOrg } from "@/features/org/OrgContext";
import { listManagedUsers, createManagedUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/utilizadores")({
  head: () => ({
    meta: [
      { title: "Utilizadores — VRCF Montra" },
      { name: "description", content: "Criar e gerir contas de acesso ao painel." },
      { property: "og:title", content: "Utilizadores — VRCF Montra" },
      { property: "og:description", content: "Criar e gerir contas de acesso ao painel." },
    ],
  }),
  component: UtilizadoresPage,
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Leitura",
};

function UtilizadoresPage() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const list = useServerFn(listManagedUsers);
  const create = useServerFn(createManagedUser);
  const q = useQuery({ queryKey: ["managed-users"], queryFn: () => list() });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState<string>("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const orgs = q.data?.orgs ?? [];
  const targetOrg = orgId || (orgs.find((o) => o.id === org?.org_id)?.id ?? orgs[0]?.id ?? "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A palavra-passe tem de ter pelo menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await create({ data: { email, password, org_id: targetOrg, role } });
      toast.success("Utilizador criado.");
      setEmail("");
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["managed-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar utilizador.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Utilizadores">
      {q.isLoading ? null : orgs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sem permissão"
          description="Só o superadmin e os proprietários de uma organização podem criar utilizadores."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Novo utilizador</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-pass">Palavra-passe inicial</Label>
                  <Input id="u-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select value={targetOrg} onValueChange={setOrgId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Permissão</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Proprietário (pode criar utilizadores)</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Leitura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={busy || !targetOrg}>
                  {busy ? "A criar…" : "Criar utilizador"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">
                Membros {q.data?.isSuper ? "(todas as organizações)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(q.data?.members ?? []).map((m) => (
                <div key={m.org_id + m.user_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{m.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {orgs.find((o) => o.id === m.org_id)?.name}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role] ?? m.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
