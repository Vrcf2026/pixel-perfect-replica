import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { generateAds } from "@/lib/ai.functions";
import { MediaPicker } from "@/features/media/MediaPicker";
import { Slide, SlideFrame } from "@/player/slides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ItemKind } from "./contract";

type Variant = {
  kind: "product" | "service" | "text";
  angle: string;
  data: Record<string, unknown>;
};

const EXAMPLES = [
  "Promoção de kit de 4 câmaras 4MP a 299 €, antes 349 €, até sexta",
  "Reparação de portáteis e computadores com orçamento grátis",
  "Estamos a contratar técnico de redes a tempo inteiro",
  "Fechados dia 5 de outubro, feriado",
];

export function AdAssistant({
  open,
  onClose,
  orgId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onAdd: (kind: ItemKind, data: Record<string, unknown>) => void | Promise<void>;
}) {
  const run = useServerFn(generateAds);
  const bizKey = `montra:biz:${orgId}`;
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"auto" | "product" | "service" | "text">("auto");
  const [tone, setTone] = useState<"profissional" | "proximo" | "urgente" | "divertido">(
    "profissional",
  );
  const [business, setBusiness] = useState("");
  const [photo, setPhoto] = useState("");
  const [withImage, setWithImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    try {
      setBusiness(localStorage.getItem(bizKey) ?? "");
    } catch {
      /* ignore */
    }
  }, [bizKey]);

  const generate = async () => {
    if (prompt.trim().length < 3) {
      toast.error("Descreva o que quer anunciar.");
      return;
    }
    try {
      localStorage.setItem(bizKey, business);
    } catch {
      /* ignore */
    }
    setBusy(true);
    try {
      const out = await run({
        data: {
          org_id: orgId,
          prompt,
          kind,
          tone,
          business,
          product_image_url: photo,
          with_image: withImage,
        },
      });
      const res = JSON.parse(out.json) as {
        variants: Variant[];
        image_url: string | null;
        image_error: string | null;
      };
      setVariants(res.variants);
      if (res.image_error) toast.warning(res.image_error);
      else if (res.image_url) toast.success("Imagem de fundo criada e guardada na Biblioteca.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar as propostas.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#F28C28]" /> Assistente de publicidade
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>O que quer anunciar?</Label>
              <Textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex.: promoção de câmaras 4MP a 79 € até sexta"
              />
              <div className="flex flex-wrap gap-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-[#F28C28] hover:text-foreground"
                  >
                    {ex.length > 38 ? `${ex.slice(0, 38)}…` : ex}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sobre o negócio</Label>
              <Input
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Ex.: loja de informática e segurança em Montijo"
              />
              <p className="text-[11px] text-muted-foreground">Fica guardado para a próxima vez.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">A IA escolhe</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="text">Aviso / texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tom</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="proximo">Próximo</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="divertido">Descontraído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto real do produto (opcional)</Label>
              {photo ? (
                <div className="flex items-center gap-2">
                  <img
                    src={photo}
                    alt=""
                    className="h-14 w-20 rounded border bg-white object-contain"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setPhoto("")}>
                    <X className="mr-1 h-3.5 w-3.5" /> Tirar
                  </Button>
                </div>
              ) : (
                <MediaPicker kind="image" onPick={(m) => setPhoto(m.url)}>
                  <Button type="button" variant="outline" size="sm">
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Escolher da biblioteca
                  </Button>
                </MediaPicker>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5">
              <Switch id="img" checked={withImage} onCheckedChange={setWithImage} />
              <Label htmlFor="img" className="text-xs leading-snug font-normal">
                <span className="font-medium">Gerar imagem de fundo com IA</span>
                <br />
                Só ambientes e fundos. Os produtos usam sempre a foto real. Demora mais uns
                segundos.
              </Label>
            </div>
            <Button className="w-full" onClick={generate} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : variants.length ? (
                <RefreshCw className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {busy ? "A criar propostas…" : variants.length ? "Gerar outras" : "Gerar 3 propostas"}
            </Button>
          </div>

          <div className="min-w-0">
            {variants.length === 0 ? (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {busy
                  ? "A preparar as propostas…"
                  : "As propostas aparecem aqui. Escolha uma, acrescente à playlist e ajuste o que quiser no editor."}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {variants.map((v, i) => (
                  <div key={i} className="space-y-2 rounded-lg border bg-card p-2">
                    <SlideFrame>
                      <Slide kind={v.kind} data={v.data} />
                    </SlideFrame>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">{v.angle}</div>
                      <Button size="sm" onClick={() => void onAdd(v.kind, v.data)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Usar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Reveja sempre preços e datas antes de publicar: a IA só usa os que indicar, mas a
              responsabilidade do anúncio é sua.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
