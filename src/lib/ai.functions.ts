import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { download, errMsg, gateway, makeImage, storeImage, TEXT_MODEL } from "./ai.server";

/**
 * Assistente de publicidade (Lovable AI).
 * Para trocar de fornecedor/modelo basta mudar este ficheiro.
 */

const ICONS = [
  "shield-check",
  "camera",
  "video",
  "lock",
  "key-round",
  "alarm-clock",
  "wifi",
  "router",
  "network",
  "laptop",
  "monitor",
  "cpu",
  "hard-drive",
  "printer",
  "smartphone",
  "headphones",
  "wrench",
  "hammer",
  "globe",
  "phone",
  "mail",
  "map-pin",
  "clock",
  "truck",
  "package",
  "shopping-bag",
  "tag",
  "badge-percent",
  "gift",
  "credit-card",
  "megaphone",
  "sparkles",
  "star",
  "award",
  "thumbs-up",
  "heart",
  "users",
  "briefcase",
  "home",
  "coffee",
  "utensils",
  "scissors",
  "car",
];

type Ctx = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
};

const Input = z.object({
  org_id: z.string().uuid(),
  prompt: z.string().trim().min(3).max(800),
  kind: z.enum(["auto", "product", "service", "text"]).default("auto"),
  tone: z.enum(["profissional", "proximo", "urgente", "divertido"]).default("profissional"),
  business: z.string().trim().max(300).default(""),
  product_image_url: z.string().url().max(1000).optional().or(z.literal("")),
  with_image: z.boolean().default(false),
  catalog_product_id: z.string().uuid().optional(),
  use_catalog: z.boolean().default(true),
});

const SYSTEM = `És um redator publicitário para ecrãs de montra em lojas em Portugal.
Regras:
- Escreve SEMPRE em português de Portugal (nunca do Brasil): "telemóvel", "equipa", "registo", "ecrã".
- O anúncio é lido de passagem, a 2–3 metros: título com no máximo 6 palavras, subtítulo com no máximo 10, até 3 pontos com no máximo 5 palavras cada.
- Nunca inventes preços, datas, percentagens, prémios ou certificações. Usa apenas os que o utilizador indicar; se não houver, deixa o campo vazio.
- Nada de afirmações que não se possam provar ("o melhor", "o mais barato").
- Gera 3 propostas com abordagens diferentes (ex.: destaque no preço, no benefício, na urgência).
- Cores em hexadecimal, com bom contraste entre fundo e texto.
- image_prompt: em inglês, descreve só um FUNDO fotográfico ou ambiente, sem texto, sem letras, sem logótipos, sem pessoas identificáveis e sem o produto em si.
- scene_prompt (só para produtos): em inglês, o ambiente realista onde o produto seria usado (ex.: "modern Portuguese living room by a window, soft daylight"). O produto em si não deve ser descrito.

Quando houver DADOS DO PRODUTO (do catálogo da loja):
- Esses dados são a única verdade técnica. Não acrescentes características que não estejam lá.
- "name": nome comercial curto e limpo (marca + modelo, sem códigos de cor nem siglas técnicas desnecessárias). Ex.: "Ajax StarterKit Cam".
- "description": o principal benefício para o cliente final, em linguagem simples (máx. 12 palavras). Nada de jargão.
- "features": exatamente 3 pontos fortes, curtos (máx. 5 palavras cada), tirados dos dados, escritos para quem não é técnico.
- "cta": chamada à ação curta (ex.: "Peça já na loja", "Instalação incluída" só se o utilizador disser).
- As 3 propostas devem ser do tipo "product" (a não ser que o pedido seja claramente outra coisa) e variar no ângulo: preço/poupança, benefício principal, segurança/tranquilidade, novidade…
- Se o utilizador indicar o preço, usa-o em "price"; preço anterior em "old_price" só se ele o indicar.`;

const TOOL = {
  type: "function",
  function: {
    name: "propostas",
    description: "Três propostas de anúncio para o ecrã.",
    parameters: {
      type: "object",
      properties: {
        variants: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["product", "service", "text"] },
              angle: {
                type: "string",
                description: "Nome curto da abordagem, em português (ex.: Preço em destaque)",
              },
              title: {
                type: "string",
                description: "Para product: igual a name. Para service/text: título.",
              },
              name: { type: "string", description: "Só product: nome comercial curto" },
              description: {
                type: "string",
                description: "Só product: benefício principal, máx. 12 palavras",
              },
              features: { type: "array", items: { type: "string" }, maxItems: 3 },
              cta: { type: "string" },
              brand: { type: "string" },
              scene_prompt: { type: "string" },
              subtitle: { type: "string" },
              body: { type: "string", description: "Só para kind=text; linhas separadas por \\n" },
              bullets: { type: "array", items: { type: "string" }, maxItems: 3 },
              price: { type: "string", description: "Só se o utilizador indicou; ex.: 79,90" },
              old_price: { type: "string" },
              badge: { type: "string", description: "1–2 palavras, ex.: Promoção" },
              category: { type: "string" },
              icon: { type: "string", enum: ICONS },
              template: {
                type: "string",
                enum: [
                  "photo_left",
                  "photo_right",
                  "photo_top",
                  "photo_background",
                  "big_title",
                  "image_left",
                  "image_background",
                ],
              },
              bg: { type: "string" },
              text_color: { type: "string" },
              accent: { type: "string" },
              image_prompt: { type: "string" },
            },
            required: ["kind", "angle", "title", "bg", "text_color", "accent", "image_prompt"],
          },
        },
      },
      required: ["variants"],
    },
  },
} as const;

