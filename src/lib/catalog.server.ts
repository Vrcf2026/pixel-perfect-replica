/**
 * Acesso (só leitura) ao catálogo VRCF para o assistente de publicidade.
 * Usa a chave pública do catálogo: só lê colunas abertas ao público (sem preços de compra).
 * Pode ser trocado por secrets CATALOG_SUPABASE_URL / CATALOG_SUPABASE_KEY.
 */
const DEFAULT_URL = "https://mgdhclajlcmepdfrkktw.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZGhjbGFqbGNtZXBkZnJra3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODYxMTAsImV4cCI6MjA4ODY2MjExMH0.Dd0cOoMg13H1otG5OdxWrI2tBE7QlPOx8UbXgNy3um4";

const COLS =
  "id,name,sku,ean,brand,category,short_description,description,destaques,especificacoes,image_url,imagens_extra,store_price_vat";

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  short_description: string | null;
  description: string | null;
  destaques: unknown;
  especificacoes: unknown;
  image_url: string | null;
  imagens_extra: unknown;
  store_price_vat: number | null;
};

function cfg() {
  return {
    url: (process.env["CATALOG_SUPABASE_URL"] || DEFAULT_URL).replace(/\/$/, ""),
    key: process.env["CATALOG_SUPABASE_KEY"] || DEFAULT_KEY,
  };
}

async function query(params: Record<string, string>): Promise<CatalogProduct[]> {
  const { url, key } = cfg();
  const qs = new URLSearchParams({ select: COLS, ...params });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${url}/rest/v1/products?${qs.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
    });
    if (!r.ok) return [];
    return (await r.json()) as CatalogProduct[];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

const clean = (s: string) => s.replace(/[(),*"\\]/g, " ").trim();

/** Códigos tipo SKU no texto: AJ-STARTERKIT-CAM-HDR-W, DS-2CD2143G2-I, 8434…  */
export function extractCodes(text: string) {
  const out = new Set<string>();
  for (const m of text.matchAll(
    /\b[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)+\b|\b(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z0-9]{5,}\b|\b\d{8,14}\b/g,
  )) {
    const c = m[0];
    if (/^\d+([.,]\d+)?$/.test(c) && c.length < 8) continue; // preços
    if (/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(c)) continue; // datas
    out.add(c);
  }
  return [...out].slice(0, 4);
}

const STOP = new Set(
  "a o as os de da do das dos e em no na nos nas um uma para por com sem até ate euros euro eur promoção promocao campanha anúncio anuncio preço preco antes agora só so oferta desconto desde apenas semana dia dias fim".split(
    " ",
  ),
);

export async function findProducts(text: string, productId?: string): Promise<CatalogProduct[]> {
  if (productId) return query({ id: `eq.${productId}`, limit: "1" });
  for (const code of extractCodes(text)) {
    const c = clean(code);
    const exact = await query({ or: `(sku.ilike.${c},ean.eq.${c})`, limit: "3" });
    if (exact.length) return exact;
    const partial = await query({ sku: `ilike.*${c}*`, limit: "6" });
    if (partial.length) return partial;
  }
  const words = text
    .toLowerCase()
    .replace(/[0-9.,]+\s*(€|eur|euros)?/g, " ")
    .split(/[^a-z0-9áàâãéêíóôõúç-]+/i)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 4)
    .map(clean)
    .filter(Boolean);
  if (!words.length) return [];
  const all = await query({
    and: `(${words.map((w) => `name.ilike.*${w}*`).join(",")})`,
    limit: "6",
  });
  if (all.length) return all;
  if (words.length > 1) {
    return query({
      and: `(${words
        .slice(0, 2)
        .map((w) => `name.ilike.*${w}*`)
        .join(",")})`,
      limit: "6",
    });
  }
  return [];
}

export function productImages(p: CatalogProduct) {
  const extra = Array.isArray(p.imagens_extra) ? (p.imagens_extra as unknown[]).map(String) : [];
  return [p.image_url, ...extra]
    .filter((u): u is string => !!u && /^https?:\/\//.test(u))
    .slice(0, 4);
}

const strip = (s: string | null | undefined, max: number) =>
  (s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Factos do produto para dar à IA como verdade (texto compacto). */
export function productFacts(p: CatalogProduct) {
  let specs = p.especificacoes;
  if (typeof specs === "string") {
    try {
      specs = JSON.parse(specs);
    } catch {
      specs = {};
    }
  }
  const specText = Object.entries((specs ?? {}) as Record<string, unknown>)
    .slice(0, 25)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("; ")
    .slice(0, 900);
  const highlights = (Array.isArray(p.destaques) ? (p.destaques as unknown[]) : [])
    .map(String)
    .slice(0, 8);
  return [
    `Nome no catálogo: ${p.name}`,
    p.brand ? `Marca: ${p.brand}` : "",
    p.sku ? `Referência: ${p.sku}` : "",
    p.category ? `Categoria: ${p.category}` : "",
    p.short_description ? `Resumo: ${strip(p.short_description, 400)}` : "",
    highlights.length ? `Destaques: ${highlights.join(" | ")}` : "",
    p.description ? `Descrição: ${strip(p.description, 1400)}` : "",
    specText ? `Especificações: ${specText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
