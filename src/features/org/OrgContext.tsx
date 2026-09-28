import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export type Role = "owner" | "editor" | "viewer";

export type Membership = {
  org_id: string;
  role: Role;
  name: string;
};

type OrgValue = {
  loading: boolean;
  memberships: Membership[];
  org: Membership | null;
  role: Role | null;
  canEdit: boolean;
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
  setOrg: () => {},
  refresh: async () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setOrgId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(name)")
      .eq("user_id", user.id);

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
    list.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    setMemberships(list);

    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const next = list.find((m) => m.org_id === stored)?.org_id ?? list[0]?.org_id ?? null;
    setOrgId(next);
    setLoading(false);
  }, [user]);

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
