import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { analyzeSites, importImage } from "@/lib/onboarding.functions";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slide, SlideFrame } from "@/player/slides";
import { mergeTheme, themeVars } from "@/player/lib/theme";
import { LayoutThumb } from "@/features/layouts/LayoutThumb";
import { TEMPLATES, defaultZoneConfig, defaultZoneStyle } from "@/features/layouts/templates";

export const Route = createFileRoute("/arranque")({
  head: () => ({
    meta: [
      { title: "Arranque rápido — VRCF Montra" },
      { name: "description", content: "Monte a montra a partir do site, em minutos." },
      { property: "og:title", content: "Arranque rápido — VRCF Montra" },
      { property: "og:description", content: "Monte a montra a partir do site, em minutos." },
    ],
  }),
  component: ArranquePage,
});

type Item = {
  id: string;
  kind: string;
  label: string;
  data: Record<string, unknown>;
  duration_s?: number;
};
type DraftResult = {
  business_name: string;
  tagline: string;
  contacts: { phone: string; email: string; address: string };
  hours: string[];
  colors: { primary: string; accent: string };
  logo_url: string | null;
  logo_candidates: string[];
  ticker: string[];
  items: Item[];
  site_url: string | null;
  warnings: string[];
};

const LAYOUT_CHOICES = ["tv_corner", "ads_only", "tv_products", "l_shape"];
const NONE = "__none__";
const STEPS = [
  "A ler o site…",
  "À procura do logótipo e contactos…",
  "A escolher produtos…",
  "A escrever os textos…",
  "Quase pronto…",
];

