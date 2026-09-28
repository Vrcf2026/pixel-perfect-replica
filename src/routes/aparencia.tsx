import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOrg } from "@/features/org/OrgContext";
import { AppShell } from "@/components/AppShell";
import { MediaPicker } from "@/features/media/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slide } from "@/player/slides";
import { DEFAULT_THEME, FONTS, ensureFonts, mergeTheme, themeVars } from "@/player/lib/theme";
import type { Theme } from "@/player/lib/types";

export const Route = createFileRoute("/aparencia")({
  head: () => ({
    meta: [
      { title: "Aparência — VRCF Montra" },
      { name: "description", content: "Cores e estilo dos seus ecrãs." },
      { property: "og:title", content: "Aparência — VRCF Montra" },
      { property: "og:description", content: "Cores e estilo dos seus ecrãs." },
    ],
  }),
  component: AparenciaPage,
});

const COLORS: Array<[keyof Theme, string]> = [
  ["primary", "Principal (fundos dos slides)"],
  ["accent", "Destaque (preços, botões)"],
  ["text", "Texto sobre a cor principal"],
  ["background", "Fundo do ecrã"],
  ["surface", "Superfície clara"],
  ["text_on_surface", "Texto sobre a superfície"],
  ["muted", "Texto secundário"],
];

function AparenciaPage() {
  const { org, canEdit } = useOrg();
  const [theme, setTheme] = useState<Required<Theme>>(DEFAULT_THEME);
  const [logo, setLogo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    void supabase
      .from("organizations")
      .select("theme,logo_url")
      .eq("id", org.org_id)
      .maybeSingle()
      .then(({ data }) => {
        setTheme(mergeTheme((data?.theme ?? {}) as Theme));
        setLogo(data?.logo_url ?? "");
        setLoading(false);
      });
  }, [org]);

  useEffect(() => ensureFonts(theme), [theme]);
  const vars = useMemo(() => themeVars(theme), [theme]);
  const set = (p: Partial<Theme>) => setTheme((t) => ({ ...t, ...p }));

  const save = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ theme: theme as unknown as Json, logo_url: logo || null })
      .eq("id", org.org_id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Aparência guardada. Os ecrãs atualizam em cerca de 20 segundos.");
  };

  if (loading)
    return (
      <AppShell title="Aparência">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </AppShell>
    );

  return (
    <AppShell
      title="Aparência"
      actions={
        canEdit ? (
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <fieldset disabled={!canEdit} className="space-y-5">
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <div className="text-sm font-semibold">Logótipo</div>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-28 items-center justify-center rounded border bg-muted">
                {logo ? (
                  <img src={logo} alt="" className="max-h-14 max-w-24 object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem logótipo</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <MediaPicker kind="image" onPick={(m) => setLogo(m.url)}>
                  <Button type="button" variant="outline" size="sm">
                    Escolher da biblioteca
                  </Button>
                </MediaPicker>
                {logo ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")}>
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Aparece nas zonas de logótipo e quando uma playlist fica vazia.
            </p>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Cores</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  set({
                    primary: DEFAULT_THEME.primary,
                    accent: DEFAULT_THEME.accent,
                    text: DEFAULT_THEME.text,
                    background: DEFAULT_THEME.background,
                    surface: DEFAULT_THEME.surface,
                    text_on_surface: DEFAULT_THEME.text_on_surface,
                    muted: DEFAULT_THEME.muted,
                  })
                }
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Repor
              </Button>
            </div>
            {COLORS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(theme[key])}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className="h-9 w-11 shrink-0 rounded border"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {String(theme[key])}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <div className="text-sm font-semibold">Letra e formato</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Títulos</Label>
                <Select
                  value={theme.font_display}
                  onValueChange={(font_display) => set({ font_display })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Texto</Label>
                <Select value={theme.font_body} onValueChange={(font_body) => set({ font_body })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cantos (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={theme.radius}
                  onChange={(e) =>
                    set({ radius: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moeda</Label>
                <Select value={theme.currency} onValueChange={(currency) => set({ currency })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP", "BRL", "CHF"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Texto por baixo do preço</Label>
              <Input
                value={theme.price_suffix}
                placeholder="IVA incluído"
                onChange={(e) => set({ price_suffix: e.target.value })}
              />
            </div>
          </section>
        </fieldset>

        <div className="space-y-3">
          <div className="text-sm font-semibold">Pré-visualização</div>
          {[
            {
              kind: "product",
              data: {
                name: "Kit videovigilância 4 câmaras 4MP",
                price: 349,
                old_price: 399,
                price_suffix: theme.price_suffix,
                category: "Videovigilância",
                badge: "Promoção",
                template: "photo_left",
              },
            },
            {
              kind: "service",
              data: {
                title: "Alarmes e controlo de acessos",
                subtitle: "Instalação certificada com registo na PSP",
                bullets: ["Visita e orçamento grátis", "Manutenção anual"],
                icon: "shield-check",
                template: "big_title",
              },
            },
          ].map((s) => (
            <div
              key={s.kind}
              className="aspect-video overflow-hidden rounded-lg border shadow-sm"
              style={{ ...vars, containerType: "size" }}
            >
              <Slide kind={s.kind} data={s.data} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
