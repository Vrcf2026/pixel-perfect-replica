import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = { admin_email: string | null; from_email: string; alert_after_min: number };

/** Definições da plataforma (só superadmin): para onde vão os alertas de todos os clientes. */
export function PlatformSettingsCard() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void db
      .from("platform_settings")
      .select("admin_email,from_email,alert_after_min")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return; // SQL 04 ainda não aplicado
        setS(
          (data as Settings | null) ?? {
            admin_email: null,
            from_email: "alertas@vrcf.pt",
            alert_after_min: 10,
          },
        );
      });
  }, []);

  if (!s) return null;

  const save = async () => {
    setBusy(true);
    const { error } = await db
      .from("platform_settings")
      .update({
        admin_email: s.admin_email?.trim() || null,
        from_email: s.from_email.trim(),
        alert_after_min: Math.min(240, Math.max(2, Math.round(s.alert_after_min))),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Definições de alertas guardadas.");
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <div className="text-sm font-semibold">Alertas da plataforma</div>
        <p className="text-xs text-muted-foreground">
          O seu email recebe os alertas de todos os clientes, além dos emails que cada cliente
          definir.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">O seu email</Label>
          <Input
            value={s.admin_email ?? ""}
            placeholder="geral@vrcf.pt"
            onChange={(e) => setS({ ...s, admin_email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Remetente (domínio validado no Resend)</Label>
          <Input
            value={s.from_email}
            onChange={(e) => setS({ ...s, from_email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Alertar após (minutos sem sinal)</Label>
          <Input
            type="number"
            min={2}
            max={240}
            value={s.alert_after_min}
            onChange={(e) => setS({ ...s, alert_after_min: Number(e.target.value) || 10 })}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar
        </Button>
      </div>
    </section>
  );
}
