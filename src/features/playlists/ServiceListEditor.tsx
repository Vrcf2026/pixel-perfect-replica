import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SLIDE_ICONS, SLIDE_ICON_NAMES } from "@/player/slides/icons";
import type { ItemData } from "./contract";

type Row = { icon?: string; title?: string; note?: string; price?: string };

/** Sugestões rápidas (sem preços: cada loja põe os seus). */
const SUGGESTIONS: Row[] = [
  {
    icon: "wrench",
    title: "Reparação de computadores",
    note: "Portáteis e fixos, diagnóstico rápido",
  },
  { icon: "printer", title: "Fotocópias e impressões", note: "A preto e a cores, A4 e A3" },
  { icon: "hard-drive", title: "Recuperação de dados", note: "Discos, pens e cartões" },
  { icon: "laptop", title: "Formatação e instalação", note: "Windows, programas e antivírus" },
  { icon: "wifi", title: "Redes e Wi-Fi", note: "Instalação e melhoria de cobertura" },
  { icon: "camera", title: "Videovigilância", note: "Câmaras com acesso no telemóvel" },
  { icon: "shield-check", title: "Alarmes", note: "Instalação certificada" },
  { icon: "smartphone", title: "Telemóveis", note: "Acessórios e configuração" },
  { icon: "package", title: "Ponto de recolha", note: "Levante e envie encomendas aqui" },
  { icon: "globe", title: "Sites e presença online", note: "Feitos à medida do seu negócio" },
];

export function ServiceListEditor({ data, set }: { data: ItemData; set: (p: ItemData) => void }) {
  const rows = Array.isArray(data.list) ? (data.list as Row[]) : [];
  const setRows = (list: Row[]) => set({ list });
  const update = (i: number, patch: Row) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const l = [...rows];
    [l[i], l[j]] = [l[j] as Row, l[i] as Row];
    setRows(l);
  };
  const missing = SUGGESTIONS.filter((s) => !rows.some((r) => r.title === s.title));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Serviços</Label>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Acrescente serviços abaixo ou use as sugestões.
          </p>
        ) : null}
        {rows.map((r, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <div className="flex gap-1.5">
              <Select
                value={r.icon || "__none__"}
                onValueChange={(v) => update(i, { icon: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="w-14 shrink-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">—</SelectItem>
                  {SLIDE_ICON_NAMES.map((n) => {
                    const I = SLIDE_ICONS[n]!.icon;
                    return (
                      <SelectItem key={n} value={n}>
                        <span className="flex items-center gap-2">
                          <I className="h-4 w-4" />
                          <span className="sr-only">{SLIDE_ICONS[n]!.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Input
                value={r.title ?? ""}
                placeholder="Serviço"
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <Input
                value={r.price ?? ""}
                placeholder="Preço"
                className="w-28 shrink-0"
                onChange={(e) => update(i, { price: e.target.value })}
              />
            </div>
            <div className="flex gap-1.5">
              <Input
                value={r.note ?? ""}
                placeholder="Nota curta (opcional)"
                className="h-8 text-xs"
                onChange={(e) => update(i, { note: e.target.value })}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows([...rows, { icon: "", title: "", price: "", note: "" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Serviço
        </Button>
        <p className="text-[11px] text-muted-foreground">
          No preço pode escrever o que quiser: "25 €", "desde 15 €", "0,10 €/pág.", "Orçamento
          grátis".
        </p>
      </div>

      {missing.length ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Sugestões (clique para acrescentar)</Label>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((s) => {
              const I = SLIDE_ICONS[s.icon ?? ""]?.icon;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setRows([...rows, { ...s, price: "" }])}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-[#F28C28]"
                >
                  {I ? <I className="h-3.5 w-3.5" /> : null}
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Colunas</Label>
          <Select
            value={String(data.columns ?? "auto")}
            onValueChange={(v) => set({ columns: v === "auto" ? undefined : Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automático</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Segundos por página</Label>
          <Input
            type="number"
            min={4}
            max={60}
            value={Number(data.page_s ?? 8)}
            onChange={(e) => set({ page_s: Math.max(4, Number(e.target.value) || 8) })}
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Switch
            checked={data.highlight !== false}
            onCheckedChange={(v) => set({ highlight: v })}
          />
          <Label className="text-xs">Destaque a passar</Label>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Se houver mais serviços do que cabem, a lista passa sozinha para a página seguinte. Para
        mostrar tudo, ponha a duração do item em pelo menos (nº de páginas × segundos por página).
      </p>
    </div>
  );
}
