import {
  useRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/untypedDb";
import { useAuth } from "@/features/auth/AuthContext";

export type Role = "owner" | "editor" | "viewer";

export type Membership = {
  org_id: string;
  role: Role;
  name: string;
  suspended?: boolean;
  /** true quando o acesso vem de ser superadmin e não de ser membro */
  viaSuper?: boolean;
};

type OrgValue = {
  loading: boolean;
  memberships: Membership[];
  org: Membership | null;
  role: Role | null;
  canEdit: boolean;
  isSuper: boolean;
  setOrg: (orgId: string) => void;
  refresh: () => Promise<void>;
};

const STORAGE_KEY = "vrcf.org_id";

const OrgCtx = createContext<OrgValue>({
  loading: true,
  memberships: [],
  org: null,
  role: null,
  canEdit: false,
  isSuper: false,
  setOrg: () => {},
  refresh: async () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuper, setIsSuper] = useState(false);

  const userId = user?.id ?? null;
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setIsSuper(false);
      setMemberships([]);
      setOrgId(null);
      setLoading(false);
      return;
    }
    // Só mostra "a carregar" na primeira vez; recargas depois são silenciosas
    // (evita que a página inteira pisque quando a sessão é renovada).
    if (loadedFor.current !== userId) setLoading(true);
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(name)")
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      setMemberships([]);
      setLoading(false);
      return;
    }

    const list: Membership[] = (data ?? []).map((row) => {
      const orgRow = row.organizations as unknown as { name: string } | null;
      return {
        org_id: row.org_id as string,
        role: row.role as Role,
        name: orgRow?.name ?? "Organização",
      };
    });
    // Superadmin: acede a todas as organizações.
    const { data: sup } = await db.rpc("is_superadmin");
    const superadmin = sup === true;
    setIsSuper(superadmin);
    const { data: orgRows } = await db.from("organizations").select("id, name, suspended");
    const orgInfo = new Map(
      ((orgRows ?? []) as Array<{ id: string; name: string; suspended?: boolean }>).map((o) => [
        o.id,
        o,
      ]),
    );
    for (const m of list) m.suspended = orgInfo.get(m.org_id)?.suspended ?? false;
    if (superadmin) {
      for (const o of orgInfo.values()) {
        if (!list.some((m) => m.org_id === o.id)) {
          list.push({
            org_id: o.id,
            role: "owner",
            name: o.name,
            suspended: o.suspended ?? false,
            viaSuper: true,
          });
        }
      }
    }
    list.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    setMemberships(list);

    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const next = list.find((m) => m.org_id === stored)?.org_id ?? list[0]?.org_id ?? null;
    setOrgId((cur) => (cur && list.some((m) => m.org_id === cur) ? cur : next));
    loadedFor.current = userId;
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const setOrg = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setOrgId(id);
  }, []);

  const org = memberships.find((m) => m.org_id === orgId) ?? null;

  return (
    <OrgCtx.Provider
      value={{
        loading: authLoading || loading,
        memberships,
        org,
        role: org?.role ?? null,
        canEdit: org?.role === "owner" || org?.role === "editor",
        isSuper,
        setOrg,
        refresh: load,
      }}
    >
      {children}
    </OrgCtx.Provider>
  );
}

export function useOrg() {
  return useContext(OrgCtx);
}
