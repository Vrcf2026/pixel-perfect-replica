import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "@/features/media/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZONE_KINDS, ZONE_META, defaultZoneConfig, round1 } from "./templates";
import type { Zone, ZoneConfig, ZoneKind, ZoneStyle } from "./types";

type Props = {
  zone: Zone;
  readOnly: boolean;
  sources: Array<{ id: string; name: string }>;
  playlists: Array<{ id: string; name: string }>;
  onChange: (patch: Partial<Zone>) => void;
};

const NONE = "__none__";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Num({
  value,
  onChange,
  min,
  max,
  step = 0.5,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        if (e.target.value === "") return;
        let n = Number(e.target.value);
        if (!Number.isFinite(n)) return;
        if (min !== undefined) n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        onChange(n);
      }}
    />
  );
}

function Colour({
  value,
  onChange,
  fallback = "#000000",
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  fallback?: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-11 shrink-0 rounded border"
      />
      <Input
        value={value ?? ""}
        placeholder="(nenhuma)"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Pick<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger>
        <SelectValue placeholder="Escolher…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ALIGN = [
  { value: "left" as const, label: "Esquerda" },
  { value: "center" as const, label: "Centro" },
  { value: "right" as const, label: "Direita" },
];

export function Inspector({ zone, readOnly, sources, playlists, onChange }: Props) {
  const c = zone.config ?? {};
  const st = zone.style ?? {};
  const setC = (patch: ZoneConfig) => onChange({ config: { ...c, ...patch } });
  const setS = (patch: ZoneStyle) => onChange({ style: { ...st, ...patch } });
  const clampRect = (patch: Partial<Pick<Zone, "x" | "y" | "w" | "h">>) => {
    const next = { x: zone.x, y: zone.y, w: zone.w, h: zone.h, ...patch };
    next.w = Math.min(next.w, 100 - next.x);
    next.h = Math.min(next.h, 100 - next.y);
    onChange({ x: round1(next.x), y: round1(next.y), w: round1(next.w), h: round1(next.h) });
  };

  const changeKind = (kind: ZoneKind) => {
    if (kind === zone.kind) return;
    onChange({
      kind,
      config: defaultZoneConfig(kind),
      source_id: kind === "main" ? zone.source_id : null,
      playlist_id: kind === "playlist" ? zone.playlist_id : null,
    });
  };

  const messages = c.messages ?? [];
  const setMsg = (list: string[]) => setC({ messages: list });

  return (
    <fieldset disabled={readOnly} className="min-w-0">
      <Tabs defaultValue="conteudo">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="geral">Posição</TabsTrigger>
          <TabsTrigger value="estilo">Estilo</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-3 pt-2">
          <Field label="Nome">
            <Input value={zone.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Tipo de zona">
            <Pick
              value={zone.kind}
              onChange={changeKind}
              options={ZONE_KINDS.map((k) => ({ value: k, label: ZONE_META[k].label }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X (%)">
              <Num value={zone.x} min={0} max={100 - zone.w} onChange={(x) => clampRect({ x })} />
            </Field>
            <Field label="Y (%)">
              <Num value={zone.y} min={0} max={100 - zone.h} onChange={(y) => clampRect({ y })} />
            </Field>
            <Field label="Largura (%)">
              <Num value={zone.w} min={2} max={100} onChange={(w) => clampRect({ w })} />
            </Field>
            <Field label="Altura (%)">
              <Num value={zone.h} min={2} max={100} onChange={(h) => clampRect({ h })} />
            </Field>
          </div>
          <Field label="Cantos arredondados (px)">
            <Num
              value={zone.radius}
              min={0}
              max={200}
              step={1}
              onChange={(radius) => onChange({ radius: Math.round(radius) })}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Setas movem 0,5% (Shift: 5%). Alt ao arrastar = passos de 0,1%. Delete apaga. Ctrl+D
            duplica.
          </p>
        </TabsContent>

        <TabsContent value="estilo" className="space-y-3 pt-2">
          <Field label="Fundo">
            <Colour value={st.bg} onChange={(bg) => setS({ bg })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Borda (px)">
              <Num
                value={st.border_width ?? 0}
                min={0}
                max={40}
                step={1}
                onChange={(n) => setS({ border_width: Math.round(n) })}
              />
            </Field>
            <Field label="Margem interior (px)">
              <Num
                value={st.padding ?? 0}
                min={0}
                max={200}
                step={1}
                onChange={(n) => setS({ padding: Math.round(n) })}
              />
            </Field>
          </div>
          {st.border_width ? (
            <Field label="Cor da borda">
              <Colour value={st.border_color} onChange={(border_color) => setS({ border_color })} />
            </Field>
          ) : null}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sombra</Label>
            <Switch checked={!!st.shadow} onCheckedChange={(shadow) => setS({ shadow })} />
          </div>
          <Field label={`Opacidade (${Math.round((st.opacity ?? 1) * 100)}%)`}>
            <Slider
              value={[Math.round((st.opacity ?? 1) * 100)]}
              min={10}
              max={100}
              step={5}
              onValueChange={(v) => setS({ opacity: (v[0] ?? 100) / 100 })}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            As medidas em px são de um ecrã Full HD e escalam com o ecrã.
          </p>
        </TabsContent>

        <TabsContent value="conteudo" className="space-y-3 pt-2">
          {zone.kind === "main" ? (
            <>
              <Field
                label="Fonte de vídeo"
                hint={sources.length ? undefined : "Crie primeiro uma fonte em Fontes de vídeo."}
              >
                <Select
                  value={zone.source_id ?? NONE}
                  onValueChange={(v) => onChange({ source_id: v === NONE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Etiqueta "em direto"</Label>
                <Switch
                  checked={!!c.show_live_badge}
                  onCheckedChange={(v) => setC({ show_live_badge: v })}
                />
              </div>
              {c.show_live_badge ? (
                <Field label="Texto da etiqueta">
                  <Input
                    value={c.live_label ?? ""}
                    onChange={(e) => setC({ live_label: e.target.value })}
                  />
                </Field>
              ) : null}
            </>
          ) : null}

          {zone.kind === "playlist" ? (
            <>
              <Field
                label="Playlist"
                hint={playlists.length ? undefined : "Crie primeiro uma playlist."}
              >
                <Select
                  value={zone.playlist_id ?? NONE}
                  onValueChange={(v) => onChange({ playlist_id: v === NONE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                    {playlists.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Transição">
                <Select
                  value={c.transition_override ?? NONE}
                  onValueChange={(v) =>
                    setC({
                      transition_override:
                        v === NONE ? null : (v as "none" | "fade" | "slide" | "zoom"),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>A da playlist</SelectItem>
                    <SelectItem value="none">Sem transição</SelectItem>
                    <SelectItem value="fade">Desvanecer</SelectItem>
                    <SelectItem value="slide">Deslizar</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Barra de progresso</Label>
                <Switch
                  checked={!!c.show_progress}
                  onCheckedChange={(v) => setC({ show_progress: v })}
                />
              </div>
            </>
          ) : null}

          {zone.kind === "ticker" ? (
            <>
              <Field label="Mensagens">
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div key={i} className="flex gap-1">
                      <Input
                        value={m}
                        onChange={(e) =>
                          setMsg(messages.map((x, j) => (j === i ? e.target.value : x)))
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={i === 0}
                        onClick={() => {
                          const l = [...messages];
                          [l[i - 1], l[i]] = [l[i] as string, l[i - 1] as string];
                          setMsg(l);
                        }}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={i === messages.length - 1}
                        onClick={() => {
                          const l = [...messages];
                          [l[i + 1], l[i]] = [l[i] as string, l[i + 1] as string];
                          setMsg(l);
                        }}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setMsg(messages.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMsg([...messages, ""])}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Mensagem
                  </Button>
                </div>
              </Field>
              <Field label={`Velocidade (${c.speed ?? 80} px/s)`}>
                <Slider
                  value={[c.speed ?? 80]}
                  min={20}
                  max={200}
                  step={5}
                  onValueChange={(v) => setC({ speed: v[0] ?? 80 })}
                />
              </Field>
              <Field label={`Tamanho do texto (${c.font_size ?? 50}% da altura)`}>
                <Slider
                  value={[c.font_size ?? 50]}
                  min={20}
                  max={90}
                  step={5}
                  onValueChange={(v) => setC({ font_size: v[0] ?? 50 })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fundo">
                  <Colour value={c.bg} onChange={(bg) => setC({ bg })} />
                </Field>
                <Field label="Texto">
                  <Colour
                    value={c.text_color}
                    onChange={(text_color) => setC({ text_color })}
                    fallback="#ffffff"
                  />
                </Field>
              </div>
              <Field label="Separador">
                <Pick
                  value={c.separator ?? "square"}
                  onChange={(separator) => setC({ separator })}
                  options={[
                    { value: "square", label: "Quadrado" },
                    { value: "dot", label: "Ponto" },
                    { value: "bar", label: "Barra" },
                    { value: "none", label: "Nenhum" },
                  ]}
                />
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tudo em maiúsculas</Label>
                <Switch checked={!!c.uppercase} onCheckedChange={(v) => setC({ uppercase: v })} />
              </div>
            </>
          ) : null}

          {zone.kind === "clock" ? (
            <>
              <Field label="Formato">
                <Pick
                  value={c.format ?? "HH:mm"}
                  onChange={(format) => setC({ format })}
                  options={[
                    { value: "HH:mm", label: "14:35" },
                    { value: "HH:mm:ss", label: "14:35:08" },
                  ]}
                />
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar data</Label>
                <Switch checked={!!c.show_date} onCheckedChange={(v) => setC({ show_date: v })} />
              </div>
              {c.show_date ? (
                <Field label="Data">
                  <Pick
                    value={c.date_format ?? "long"}
                    onChange={(date_format) => setC({ date_format })}
                    options={[
                      { value: "long", label: "segunda-feira, 28 de setembro" },
                      { value: "short", label: "28/09/2026" },
                    ]}
                  />
                </Field>
              ) : null}
              <Field label="Alinhamento">
                <Pick
                  value={c.align ?? "center"}
                  onChange={(align) => setC({ align })}
                  options={ALIGN}
                />
              </Field>
              <Field label="Cor do texto">
                <Colour
                  value={c.text_color}
                  onChange={(text_color) => setC({ text_color })}
                  fallback="#ffffff"
                />
              </Field>
            </>
          ) : null}

          {zone.kind === "logo" ? (
            <>
              <Field label="Imagem" hint="Vazio = logótipo da organização (Aparência).">
                <div className="flex gap-2">
                  <Input
                    value={c.image_url ?? ""}
                    onChange={(e) => setC({ image_url: e.target.value })}
                  />
                  <MediaPicker kind="image" onPick={(m) => setC({ image_url: m.url })}>
                    <Button type="button" variant="outline">
                      Biblioteca
                    </Button>
                  </MediaPicker>
                </div>
              </Field>
              <Field label="Ajuste">
                <Pick
                  value={c.fit ?? "contain"}
                  onChange={(fit) => setC({ fit })}
                  options={[
                    { value: "contain", label: "Caber inteiro" },
                    { value: "cover", label: "Preencher" },
                  ]}
                />
              </Field>
              <Field label="Alinhamento">
                <Pick
                  value={c.align ?? "center"}
                  onChange={(align) => setC({ align })}
                  options={ALIGN}
                />
              </Field>
            </>
          ) : null}

          {zone.kind === "text" ? (
            <>
              <Field label="Título">
                <Input value={c.title ?? ""} onChange={(e) => setC({ title: e.target.value })} />
              </Field>
              <Field label="Texto">
                <Textarea
                  rows={4}
                  value={c.body ?? ""}
                  onChange={(e) => setC({ body: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tamanho">
                  <Pick
                    value={c.size ?? "m"}
                    onChange={(size) => setC({ size })}
                    options={[
                      { value: "s", label: "Pequeno" },
                      { value: "m", label: "Médio" },
                      { value: "l", label: "Grande" },
                      { value: "xl", label: "Enorme" },
                    ]}
                  />
                </Field>
                <Field label="Alinhamento">
                  <Pick
                    value={c.align ?? "center"}
                    onChange={(align) => setC({ align })}
                    options={ALIGN}
                  />
                </Field>
              </div>
              <Field label="Cor do texto">
                <Colour
                  value={c.text_color}
                  onChange={(text_color) => setC({ text_color })}
                  fallback="#ffffff"
                />
              </Field>
            </>
          ) : null}

          {zone.kind === "qr" ? (
            <>
              <Field label="Ligação">
                <Input value={c.url ?? ""} onChange={(e) => setC({ url: e.target.value })} />
              </Field>
              <Field label="Legenda">
                <Input
                  value={c.caption ?? ""}
                  onChange={(e) => setC({ caption: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fundo">
                  <Colour value={c.bg} onChange={(bg) => setC({ bg })} fallback="#ffffff" />
                </Field>
                <Field label="Texto">
                  <Colour value={c.fg} onChange={(fg) => setC({ fg })} />
                </Field>
              </div>
            </>
          ) : null}

          {zone.kind === "webpage" ? (
            <>
              <Field
                label="Endereço"
                hint="Alguns sites não deixam ser mostrados dentro de outras páginas."
              >
                <Input value={c.url ?? ""} onChange={(e) => setC({ url: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Zoom">
                  <Num
                    value={c.zoom ?? 1}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={(zoom) => setC({ zoom })}
                  />
                </Field>
                <Field label="Recarregar (s)" hint="0 = nunca">
                  <Num
                    value={c.refresh_s ?? 0}
                    min={0}
                    max={86400}
                    step={10}
                    onChange={(n) => setC({ refresh_s: Math.round(n) })}
                  />
                </Field>
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </fieldset>
  );
}
