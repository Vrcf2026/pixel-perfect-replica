import { MediaPicker } from "@/features/media/MediaPicker";
import { PRODUCT_TEMPLATES, SERVICE_TEMPLATES, type ItemData, type ItemKind } from "./contract";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  kind: ItemKind;
  data: ItemData;
  onChange: (patch: ItemData) => void;
  sources: Array<{ id: string; name: string }>;
};

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={String(value ?? "")}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Colour({ label, value, onChange }: { label: string; value: unknown; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={String(value ?? "#0F1E36")}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border"
        />
        <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="#0F1E36" />
      </div>
    </div>
  );
}

function Picker({
  label,
  kind,
  value,
  onChange,
}: {
  label: string;
  kind: "image" | "video";
  value: unknown;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        <MediaPicker kind={kind} onPick={(m) => onChange(m.url)}>
          <Button type="button" variant="outline">
            Biblioteca
          </Button>
        </MediaPicker>
      </div>
    </div>
  );
}

function Style({ data, set }: { data: ItemData; set: (p: ItemData) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Colour label="Fundo" value={data.bg} onChange={(v) => set({ bg: v })} />
      <Colour label="Texto" value={data.text_color} onChange={(v) => set({ text_color: v })} />
      <Colour label="Destaque" value={data.accent} onChange={(v) => set({ accent: v })} />
    </div>
  );
}