type Raw = {
  name?: string;
  description?: string;
  features?: string[];
  cta?: string;
  brand?: string;
  scene_prompt?: string;
  kind: "product" | "service" | "text";
  angle: string;
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  price?: string;
  old_price?: string;
  badge?: string;
  category?: string;
  icon?: string;
  template?: string;
  bg: string;
  text_color: string;
  accent: string;
  image_prompt: string;
};

const hex = (v: unknown, fb: string) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : fb;
const PRODUCT_T = ["photo_left", "photo_right", "photo_top", "photo_background"];
const SERVICE_T = ["big_title", "image_left", "image_background"];

export function toItem(v: Raw, productImage: string, bgImage: string | null) {
  const colors = {
    bg: hex(v.bg, "#0F1E36"),
    text_color: hex(v.text_color, "#FFFFFF"),
    accent: hex(v.accent, "#F28C28"),
  };
  if (v.kind === "product") {
    const data: Record<string, unknown> = {
      name: v.name || v.title,
      price: v.price ?? "",
      template: PRODUCT_T.includes(v.template ?? "") ? v.template : "photo_left",
      photo_fit: "contain",
      ...colors,
    };
    if (v.description) data["description"] = v.description;
    if (v.features?.length) data["features"] = v.features.filter(Boolean).slice(0, 3);
    if (v.cta) data["cta"] = v.cta;
    if (v.brand) data["brand"] = v.brand;
    if (v.old_price) data["old_price"] = v.old_price;
    if (v.badge) data["badge"] = v.badge;
    if (v.category) data["category"] = v.category;
    else if (!v.description && v.subtitle) data["description"] = v.subtitle;
    if (productImage) data["image_url"] = productImage;
    else if (data["template"] === "photo_background") data["template"] = "photo_left";
    return { kind: "product" as const, angle: v.angle, data };
  }
  if (v.kind === "service") {
    let template = SERVICE_T.includes(v.template ?? "") ? v.template : "big_title";
    const data: Record<string, unknown> = { title: v.title, ...colors };
    if (v.subtitle) data["subtitle"] = v.subtitle;
    if (v.bullets?.length) data["bullets"] = v.bullets.slice(0, 3);
    if (v.icon && ICONS.includes(v.icon)) data["icon"] = v.icon;
    const img = bgImage || productImage;
    if (img) {
      data["image_url"] = img;
      if (template === "big_title") template = "image_background";
    } else if (template !== "big_title") template = "big_title";
    data["template"] = template;
    return { kind: "service" as const, angle: v.angle, data };
  }
  const data: Record<string, unknown> = {
    title: v.title,
    body: v.body || [v.subtitle, ...(v.bullets ?? [])].filter(Boolean).join("\n"),
    align: "center",
    size: "l",
    ...colors,
  };
  if (bgImage) data["bg_image_url"] = bgImage;
  return { kind: "text" as const, angle: v.angle, data };
}

/** Pesquisa manual no catálogo (para escolher o produto certo). */
export const searchCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { findProducts, productImages } = await import("./catalog.server");
    const list = await findProducts(data.query);
    return {
      products: list.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        image_url: productImages(p)[0] ?? null,
        price: p.store_price_vat,
      })),
    };
  });

