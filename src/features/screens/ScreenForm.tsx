import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESOLUTIONS, TIMEZONES } from "./shared";

export type ScreenFormValue = {
  name: string;
  width: number;
  height: number;
  timezone: string;
  default_layout_id: string | null;
  notes: string;
};

const NONE = "__none__";

export function ScreenForm({
  value,
  onChange,
  layouts,
}: {
  value: ScreenFormValue;
  onChange: (v: ScreenFormValue) => void;
  layouts: Array<{ id: string; name: string; orientation: string }>;
}) {
  const res = `${value.width}x${value.height}`;
  const preset = RESOLUTIONS.some((r) => r.value === res) ? res : "custom";
  const set = (patch: Partial<ScreenFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nome</Label>
        <Input
          value={value.name}
          placeholder="Ex.: Montra da loja"
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Resolução</Label>
        <Select
          value={preset}
          onValueChange={(v) => {
            if (v === "custom") return set({ width: value.width + 0 });
            const [w, h] = v.split("x").map(Number);
            set({ width: w ?? 1920, height: h ?? 1080 });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Largura</Label>
          <Input
            type="number"
            min={320}
            max={7680}
            value={value.width}
            onChange={(e) => set({ width: Math.max(320, Number(e.target.value) || 1920) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Altura</Label>
          <Input
            type="number"
            min={240}
            max={7680}
            value={value.height}
            onChange={(e) => set({ height: Math.max(240, Number(e.target.value) || 1080) })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Fuso horário</Label>
        <Select value={value.timezone} onValueChange={(timezone) => set({ timezone })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Layout por defeito</Label>
        <Select
          value={value.default_layout_id ?? NONE}
          onValueChange={(v) => set({ default_layout_id: v === NONE ? null : v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Nenhum —</SelectItem>
            {layouts.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} {l.orientation === "portrait" ? "(vertical)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notas</Label>
        <Textarea
          rows={2}
          value={value.notes}
          placeholder="Ex.: mini PC atrás da TV, AnyDesk 123 456 789"
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}

export function orientationOf(w: number, h: number): "landscape" | "portrait" {
  return h > w ? "portrait" : "landscape";
}
