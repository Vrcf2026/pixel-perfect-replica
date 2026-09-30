import { useState } from "react";
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
import { FONTS } from "@/player/lib/theme";
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

type Quick = {
  id: string;
  label: string;
  style: ZoneStyle;
  text: string;
  swatch: React.CSSProperties;
};

/** Estilos rápidos: mudam o fundo e, onde existe, a cor do texto da zona. */
const QUICK_STYLES: Quick[] = [
  {
    id: "none",
    label: "Sem fundo",
    style: { bg_mode: "none", text_shadow: true, shadow: false, border_width: 0 },
    text: "#FFFFFF",
    swatch: { background: "repeating-conic-gradient(#cbd5e1 0 25%, #94a3b8 0 50%) 0 0/10px 10px" },
  },
  {
    id: "dark",
    label: "Escuro",
    style: { bg_mode: "solid", bg: "#0F1E36", text_shadow: false, border_width: 0 },
    text: "#FFFFFF",
    swatch: { background: "#0F1E36" },
  },
  {
    id: "light",
    label: "Claro",
    style: { bg_mode: "solid", bg: "#F3F5F8", text_shadow: false, border_width: 0 },
    text: "#0F1E36",
    swatch: { background: "#F3F5F8", border: "1px solid #e2e8f0" },
  },
  {
    id: "glass",
    label: "Vidro",
    style: {
      bg_mode: "glass",
      bg: "#0F1E36",
      glass_alpha: 0.4,
      blur: 16,
      text_shadow: false,
      border_width: 1,
      border_color: "#FFFFFF40",
    },
    text: "#FFFFFF",
    swatch: {
      background: "linear-gradient(135deg, rgba(15,30,54,.55), rgba(15,30,54,.3)), #64748b",
    },
  },
  {
    id: "orange",
    label: "Laranja",
    style: {
      bg_mode: "gradient",
      bg: "#F28C28",
      bg2: "#E0561B",
      bg_angle: 135,
      text_shadow: false,
      border_width: 0,
    },
    text: "#FFFFFF",
    swatch: { background: "linear-gradient(135deg, #F28C28, #E0561B)" },
  },
  {
    id: "night",
    label: "Noite",
    style: {
      bg_mode: "gradient",
      bg: "#0F1E36",
      bg2: "#2563EB",
      bg_angle: 135,
      text_shadow: false,
      border_width: 0,
    },
    text: "#FFFFFF",
    swatch: { background: "linear-gradient(135deg, #0F1E36, #2563EB)" },
  },
];

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

  const applyQuick = (q: Quick) => {
    const cfg: ZoneConfig = { ...c };
    if (["clock", "text", "weather", "rss", "ticker"].includes(zone.kind)) cfg.text_color = q.text;
    if (zone.kind === "ticker" || zone.kind === "rss") cfg.bg = "";
    onChange({ style: { ...st, ...q.style }, config: cfg });
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
          <Field label="Estilos rápidos">
            <div className="grid grid-cols-3 gap-1.5">
              {QUICK_STYLES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => applyQuick(q)}
                  className="flex flex-col items-center gap-1 rounded-md border p-1.5 text-[11px] hover:border-[#F28C28]"
                >
                  <span
                    className="flex h-7 w-full items-center justify-center rounded text-[11px] font-bold"
                    style={{
                      ...q.swatch,
                      color: q.text,
                      textShadow: q.style.text_shadow ? "0 1px 3px rgba(0,0,0,.8)" : undefined,
                    }}
                  >
                    12:30
                  </span>
                  {q.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Fundo">
            <Pick
              value={st.bg_mode ?? (st.bg ? "solid" : "none")}
              onChange={(bg_mode) => setS({ bg_mode })}
              options={[
                { value: "none", label: "Sem fundo (transparente)" },
                { value: "solid", label: "Cor" },
                { value: "gradient", label: "Degradé" },
                { value: "glass", label: "Vidro fosco" },
              ]}
            />
          </Field>
          {(st.bg_mode ?? (st.bg ? "solid" : "none")) !== "none" ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label={st.bg_mode === "gradient" ? "Cor 1" : "Cor"}>
                <Colour value={st.bg} onChange={(bg) => setS({ bg })} />
              </Field>
              {st.bg_mode === "gradient" ? (
                <Field label="Cor 2">
                  <Colour value={st.bg2} onChange={(bg2) => setS({ bg2 })} fallback="#2563eb" />
                </Field>
              ) : null}
              {st.bg_mode === "glass" ? (
                <Field
                  label={`Transparência (${Math.round((1 - (st.glass_alpha ?? 0.45)) * 100)}%)`}
                >
                  <Slider
                    value={[Math.round((st.glass_alpha ?? 0.45) * 100)]}
                    min={10}
                    max={90}
                    step={5}
                    onValueChange={(v) => setS({ glass_alpha: (v[0] ?? 45) / 100 })}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          {st.bg_mode === "gradient" ? (
            <Field label={`Direção (${st.bg_angle ?? 135}°)`}>
              <Slider
                value={[st.bg_angle ?? 135]}
                min={0}
                max={360}
                step={15}
                onValueChange={(v) => setS({ bg_angle: v[0] ?? 135 })}
              />
            </Field>
          ) : null}
          {st.bg_mode === "glass" ? (
            <Field label={`Desfoque (${st.blur ?? 16}px)`}>
              <Slider
                value={[st.blur ?? 16]}
                min={0}
                max={40}
                step={2}
                onValueChange={(v) => setS({ blur: v[0] ?? 16 })}
              />
            </Field>
          ) : null}

          <Field label="Tipo de letra">
            <Select
              value={st.font || NONE}
              onValueChange={(v) => setS({ font: v === NONE ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>O do tema (Aparência)</SelectItem>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: `"${f}", sans-serif` }}>{f}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sombra no texto (ler sobre vídeo)</Label>
            <Switch
              checked={!!st.text_shadow}
              onCheckedChange={(text_shadow) => setS({ text_shadow })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sombra na caixa</Label>
            <Switch checked={!!st.shadow} onCheckedChange={(shadow) => setS({ shadow })} />
          </div>

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
            As medidas em px são de um ecrã Full HD e escalam com o ecrã. Ligue "Ver conteúdo" para
            ver o resultado sobre o vídeo.
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

          {zone.kind === "weather" ? <WeatherFields c={c} setC={setC} /> : null}

          {zone.kind === "rss" ? (
            <>
              <Field
                label="Endereço do feed RSS"
                hint="Ex.: https://observador.pt/feed/ — a maioria dos jornais tem um."
              >
                <Input
                  value={c.url ?? ""}
                  placeholder="https://…"
                  onChange={(e) => setC({ url: e.target.value })}
                />
              </Field>
              <Field label="Nome da fonte (opcional)" hint="Vazio = usa o nome do feed.">
                <Input
                  value={c.source_label ?? ""}
                  onChange={(e) => setC({ source_label: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Apresentação">
                  <Pick
                    value={c.mode ?? "headline"}
                    onChange={(mode) => setC({ mode })}
                    options={[
                      { value: "headline", label: "Uma manchete de cada vez" },
                      { value: "ticker", label: "Rodapé a correr" },
                    ]}
                  />
                </Field>
                <Field label="Nº de notícias">
                  <Num
                    value={c.max_items ?? 10}
                    min={1}
                    max={30}
                    step={1}
                    onChange={(n) => setC({ max_items: Math.round(n) })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Texto">
                  <Colour
                    value={c.text_color}
                    onChange={(text_color) => setC({ text_color })}
                    fallback="#ffffff"
                  />
                </Field>
                <Field label="Fundo">
                  <Colour value={c.bg} onChange={(bg) => setC({ bg })} />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                As notícias atualizam a cada 10 minutos. Grave o layout antes de pré-visualizar um
                feed novo.
              </p>
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

type GeoHit = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

function WeatherFields({ c, setC }: { c: ZoneConfig; setC: (p: ZoneConfig) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=pt`,
      );
      const j = (await r.json()) as { results?: GeoHit[] };
      setHits(j.results ?? []);
    } catch {
      setHits([]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Field
        label="Localidade"
        hint={c.city ? `Atual: ${c.city} (${c.lat?.toFixed(2)}, ${c.lon?.toFixed(2)})` : undefined}
      >
        <div className="flex gap-2">
          <Input
            value={q}
            placeholder={c.city || "Ex.: Montijo"}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => void search()} disabled={busy}>
            Procurar
          </Button>
        </div>
        {hits.length ? (
          <div className="mt-1 divide-y rounded-md border">
            {hits.map((h) => (
              <button
                key={`${h.latitude},${h.longitude}`}
                type="button"
                className="block w-full px-2 py-1.5 text-left text-xs hover:bg-muted"
                onClick={() => {
                  setC({ city: h.name, lat: h.latitude, lon: h.longitude });
                  setHits([]);
                  setQ("");
                }}
              >
                {h.name}
                <span className="text-muted-foreground">
                  {[h.admin1, h.country].filter(Boolean).join(", ")
                    ? ` · ${[h.admin1, h.country].filter(Boolean).join(", ")}`
                    : ""}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Previsão">
          <Pick
            value={String(c.forecast_days ?? 3) as "0" | "1" | "2" | "3"}
            onChange={(v) => setC({ forecast_days: Number(v) })}
            options={[
              { value: "0", label: "Só agora" },
              { value: "1", label: "+1 dia" },
              { value: "2", label: "+2 dias" },
              { value: "3", label: "+3 dias" },
            ]}
          />
        </Field>
        <Field label="Cor do texto">
          <Colour
            value={c.text_color}
            onChange={(text_color) => setC({ text_color })}
            fallback="#ffffff"
          />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Dados de Open-Meteo, atualizados a cada 30 minutos.
      </p>
    </>
  );
}