export const generateAds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: allowed } = await ctx.supabase.rpc("is_member", {
      p_org: data.org_id,
      p_roles: ["owner", "editor"],
    });
    if (allowed !== true) throw new Error("Sem permissão para criar conteúdos nesta organização.");
    const warnings: string[] = [];

    // 1. Identificar o produto no catálogo
    const cat = await import("./catalog.server");
    let candidates: Awaited<ReturnType<typeof cat.findProducts>> = [];
    if (data.use_catalog && data.kind !== "service" && data.kind !== "text") {
      candidates = await cat.findProducts(data.prompt, data.catalog_product_id);
    }
    const product = candidates[0] ?? null;

    // 2. Foto real: a escolhida pelo utilizador, ou a do catálogo (copiada para a Biblioteca)
    let photoUrl = data.product_image_url || "";
    let photoBytes: { bytes: Uint8Array; mime: string } | null = null;
    if (!photoUrl && product) {
      const img = cat.productImages(product)[0];
      if (img) {
        try {
          photoBytes = await download(img);
          photoUrl = await storeImage(
            data.org_id,
            photoBytes.bytes,
            photoBytes.mime,
            product.name,
            ["produto", "catalogo"],
          );
        } catch (e) {
          photoUrl = img; // usa o link original se não der para copiar
          warnings.push(`A foto do catálogo não foi copiada para a Biblioteca (${errMsg(e)}).`);
        }
      }
    }

    // 3. Textos
    const TONE: Record<string, string> = {
      profissional: "profissional e confiável",
      proximo: "próximo e simpático",
      urgente: "com sentido de urgência (sem exagerar)",
      divertido: "descontraído e com humor leve",
    };
    const user = [
      data.business ? `Sobre o negócio: ${data.business}` : "",
      `Pedido: ${data.prompt}`,
      product
        ? `DADOS DO PRODUTO (catálogo da loja):\n${cat.productFacts(product)}`
        : data.use_catalog && data.kind !== "service" && data.kind !== "text"
          ? "O produto não foi encontrado no catálogo: usa só o que o pedido diz e não inventes características técnicas."
          : "",
      data.kind !== "auto"
        ? `Tipo de anúncio obrigatório: ${data.kind}`
        : product
          ? "Tipo: product."
          : "Escolhe o tipo mais adequado (product, service ou text); podes variar entre propostas.",
      `Tom: ${TONE[data.tone]}.`,
      photoUrl ? "Há uma foto real do produto." : "Não há foto do produto.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const json = await gateway({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "propostas" } },
    });
    const choice = (json["choices"] as Array<Record<string, unknown>> | undefined)?.[0];
    const msg = (choice?.["message"] ?? {}) as Record<string, unknown>;
    const call = (msg["tool_calls"] as Array<{ function: { arguments: string } }> | undefined)?.[0];
    let raw: Raw[] = [];
    try {
      const txt =
        call?.function.arguments ?? String(msg["content"] ?? "").replace(/```json|```/g, "");
      raw = ((JSON.parse(txt) as { variants?: Raw[] }).variants ?? []).slice(0, 3);
    } catch {
      throw new Error("A IA devolveu uma resposta inválida. Tente outra vez.");
    }
    if (!raw.length) throw new Error("A IA não devolveu propostas. Tente reformular o pedido.");
    if (product) {
      for (const r of raw) {
        if (r.kind === "product") {
          const b = r.brand || product.brand;
          if (b) r.brand = b;
          if (!r.category && product.category) r.category = product.category;
        }
      }
    }

    // 4. Imagens com IA (opcional)
    let bgUrl: string | null = null;
    let sceneUrl: string | null = null;
    if (data.with_image) {
      const firstProduct = raw.find((r) => r.kind === "product");
      if (firstProduct && photoUrl) {
        // Produto real num ambiente: a IA recebe a foto e só muda o cenário.
        try {
          const ref = photoBytes ?? (await download(photoUrl));
          const scene =
            firstProduct.scene_prompt || "a modern, bright Portuguese home interior, soft daylight";
          const out = await makeImage(
            `Create a realistic 16:9 advertising photo that places EXACTLY this product (same shape, colours, logos and details — do not redesign or change it) in this setting: ${scene}. Keep the product sharp and clearly visible on the right half of the frame, leave the left half calmer for text. No added text, letters, watermarks or extra products.`,
            ref,
          );
          sceneUrl = await storeImage(
            data.org_id,
            out.bytes,
            out.mime,
            `Ambiente IA — ${firstProduct.name || firstProduct.title}`,
            ["ia", "ambiente"],
          );
        } catch (e) {
          warnings.push(`Não foi possível criar a foto em ambiente (${errMsg(e)}).`);
        }
      }
      if (raw.some((r) => r.kind !== "product")) {
        try {
          const prompt = raw.find((r) => r.kind !== "product")?.image_prompt ?? data.prompt;
          const out = await makeImage(
            `Wide 16:9 photographic background for a shop display screen: ${prompt}. No text, no letters, no logos, no watermarks. Leave calm space for text overlay.`,
          );
          bgUrl = await storeImage(
            data.org_id,
            out.bytes,
            out.mime,
            `Fundo IA — ${data.prompt.slice(0, 60)}`,
            ["ia", "fundo"],
          );
        } catch (e) {
          warnings.push(`Não foi possível gerar o fundo (${errMsg(e)}).`);
        }
      }
      if (!photoUrl && raw.every((r) => r.kind === "product")) {
        warnings.push(
          "Sem foto do produto não há foto em ambiente: escolha uma foto ou um produto do catálogo.",
        );
      }
    }

    const variants = raw.map((v) => toItem(v, photoUrl, bgUrl));
    if (sceneUrl) {
      const base = variants.find((v) => v.kind === "product");
      if (base) {
        variants.push({
          kind: "product",
          angle: "Produto em ambiente (IA)",
          data: {
            ...base.data,
            image_url: sceneUrl,
            photo_fit: "cover",
            template: "photo_background",
          },
        });
      }
    }

    // Devolvido como texto JSON (o conteúdo dos slides é livre e não tem tipo fixo).
    return {
      json: JSON.stringify({
        variants,
        product: product
          ? {
              id: product.id,
              name: product.name,
              sku: product.sku,
              brand: product.brand,
              image_url: photoUrl || null,
            }
          : null,
        candidates: candidates.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          image_url: cat.productImages(p)[0] ?? null,
        })),
        warnings,
      }),
    };
  });
