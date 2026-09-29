import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/untypedDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DAYS } from "./shared";

export type OpenHours = {
  open_days: number[];
  open_from: string | null;
  open_to: string | null;
  alerts_enabled: boolean;
};

export function OpenHoursCard({
  screenId,
  initial,
  canEdit,
  onSaved,
}: {
  screenId: string;
  initial: OpenHours;
  canEdit: boolean;
  onSaved?: (h: OpenHours) => void;
}) {
  const [h, setH] = useState<OpenHours>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => setH(initial),
    [initial.open_from, initial.open_to, initial.alerts_enabled, initial.open_days.join(",")],
  );

  const save = async () => {
    setBusy(true);
    const { error } = await db
      .from("screens")
      .update({
        open_days: h.open_days,
        open_from: h.open_from || null,
        open_to: h.open_to || null,
        alerts_enabled: h.alerts_enabled,
      })
      .eq("id", screenId);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Horário guardado.");
      onSaved?.(h);
    }
  };

  return (
    <fieldset disabled={!canEdit} className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <div className="text-sm font-semibold">Horário da loja e alertas</div>
        <p className="text-xs text-muted-foreground">
          Recebe um email se o ecrã ficar sem sinal durante o horário de funcionamento. Fora de
          horas não há alertas.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d) => {
          const on = h.open_days.includes(d.n);
          return (
            <button
              key={d.n}
              type="button"
              onClick={() => {
                const days = on
                  ? h.open_days.filter((x) => x !== d.n)
                  : [...h.open_days, d.n].sort((a, b) => a - b);
                if (days.length) setH({ ...h, open_days: days });
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                on
                  ? "border-[#F28C28] bg-[#F28C28] text-[#0F1E36]"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Abre às</Label>
          <Input
            type="time"
            value={h.open_from?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, open_from: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fecha às</Label>
          <Input
            type="time"
            value={h.open_to?.slice(0, 5) ?? ""}
            onChange={(e) => setH({ ...h, open_to: e.target.value || null })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="alerts" className="text-sm">
          Alertas por email
        </Label>
        <Switch
          id="alerts"
          checked={h.alerts_enabled}
          onCheckedChange={(alerts_enabled) => setH({ ...h, alerts_enabled })}
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar horário
        </Button>
      </div>
    </fieldset>
  );
}
