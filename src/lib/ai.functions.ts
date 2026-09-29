import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Assistente de publicidade (Lovable AI).
 * Para trocar de fornecedor/modelo basta mudar este ficheiro.
 */
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

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
});

const SYSTEM = `És um redator publicitário para ecrãs de montra em lojas em Portugal.
Regras:
- Escreve SEMPRE em português de Portugal (nunca do Brasil): "telemóvel", "equipa", "registo", "ecrã".
- O anúncio é lido de passagem, a 2–3 metros: título com no máximo 6 palavras, subtítulo com no máximo 10, até 3 pontos com no máximo 5 palavras cada.
- Nunca inventes preços, datas, percentagens, prémios ou certificações. Usa apenas os que o utilizador indicar; se não houver, deixa o campo vazio.
- Nada de afirmações que não se possam provar ("o melhor", "o mais barato").
- Gera 3 propostas com abordagens diferentes (ex.: destaque no preço, no benefício, na urgência).
- Cores em hexadecimal, com bom contraste entre fundo e texto.
- image_prompt: em inglês, descreve só um FUNDO fotográfico ou ambiente, sem texto, sem letras, sem logótipos, sem pessoas identificáveis e sem o produto em si.`;

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
              title: { type: "string" },
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

async function gateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key)
    throw new Error(
      "A IA não está configurada (falta LOVABLE_API_KEY). Peça ao Lovable para ativar o Lovable AI.",
    );
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429)
    throw new Error("Muitos pedidos seguidos. Tente outra vez daqui a um minuto.");
  if (res.status === 402)
    throw new Error("Os créditos de IA do Lovable esgotaram. Carregue créditos no workspace.");
  if (!res.ok) throw new Error(`Erro da IA (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as Record<string, unknown>;
}

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
      name: v.title,
      price: v.price ?? "",
      template: PRODUCT_T.includes(v.template ?? "") ? v.template : "photo_left",
      ...colors,
    };
    if (v.old_price) data["old_price"] = v.old_price;
    if (v.badge) data["badge"] = v.badge;
    if (v.category || v.subtitle) data["category"] = v.category || v.subtitle;
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

    const TONE: Record<string, string> = {
      profissional: "profissional e confiável",
      proximo: "próximo e simpático",
      urgente: "com sentido de urgência (sem exagerar)",
      divertido: "descontraído e com humor leve",
    };
    const user = [
      data.business ? `Sobre o negócio: ${data.business}` : "",
      `Pedido: ${data.prompt}`,
      data.kind !== "auto"
        ? `Tipo de anúncio obrigatório: ${data.kind}`
        : "Escolhe o tipo mais adequado (product, service ou text); podes variar entre propostas.",
      `Tom: ${TONE[data.tone]}.`,
      data.product_image_url
        ? "Há uma foto real do produto disponível."
        : "Não há foto do produto.",
    ]
      .filter(Boolean)
      .join("\n");

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

    // Imagem de fundo (uma por pedido), guardada na biblioteca do cliente.
    let imageUrl: string | null = null;
    let imageError: string | null = null;
    if (data.with_image) {
      try {
        const prompt =
          raw.find((r) => r.kind !== "product")?.image_prompt ??
          raw[0]?.image_prompt ??
          data.prompt;
        const img = await gateway({
          model: IMAGE_MODEL,
          messages: [
            {
              role: "user",
              content: `Wide 16:9 photographic background for a shop display screen: ${prompt}. No text, no letters, no logos, no watermarks. Leave calm space for text overlay.`,
            },
          ],
          modalities: ["image", "text"],
        });
        const m = ((img["choices"] as Array<Record<string, unknown>>)?.[0]?.["message"] ??
          {}) as Record<string, unknown>;
        const dataUrl =
          (m["images"] as Array<{ image_url: { url: string } }> | undefined)?.[0]?.image_url.url ??
          "";
        const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
        if (!match) throw new Error("sem imagem na resposta");
        const mime = match[1] as string;
        const bytes = Uint8Array.from(atob(match[2] as string), (c) => c.charCodeAt(0));
        const ext = mime.split("/")[1] === "jpeg" ? "jpg" : (mime.split("/")[1] ?? "png");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${data.org_id}/${crypto.randomUUID()}-fundo-ia.${ext}`;
        const up = await supabaseAdmin.storage
          .from("media")
          .upload(path, bytes, { contentType: mime });
        if (up.error) throw new Error(up.error.message);
        imageUrl = supabaseAdmin.storage.from("media").getPublicUrl(path).data.publicUrl;
        await supabaseAdmin.from("media").insert({
          org_id: data.org_id,
          name: `Fundo IA — ${data.prompt.slice(0, 60)}`,
          path,
          url: imageUrl,
          mime,
          size_bytes: bytes.length,
          tags: ["ia", "fundo"],
        });
      } catch (e) {
        imageError = `Não foi possível gerar a imagem (${e instanceof Error ? e.message : "erro"}). As propostas foram criadas sem ela.`;
        imageUrl = null;
      }
    }

    // Devolvido como texto JSON (o conteúdo dos slides é livre e não tem tipo fixo).
    return {
      json: JSON.stringify({
        variants: raw.map((v) => toItem(v, data.product_image_url || "", imageUrl)),
        image_url: imageUrl,
        image_error: imageError,
      }),
    };
  });
