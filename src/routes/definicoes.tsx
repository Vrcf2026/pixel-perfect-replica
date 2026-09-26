import { createFileRoute } from "@tanstack/react-router";
import { useOrg } from "@/features/org/OrgContext";
import { useAuth } from "@/features/auth/AuthContext";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — VRCF Montra" },
      { name: "description", content: "Dados da conta e da organização." },
      { property: "og:title", content: "Definições — VRCF Montra" },
      { property: "og:description", content: "Dados da conta e da organização." },
    ],
  }),
  component: DefinicoesPage,
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Leitura",
};

function DefinicoesPage() {
  const { org, role } = useOrg();
  const { user } = useAuth();

  return (
    <AppShell title="Definições">
      <div className="max-w-md space-y-4 rounded-lg border bg-card p-5 text-sm">
        <div>
          <div className="text-muted-foreground">Conta</div>
          <div className="font-medium">{user?.email}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Organização</div>
          <div className="font-medium">{org?.name}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Permissão</div>
          <div className="font-medium">{role ? ROLE_LABEL[role] : "—"}</div>
        </div>
      </div>
    </AppShell>
  );
}