export function ItemForm({ kind, data, onChange, sources }: Props) {
  const set = (patch: ItemData) => onChange({ ...data, ...patch });

  switch (kind) {
    case "product":
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Nome *" value={data.name} onChange={(v) => set({ name: v })} />
            <Text label="Preço *" value={data.price} onChange={(v) => set({ price: v })} placeholder="9,99 €" />
            <Text label="Preço anterior" value={data.old_price} onChange={(v) => set({ old_price: v })} />
            <Text label="Sufixo do preço" value={data.price_suffix} onChange={(v) => set({ price_suffix: v })} placeholder="/kg" />
            <Text label="Categoria" value={data.category} onChange={(v) => set({ category: v })} />
            <Text label="Selo" value={data.badge} onChange={(v) => set({ badge: v })} placeholder="Promoção" />
          </div>
          <Colour label="Cor do selo" value={data.badge_color} onChange={(v) => set({ badge_color: v })} />
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={String(data.description ?? "")} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <Picker label="Imagem" kind="image" value={data.image_url} onChange={(v) => set({ image_url: v })} />
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={String(data.template ?? "photo_left")} onValueChange={(v) => set({ template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Ligação do código QR" value={data.qr_url} onChange={(v) => set({ qr_url: v })} />
            <Text label="Legenda do QR" value={data.qr_caption} onChange={(v) => set({ qr_caption: v })} />
          </div>
          <Style data={data} set={set} />
        </div>
      );

    case "service":
      return (
        <div className="space-y-4">
          <Text label="Título *" value={data.title} onChange={(v) => set({ title: v })} />
          <Text label="Subtítulo" value={data.subtitle} onChange={(v) => set({ subtitle: v })} />
          <div className="space-y-1.5">
            <Label>Pontos (um por linha)</Label>
            <Textarea
              value={(Array.isArray(data.bullets) ? (data.bullets as string[]) : []).join("\n")}
              onChange={(e) => set({ bullets: e.target.value.split("\n").filter(Boolean) })}
            />
          </div>
          <Text label="Ícone" value={data.icon} onChange={(v) => set({ icon: v })} placeholder="scissors, car, coffee…" />
          <Picker label="Imagem" kind="image" value={data.image_url} onChange={(v) => set({ image_url: v })} />
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={String(data.template ?? "big_title")} onValueChange={(v) => set({ template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Ligação do código QR" value={data.qr_url} onChange={(v) => set({ qr_url: v })} />
            <Text label="Legenda do QR" value={data.qr_caption} onChange={(v) => set({ qr_caption: v })} />
          </div>
          <Style data={data} set={set} />
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <Picker label="Imagem *" kind="image" value={data.image_url} onChange={(v) => set({ image_url: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ajuste</Label>
              <Select value={String(data.fit ?? "cover")} onValueChange={(v) => set({ fit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Preencher</SelectItem>
                  <SelectItem value="contain">Caber toda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Colour label="Fundo" value={data.bg} onChange={(v) => set({ bg: v })} />
          </div>
          <Text label="Legenda" value={data.caption} onChange={(v) => set({ caption: v })} />
          <div className="flex items-center justify-between">
            <Label>Movimento lento (Ken Burns)</Label>
            <Switch checked={Boolean(data.ken_burns)} onCheckedChange={(v) => set({ ken_burns: v })} />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-4">
          <Picker label="Vídeo *" kind="video" value={data.video_url} onChange={(v) => set({ video_url: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ajuste</Label>
              <Select value={String(data.fit ?? "cover")} onValueChange={(v) => set({ fit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Preencher</SelectItem>
                  <SelectItem value="contain">Caber todo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Colour label="Fundo" value={data.bg} onChange={(v) => set({ bg: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Sem som</Label>
            <Switch checked={data.muted !== false} onCheckedChange={(v) => set({ muted: v })} />
          </div>
        </div>
      );

    case "stream":
      return (
        <div className="space-y-1.5">
          <Label>Fonte de vídeo *</Label>
          <Select value={String(data.source_id ?? "")} onValueChange={(v) => set({ source_id: v })}>
            <SelectTrigger><SelectValue placeholder="Escolher fonte" /></SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "text":
      return (
        <div className="space-y-4">
          <Text label="Título" value={data.title} onChange={(v) => set({ title: v })} />
          <div className="space-y-1.5">
            <Label>Texto</Label>
            <Textarea value={String(data.body ?? "")} onChange={(e) => set({ body: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Alinhamento</Label>
              <Select value={String(data.align ?? "center")} onValueChange={(v) => set({ align: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">À esquerda</SelectItem>
                  <SelectItem value="center">Ao centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tamanho</Label>
              <Select value={String(data.size ?? "l")} onValueChange={(v) => set({ size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">Médio</SelectItem>
                  <SelectItem value="l">Grande</SelectItem>
                  <SelectItem value="xl">Muito grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Picker label="Imagem de fundo" kind="image" value={data.bg_image_url} onChange={(v) => set({ bg_image_url: v })} />
          <Style data={data} set={set} />
        </div>
      );

    case "qr":
      return (
        <div className="space-y-4">
          <Text label="Ligação *" value={data.url} onChange={(v) => set({ url: v })} />
          <Text label="Título" value={data.title} onChange={(v) => set({ title: v })} />
          <Text label="Legenda" value={data.caption} onChange={(v) => set({ caption: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Colour label="Fundo" value={data.bg} onChange={(v) => set({ bg: v })} />
            <Colour label="Texto" value={data.text_color} onChange={(v) => set({ text_color: v })} />
          </div>
        </div>
      );

    case "webpage":
      return (
        <div className="space-y-4">
          <Text label="Endereço *" value={data.url} onChange={(v) => set({ url: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ampliação ({Number(data.zoom ?? 1)}×)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                value={Number(data.zoom ?? 1)}
                onChange={(e) => set({ zoom: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recarregar a cada (s)</Label>
              <Input
                type="number"
                value={Number(data.refresh_s ?? 0)}
                onChange={(e) => set({ refresh_s: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      );

    case "catalog_feed":
      return (
        <div className="space-y-4">
          <Text label="Link do catálogo (JSON) *" value={data.url} onChange={(v) => set({ url: v })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Máximo de produtos</Label>
              <Input type="number" value={Number(data.limit ?? 20)} onChange={(e) => set({ limit: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Segundos por produto</Label>
              <Input type="number" value={Number(data.per_item_s ?? 8)} onChange={(e) => set({ per_item_s: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Multiplicador de preço</Label>
              <Input type="number" step="0.01" value={Number(data.price_multiplier ?? 1)} onChange={(e) => set({ price_multiplier: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ordem aleatória</Label>
            <Switch checked={Boolean(data.shuffle)} onCheckedChange={(v) => set({ shuffle: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Correspondência de campos (JSON)</Label>
            <Textarea
              rows={3}
              value={JSON.stringify(data.map ?? {}, null, 0)}
              onChange={(e) => {
                try {
                  set({ map: JSON.parse(e.target.value || "{}") });
                } catch {
                  /* ignora enquanto escreve */
                }
              }}
              placeholder={'{"name":"titulo","price":"preco","image_url":"foto"}'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cabeçalhos do pedido (JSON)</Label>
            <Textarea
              rows={2}
              value={JSON.stringify(data.headers ?? {}, null, 0)}
              onChange={(e) => {
                try {
                  set({ headers: JSON.parse(e.target.value || "{}") });
                } catch {
                  /* ignora enquanto escreve */
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={String(data.template ?? "photo_left")} onValueChange={(v) => set({ template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Style data={data} set={set} />
        </div>
      );
  }
}
