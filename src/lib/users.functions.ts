import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function callerInfo(ctx: Ctx) {
  const { data: isSuper } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "superadmin",
  });
  const { data: owned } = await ctx.supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", ctx.userId)
    .eq("role", "owner");
  return {
    isSuper: Boolean(isSuper),
    ownedOrgIds: ((owned ?? []) as { org_id: string }[]).map((r) => r.org_id),
  };
}

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const info = await callerInfo(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let orgQuery = supabaseAdmin.from("organizations").select("id, name").order("name");
    if (!info.isSuper) {
      if (info.ownedOrgIds.length === 0) return { isSuper: false, orgs: [], members: [] };
      orgQuery = orgQuery.in("id", info.ownedOrgIds);
    }
    const { data: orgs, error } = await orgQuery;
    if (error) throw new Error(error.message);
    const orgIds = (orgs ?? []).map((o) => o.id);

    const { data: rows } = orgIds.length
      ? await supabaseAdmin
          .from("org_members")
          .select("org_id, user_id, role, created_at")
          .in("org_id", orgIds)
      : { data: [] as { org_id: string; user_id: string; role: string; created_at: string }[] };

    const emails = new Map<string, string>();
    for (const uid of new Set((rows ?? []).map((r) => r.user_id))) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      emails.set(uid, data.user?.email ?? "—");
    }

    return {
      isSuper: info.isSuper,
      orgs: orgs ?? [],
      members: (rows ?? []).map((r) => ({ ...r, email: emails.get(r.user_id) ?? "—" })),
    };
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        org_id: z.string().uuid(),
        role: z.enum(["owner", "editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const info = await callerInfo(context as unknown as Ctx);
    if (!info.isSuper && !info.ownedOrgIds.includes(data.org_id)) {
      throw new Error("Sem permissão para criar utilizadores nesta organização.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new Error(
        error?.message?.toLowerCase().includes("already")
          ? "Já existe uma conta com este email."
          : (error?.message ?? "Erro ao criar utilizador."),
      );
    }
    const { error: mErr } = await supabaseAdmin
      .from("org_members")
      .insert({ org_id: data.org_id, user_id: created.user.id, role: data.role });
    if (mErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(mErr.message);
    }
    return { id: created.user.id };
  });
