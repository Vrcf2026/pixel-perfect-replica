import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MonitorPlay,
  LayoutTemplate,
  ListVideo,
  Radio,
  Images,
  Palette,
  Settings,
  Menu,
  LogOut,
  Building2,
  Loader2,
  Users,
  Crown,
  PauseCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useOrg } from "@/features/org/OrgContext";
import { CreateOrgScreen } from "@/features/org/CreateOrgScreen";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/ecras", label: "Ecrãs", icon: MonitorPlay },
  { to: "/layouts", label: "Layouts", icon: LayoutTemplate },
  { to: "/playlists", label: "Playlists", icon: ListVideo },
  { to: "/fontes", label: "Fontes de vídeo", icon: Radio },
  { to: "/biblioteca", label: "Biblioteca", icon: Images },
  { to: "/aparencia", label: "Aparência", icon: Palette },
  { to: "/utilizadores", label: "Utilizadores", icon: Users },
  { to: "/definicoes", label: "Definições", icon: Settings },
] as const;

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Leitura",
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { memberships, org, setOrg, role, isSuper } = useOrg();
  const nav = isSuper
    ? [{ to: "/clientes", label: "Clientes", icon: Crown } as const, ...NAV]
    : NAV;
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <div className="font-display text-xl font-bold tracking-wide">VRCF Montra</div>
        <div className="mt-3">
          <Select value={org?.org_id ?? ""} onValueChange={setOrg}>
            <SelectTrigger className="w-full border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((m) => (
                <SelectItem key={m.org_id} value={m.org_id}>
                  {m.name}
                  {m.suspended ? " (suspenso)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role ? (
            <div className="mt-1 text-xs text-sidebar-foreground/60">
              {org?.viaSuper ? "Acesso de administrador" : ROLE_LABEL[role]}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2">
        <button
          onClick={async () => {
            await signOut();
            void navigate({ to: "/login" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session, loading: authLoading } = useAuth();
  const { loading: orgLoading, memberships, org } = useOrg();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) void navigate({ to: "/login" });
  }, [authLoading, session, navigate]);

  if (authLoading || orgLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (memberships.length === 0) {
    return <CreateOrgScreen />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="fixed h-screen w-60">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-display flex-1 truncate text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        {org?.suspended ? (
          <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 md:px-6">
            <PauseCircle className="h-4 w-4 shrink-0" />
            Esta organização está suspensa: os ecrãs não mostram conteúdo até ser reativada.
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Building2,
  title,
  description,
  action,
}: {
  icon?: typeof Building2;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <div className="font-display text-lg font-semibold">{title}</div>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
