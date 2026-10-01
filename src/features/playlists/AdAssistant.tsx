import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImageIcon, Loader2, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { generateAds, searchCatalog } from "@/lib/ai.functions";
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

type CatItem = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  image_url: string | null;
  price?: number | null;
};

const EXAMPLES = [
  "AJ-STARTERKIT-CAM-HDR-W a 800 €",
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
  const search = useServerFn(searchCatalog);
  const [product, setProduct] = useState<CatItem | null>(null);
  const [candidates, setCandidates] = useState<CatItem[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [useCatalog, setUseCatalog] = useState(true);
  const [catQuery, setCatQuery] = useState("");
  const [catBusy, setCatBusy] = useState(false);
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

  const generate = async (forceId?: string | null) => {
    if (prompt.trim().length < 3) {
      toast.error("Descreva o que quer anunciar.");
      return;
    }
    try {
      localStorage.setItem(bizKey, business);
    } catch {
      /* ignore */
    }
    const pin = forceId === undefined ? pinnedId : forceId;
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
          use_catalog: useCatalog,
          ...(pin ? { catalog_product_id: pin } : {}),
        },
      });
      const res = JSON.parse(out.json) as {
        variants: Variant[];
        product: CatItem | null;
        candidates: CatItem[];
        warnings: string[];
      };
      setVariants(res.variants);
      setProduct(res.product);
      if (res.candidates.length) setCandidates(res.candidates);
      for (const w of res.warnings) toast.warning(w);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar as propostas.");
    } finally {
      setBusy(false);
    }
  };

  const doSearch = async () => {
    if (catQuery.trim().length < 2) return;
    setCatBusy(true);
    try {
      const r = await search({ data: { query: catQuery } });
      setCandidates(r.products);
      if (!r.products.length) toast.info("Nada encontrado no catálogo com esse texto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na pesquisa.");
    } finally {
      setCatBusy(false);
    }
  };

  const pick = (c: CatItem) => {
    setPinnedId(c.id);
    setPhoto("");
    void generate(c.id);
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
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setPinnedId(null);
                }}
                placeholder="Ex.: AJ-STARTERKIT-CAM-HDR-W a 800 €"
              />
              <div className="flex flex-wrap gap-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setPrompt(ex);
                      setPinnedId(null);
                    }}
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
            <div className="space-y-2 rounded-md border p-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat" className="text-xs font-medium">
                  Procurar o produto no catálogo VRCF
                </Label>
                <Switch id="cat" checked={useCatalog} onCheckedChange={setUseCatalog} />
              </div>
              {useCatalog ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Escreva a referência ou o nome no pedido: o assistente vai buscar a foto, a
                    descrição e as características reais.
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      value={catQuery}
                      placeholder="Pesquisar à mão (ref. ou nome)"
                      className="h-8 text-xs"
                      onChange={(e) => setCatQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void doSearch();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => void doSearch()}
                      disabled={catBusy}
                    >
                      {catBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Foto do produto (opcional)</Label>
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
            <Button className="w-full" onClick={() => void generate()} disabled={busy}>
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

          <div className="min-w-0 space-y-3">
            {product || candidates.length ? (
              <div className="rounded-lg border bg-muted/30 p-2.5">
                {product ? (
                  <div className="mb-2 flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-12 w-16 rounded border bg-white object-contain"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                        <Check className="h-3 w-3" /> Produto identificado no catálogo
                      </div>
                      <div className="truncate text-sm font-medium">{product.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {[product.brand, product.sku].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 text-xs text-amber-700">
                    Não identifiquei o produto. É algum destes?
                  </div>
                )}
                {candidates.filter((c) => c.id !== product?.id).length ? (
                  <>
                    <div className="mb-1 text-[11px] text-muted-foreground">
                      {product ? "Não é este? Escolha:" : ""}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {candidates
                        .filter((c) => c.id !== product?.id)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={busy}
                            onClick={() => pick(c)}
                            className="flex w-36 shrink-0 flex-col gap-1 rounded-md border bg-card p-1.5 text-left hover:border-[#F28C28]"
                          >
                            {c.image_url ? (
                              <img
                                src={c.image_url}
                                alt=""
                                className="h-16 w-full rounded bg-white object-contain"
                              />
                            ) : (
                              <div className="h-16 w-full rounded bg-muted" />
                            )}
                            <span className="line-clamp-2 text-[11px] leading-tight">{c.name}</span>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {c.sku}
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
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
