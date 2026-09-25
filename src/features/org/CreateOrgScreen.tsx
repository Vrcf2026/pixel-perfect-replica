import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/features/org/OrgContext";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateOrgScreen() {
  const { refresh } = useOrg();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_organization", { p_name: name.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organização criada.");
    await refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Criar organização</CardTitle>
          <CardDescription>
            Ainda não pertence a nenhuma organização. Crie a sua para começar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org">Nome da organização</Label>
            <Input
              id="org"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Café Central"
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <Button className="w-full" onClick={create} disabled={busy || !name.trim()}>
            {busy ? "A criar…" : "Criar organização"}
          </Button>
          <button
            className="w-full text-sm text-muted-foreground underline"
            onClick={() => signOut()}
          >
            Terminar sessão
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
