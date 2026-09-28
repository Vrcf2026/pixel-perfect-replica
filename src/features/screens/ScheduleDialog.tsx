import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYS } from "./shared";
import type { ScheduleRow } from "./WeekView";

export type ScheduleDraft = Omit<ScheduleRow, "id"> & { id?: string };

export const EMPTY_SCHEDULE: ScheduleDraft = {
  name: "",
  layout_id: "",
  days: [1, 2, 3, 4, 5, 6, 7],
  time_from: "09:00",
  time_to: "13:00",
  date_from: null,
  date_to: null,
  priority: 0,
  enabled: true,
};

export function ScheduleDialog({
  open,
  initial,
  layouts,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ScheduleDraft;
  layouts: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (d: ScheduleDraft) => Promise<void>;
}) {
  const [d, setD] = useState<ScheduleDraft>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setD(initial), [initial]);
  const set = (p: Partial<ScheduleDraft>) => setD((x) => ({ ...x, ...p }));
  const overnight = d.time_from && d.time_to && d.time_from > d.time_to;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar horário" : "Novo horário"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Nome (opcional)</Label>
              <Input
                value={d.name ?? ""}
                placeholder="Ex.: Manhã"
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Layout</Label>
              <Select value={d.layout_id} onValueChange={(layout_id) => set({ layout_id })}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher…" />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dias</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const on = d.days.includes(day.n);
                return (
                  <button
                    key={day.n}
                    type="button"
                    onClick={() => {
                      const days = on
                        ? d.days.filter((x) => x !== day.n)
                        : [...d.days, day.n].sort((a, b) => a - b);
                      if (days.length) set({ days });
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      on
                        ? "border-[#F28C28] bg-[#F28C28] text-[#0F1E36]"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Das</Label>
              <Input
                type="time"
                value={d.time_from ?? ""}
                onChange={(e) => set({ time_from: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Às</Label>
              <Input
                type="time"
                value={d.time_to ?? ""}
                onChange={(e) => set({ time_to: e.target.value || null })}
              />
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            {overnight
              ? "A hora de fim é menor do que a de início: o horário passa a meia-noite."
              : "Vazio = o dia todo. Se a hora de fim for menor, passa a meia-noite."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>De (data, opcional)</Label>
              <Input
                type="date"
                value={d.date_from ?? ""}
                onChange={(e) => set({ date_from: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Até (data, opcional)</Label>
              <Input
                type="date"
                value={d.date_to ?? ""}
                onChange={(e) => set({ date_to: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-2">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Input
                type="number"
                value={d.priority}
                onChange={(e) => set({ priority: Math.round(Number(e.target.value) || 0) })}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={d.enabled} onCheckedChange={(enabled) => set({ enabled })} />
              <Label>Ativo</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={busy || !d.layout_id}
            onClick={async () => {
              setBusy(true);
              await onSave(d);
              setBusy(false);
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