function ArranquePage() {
  const { org, canEdit } = useOrg();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeSites);
  const importImg = useServerFn(importImage);

  const [urls, setUrls] = useState("");
  const [withCatalog, setWithCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftResult | null>(null);

  // revisão
  const [logo, setLogo] = useState<string | null>(null);
  const [applyTheme, setApplyTheme] = useState(true);
  const [primary, setPrimary] = useState("#0F1E36");
  const [accent, setAccent] = useState("#F28C28");
  const [ticker, setTicker] = useState<Array<{ text: string; on: boolean }>>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState("tv_corner");
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const [screens, setScreens] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceId, setSourceId] = useState(NONE);
  const [screenId, setScreenId] = useState(NONE);
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!org) return;
    setWithCatalog(/vrcf/i.test(org.name));
    void Promise.all([
      supabase.from("sources").select("id,name").eq("org_id", org.org_id).order("name"),
      supabase.from("screens").select("id,name").eq("org_id", org.org_id).order("name"),
    ]).then(([s, sc]) => {
      setSources((s.data ?? []) as Array<{ id: string; name: string }>);
      setScreens((sc.data ?? []) as Array<{ id: string; name: string }>);
    });
  }, [org]);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((n) => Math.min(STEPS.length - 1, n + 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  const run = async () => {
    if (!org) return;
    const list = urls
      .split(/[\s,;]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (!list.length && !withCatalog) {
      toast.error("Indique pelo menos um site.");
      return;
    }
    setBusy(true);
    try {
      const out = await analyze({
        data: { org_id: org.org_id, urls: list, include_catalog: withCatalog, catalog_limit: 6 },
      });
      const d = JSON.parse(out.json) as DraftResult;
      setDraft(d);
      setLogo(d.logo_url);
      if (d.colors.primary) setPrimary(d.colors.primary);
      if (d.colors.accent) setAccent(d.colors.accent);
      setTicker(d.ticker.map((text) => ({ text, on: true })));
      setPicked(new Set(d.items.map((i) => i.id)));
      setPlaylistName(`Montra — ${d.business_name || org.name}`);
      for (const w of d.warnings) toast.warning(w);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível analisar.");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!org || !draft) return;
    setCreating(true);
    try {
      // 1. Identidade
      if (applyTheme) {
        let logoUrl = logo;
        if (logoUrl && !logoUrl.includes("/storage/v1/object/public/media/")) {
          logoUrl = (
            await importImg({
              data: { org_id: org.org_id, url: logoUrl, name: `Logótipo — ${draft.business_name}` },
            })
          ).url;
        }
        const { data: o } = await supabase
          .from("organizations")
          .select("theme")
          .eq("id", org.org_id)
          .maybeSingle();
        const theme = {
          ...mergeTheme((o?.theme ?? {}) as never),
          primary,
          accent,
          background: primary,
        };
        const { error } = await supabase
          .from("organizations")
          .update({ theme: theme as unknown as Json, ...(logoUrl ? { logo_url: logoUrl } : {}) })
          .eq("id", org.org_id);
        if (error) throw error;
      }
      // 2. Playlist
      const chosen = draft.items.filter((i) => picked.has(i.id));
      const { data: pl, error: plErr } = await supabase
        .from("playlists")
        .insert({
          org_id: org.org_id,
          name: playlistName || "Montra",
          default_duration_s: 9,
          transition: "fade",
        })
        .select("id")
        .single();
      if (plErr) throw plErr;
      if (chosen.length) {
        const { error } = await supabase.from("playlist_items").insert(
          chosen.map((it, i) => ({
            org_id: org.org_id,
            playlist_id: pl.id as string,
            kind: it.kind as never,
            data: it.data as unknown as Json,
            position: i,
            ...(it.duration_s ? { duration_s: it.duration_s } : {}),
          })),
        );
        if (error) throw error;
      }
      // 3. Layout
      const tpl = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0]!;
      const { data: lay, error: lErr } = await supabase
        .from("layouts")
        .insert({
          org_id: org.org_id,
          name: `${draft.business_name || "Montra"} — ${tpl.name}`,
          template: tpl.id,
          orientation: tpl.orientation,
          background: primary,
        })
        .select("id")
        .single();
      if (lErr) throw lErr;
      const messages = ticker.filter((t) => t.on && t.text.trim()).map((t) => t.text.trim());
      const { error: zErr } = await supabase.from("layout_zones").insert(
        tpl.zones.map((z, i) => {
          const config = defaultZoneConfig(z.kind) as Record<string, unknown>;
          if (z.kind === "ticker") {
            config["messages"] = messages.length ? messages : [draft.business_name];
            config["bg"] = accent;
            config["text_color"] = "#FFFFFF";
          }
          return {
            org_id: org.org_id,
            layout_id: lay.id as string,
            name: z.name,
            kind: z.kind,
            x: z.x,
            y: z.y,
            w: z.w,
            h: z.h,
            z: z.z ?? 1,
            position: i,
            radius: z.radius ?? 0,
            style: defaultZoneStyle(z.kind) as unknown as Json,
            config: config as unknown as Json,
            source_id: z.kind === "main" && sourceId !== NONE ? sourceId : null,
            playlist_id: z.kind === "playlist" ? (pl.id as string) : null,
          };
        }) as never,
      );
      if (zErr) throw zErr;
      // 4. Ecrã
      if (screenId !== NONE) {
        const { error } = await supabase
          .from("screens")
          .update({ default_layout_id: lay.id as string })
          .eq("id", screenId);
        if (error) throw error;
      }
      toast.success("Montra criada! Pode ajustar tudo no editor.");
      void navigate({ to: "/layouts/$id", params: { id: lay.id as string } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setCreating(false);
    }
  };

  const vars = themeVars(mergeTheme({ primary, accent, background: primary }));

  return (
    <AppShell title="Arranque rápido">
      {!draft ? (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Wand2 className="h-5 w-5 text-[#F28C28]" /> Monte a montra a partir do site
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Indique o site do negócio. A app vai buscar o logótipo, as cores, os contactos e os
              serviços, e prepara um rascunho com playlist, rodapé e layout. Revê tudo antes de
              criar.
            </p>
            <fieldset disabled={!canEdit || busy} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Site(s), até 3</Label>
                <Textarea
                  rows={3}
                  value={urls}
                  placeholder={"www.vrcf.pt"}
                  onChange={(e) => setUrls(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
                <Switch id="cat" checked={withCatalog} onCheckedChange={setWithCatalog} />
                <Label htmlFor="cat" className="text-sm leading-snug font-normal">
                  <span className="font-medium">Incluir produtos em destaque do catálogo VRCF</span>
                  <br />
                  Os produtos marcados como destaque entram com foto, preço e pontos fortes. Só faz
                  sentido para a VRCF ou para quem vende os mesmos produtos.
                </Label>
              </div>
              <Button onClick={run} disabled={busy} className="w-full sm:w-auto">
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {busy ? STEPS[step] : "Analisar e preparar rascunho"}
              </Button>
              {busy ? (
                <p className="text-xs text-muted-foreground">Demora cerca de 30 a 60 segundos.</p>
              ) : null}
            </fieldset>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{draft.business_name}</div>
              <div className="text-sm text-muted-foreground">
                {[draft.tagline, draft.contacts.phone, draft.contacts.email, draft.contacts.address]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Recomeçar
              </Button>
              <Button
                onClick={create}
                disabled={creating || !canEdit}
                className="bg-[#F28C28] text-[#0F1E36] hover:bg-[#F28C28]/90"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Criar tudo
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Identidade */}
            <section className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Identidade</div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="th" className="text-xs">
                    Aplicar
                  </Label>
                  <Switch id="th" checked={applyTheme} onCheckedChange={setApplyTheme} />
                </div>
              </div>
              <div className="flex h-24 items-center justify-center rounded-md border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                {logo ? (
                  <img src={logo} alt="" className="max-h-20 max-w-[80%] object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem logótipo</span>
                )}
              </div>
              {draft.logo_candidates.length > 1 ? (
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Outros candidatos:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.logo_candidates.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setLogo(c)}
                        className={`flex h-10 w-14 items-center justify-center rounded border bg-white p-1 ${logo === c ? "border-[#F28C28] ring-1 ring-[#F28C28]" : ""}`}
                      >
                        <img src={c} alt="" className="max-h-full max-w-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Cor principal", primary, setPrimary],
                    ["Destaque", accent, setAccent],
                  ] as const
                ).map(([label, value, set]) => (
                  <div key={label} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="h-9 w-11 rounded border"
                    />
                    <div className="text-xs">
                      {label}
                      <div className="text-muted-foreground uppercase">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rodapé */}
            <section className="space-y-2 rounded-lg border bg-card p-4">
              <div className="text-sm font-semibold">Rodapé</div>
              {ticker.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    checked={t.on}
                    onCheckedChange={(v) =>
                      setTicker(ticker.map((x, j) => (j === i ? { ...x, on: v === true } : x)))
                    }
                  />
                  <Input
                    value={t.text}
                    className="h-8 text-xs"
                    onChange={(e) =>
                      setTicker(
                        ticker.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setTicker(ticker.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTicker([...ticker, { text: "", on: true }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Mensagem
              </Button>
            </section>

            {/* Layout */}
            <section className="space-y-3 rounded-lg border bg-card p-4">
              <div className="text-sm font-semibold">Layout e ecrã</div>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUT_CHOICES.map((id) => {
                  const t = TEMPLATES.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTemplate(id)}
                      className={`rounded-md border p-1.5 text-left text-[11px] ${template === id ? "border-[#F28C28] ring-1 ring-[#F28C28]" : ""}`}
                    >
                      <LayoutThumb
                        zones={t.zones}
                        orientation={t.orientation}
                        background={primary}
                      />
                      <div className="mt-1 font-medium">{t.name}</div>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Canal para a zona da TV</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Escolher depois —</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mostrar já num ecrã</Label>
                <Select value={screenId} onValueChange={setScreenId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Não, só criar —</SelectItem>
                    {screens.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da playlist</Label>
                <Input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} />
              </div>
            </section>
          </div>

          {/* Conteúdos */}
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">
                Conteúdos da playlist ({picked.size} de {draft.items.length})
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="underline"
                  onClick={() => setPicked(new Set(draft.items.map((i) => i.id)))}
                >
                  Todos
                </button>
                <button type="button" className="underline" onClick={() => setPicked(new Set())}>
                  Nenhum
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" style={vars}>
              {draft.items.map((it) => {
                const on = picked.has(it.id);
                return (
                  <label
                    key={it.id}
                    className={`cursor-pointer space-y-1.5 rounded-lg border p-2 ${on ? "border-[#F28C28]" : "opacity-60"}`}
                  >
                    <SlideFrame>
                      <Slide kind={it.kind} data={it.data} />
                    </SlideFrame>
                    <div className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={on}
                        onCheckedChange={(v) =>
                          setPicked((cur) => {
                            const n = new Set(cur);
                            if (v === true) n.add(it.id);
                            else n.delete(it.id);
                            return n;
                          })
                        }
                      />
                      <span className="truncate">{it.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Depois de criar, tudo se edita normalmente nas Playlists e no editor de Layouts.
              Reveja preços, horários e contactos antes de pôr no ar.
            </p>
          </section>
        </div>
      )}
    </AppShell>
  );
}
