import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails que recebem os alertas de ecrãs sem sinal desta organização. */
export function AlertEmailsCard({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void db
      .from("organizations")
      .select("alert_emails")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => setText(((data?.alert_emails as string[] | undefined) ?? []).join("\n")));
  }, [orgId]);

  const save = async () => {
    const list = [
      ...new Set(
        text
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const bad = list.filter((e) => !EMAIL.test(e));
    if (bad.length) {
      toast.error(`Email inválido: ${bad.join(", ")}`);
      return;
    }
    if (list.length > 10) {
      toast.error("Máximo de 10 emails.");
      return;
    }
    setBusy(true);
    const { error } = await db.from("organizations").update({ alert_emails: list }).eq("id", orgId);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setText(list.join("\n"));
      toast.success("Emails de alerta guardados.");
    }
  };

  return (
    <fieldset disabled={!canEdit} className="max-w-md space-y-3 rounded-lg border bg-card p-5">
      <div>
        <div className="text-sm font-semibold">Alertas por email</div>
        <p className="text-xs text-muted-foreground">
          Quem recebe um aviso quando um ecrã fica sem sinal no horário da loja (um email por
          linha). O horário de cada ecrã define-se na página do ecrã.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Emails</Label>
        <Textarea
          rows={3}
          value={text}
          placeholder="gerente@empresa.pt"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar
        </Button>
      </div>
    </fieldset>
  );
}
