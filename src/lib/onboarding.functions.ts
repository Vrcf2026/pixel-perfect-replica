import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Arranque rápido: lê sites e o catálogo e devolve um rascunho de montra completo. */

type Ctx = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
};

async function assertEditor(ctx: Ctx, orgId: string) {
  const { data } = await ctx.supabase.rpc("is_member", {
    p_org: orgId,
    p_roles: ["owner", "editor"],
  });
  if (data !== true) throw new Error("Sem permissão nesta organização.");
}

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

const SYSTEM = `És o responsável por montar a montra digital (TV na loja) de um negócio em Portugal, a partir do site dele.
Escreve SEMPRE em português de Portugal. Textos curtíssimos: a TV é vista de passagem.
Usa SÓ informação que esteja nos dados do site ou do catálogo. Nunca inventes preços, prémios, anos de experiência, certificações, horários ou contactos.
Se um dado não existir (ex.: horário), deixa vazio.`;

const TOOL = {
  type: "function",
  function: {
    name: "rascunho",
    description: "Rascunho da montra digital",
    parameters: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        tagline: {
          type: "string",
          description: "Frase curta do que o negócio faz (máx. 8 palavras)",
        },
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string", description: "Morada curta: rua, nº e localidade" },
        hours: {
          type: "array",
          items: { type: "string" },
          description: "Ex.: 'Seg a Sex: 9h00–19h00'",
        },
        colors: {
          type: "object",
          properties: {
            primary: { type: "string", description: "Cor escura principal da marca (hex)" },
            accent: { type: "string", description: "Cor de destaque da marca (hex)" },
          },
        },
        services: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "máx. 5 palavras" },
              subtitle: { type: "string", description: "benefício, máx. 10 palavras" },
              bullets: { type: "array", items: { type: "string" }, maxItems: 3 },
              icon: { type: "string", enum: ICONS },
            },
            required: ["title"],
          },
        },
        ticker: {
          type: "array",
          maxItems: 10,
          items: { type: "string" },
          description:
            "6 a 10 mensagens curtas para o rodapé: serviços, morada, horário, telefone, site, frases de marca",
        },
        ideas: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "máx. 6 palavras" },
              body: { type: "string", description: "máx. 14 palavras" },
            },
            required: ["title"],
          },
          description: "Ideias de campanha/aviso para a montra, baseadas no que o negócio faz",
        },
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string", description: "Nome comercial curto (marca + modelo)" },
              description: { type: "string", description: "Benefício principal, máx. 12 palavras" },
              features: { type: "array", items: { type: "string" }, maxItems: 3 },
            },
            required: ["id", "name"],
          },
        },
      },
      required: ["business_name", "ticker", "services"],
    },
  },
} as const;

type Draft = {
  business_name: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string[];
  colors?: { primary?: string; accent?: string };
  services?: Array<{ title: string; subtitle?: string; bullets?: string[]; icon?: string }>;
  ticker?: string[];
  ideas?: Array<{ title: string; body?: string }>;
  products?: Array<{ id: string; name: string; description?: string; features?: string[] }>;
};

const hex = (v: unknown) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : "";

export const analyzeSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        org_id: z.string().uuid(),
        urls: z.array(z.string().trim().min(3).max(300)).max(3),
        include_catalog: z.boolean().default(false),
        catalog_limit: z.number().int().min(1).max(10).default(6),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context as unknown as Ctx, data.org_id);
    const { readSite } = await import("./site.server");
    const cat = await import("./catalog.server");
    const ai = await import("./ai.server");
    const warnings: string[] = [];

    // 1. Sites
    const sites = (
      await Promise.all(
        data.urls.map(async (u) => {
          try {
            return await readSite(u);
          } catch (e) {
            warnings.push(`Não consegui ler ${u} (${ai.errMsg(e)}).`);
            return null;
          }
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => !!x);
    for (const s of sites) {
      if (s.text.length < 300)
        warnings.push(
          `${s.url} tem pouco texto legível (talvez seja feito só em JavaScript). Reveja o rascunho com atenção.`,
        );
    }

    // 2. Produtos em destaque do catálogo
    const products = data.include_catalog ? await cat.featuredProducts(data.catalog_limit) : [];
    if (data.include_catalog && !products.length)
      warnings.push("Não há produtos marcados como destaque no catálogo.");
    if (!sites.length && !products.length)
      throw new Error("Não consegui ler nenhum site. Verifique os endereços.");

    // 3. Rascunho com IA
    const siteBlock = sites
      .map(
        (s) => `### Site: ${s.url}
Título: ${s.title}
Nome: ${s.siteName}
Descrição: ${s.description}
Telefones encontrados: ${s.phones.join(", ") || "—"}
Emails encontrados: ${s.emails.join(", ") || "—"}
Cor do tema: ${s.themeColor || "—"}
Dados estruturados: ${JSON.stringify(s.jsonLd).slice(0, 2500)}
Texto:
${s.text.slice(0, 5000)}`,
      )
      .join("\n\n");
    const prodBlock = products.length
      ? `### Produtos em destaque (catálogo da loja)\n${products
          .map((p) => `[id=${p.id}]\n${cat.productFacts(p).slice(0, 900)}`)
          .join("\n\n")}`
      : "";
    const json = await ai.gateway({
      model: ai.TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${siteBlock}\n\n${prodBlock}\n\nPrepara o rascunho da montra.` },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "rascunho" } },
    });
    const msg = ((json["choices"] as Array<Record<string, unknown>>)?.[0]?.["message"] ??
      {}) as Record<string, unknown>;
    const call = (msg["tool_calls"] as Array<{ function: { arguments: string } }> | undefined)?.[0];
    let d: Draft;
    try {
      d = JSON.parse(
        call?.function.arguments ?? String(msg["content"] ?? "").replace(/```json|```/g, ""),
      ) as Draft;
    } catch {
      throw new Error("A IA devolveu uma resposta inválida. Tente outra vez.");
    }

    // 4. Logótipo: o primeiro candidato que se consiga descarregar vai para a Biblioteca
    const logoCandidates = [...new Set(sites.flatMap((s) => s.logos))].slice(0, 8);
    let logoUrl: string | null = null;
    for (const cand of logoCandidates.slice(0, 4)) {
      try {
        const img = await ai.download(cand);
        if (img.bytes.length < 600) continue; // ícones minúsculos
        logoUrl = await ai.storeImage(
          data.org_id,
          img.bytes,
          img.mime,
          `Logótipo — ${d.business_name}`,
          ["logo"],
        );
        break;
      } catch {
        /* tenta o seguinte */
      }
    }
    if (!logoUrl && sites.length)
      warnings.push(
        "Não encontrei um logótipo utilizável. Pode escolher outro ou carregar na Biblioteca.",
      );

    // 5. Itens da playlist
    type Item = {
      id: string;
      kind: string;
      label: string;
      data: Record<string, unknown>;
      duration_s?: number;
    };
    const items: Item[] = [];
    const id = () => crypto.randomUUID();
    for (const s of d.services ?? []) {
      items.push({
        id: id(),
        kind: "service",
        label: `Serviço: ${s.title}`,
        data: {
          title: s.title,
          ...(s.subtitle ? { subtitle: s.subtitle } : {}),
          ...(s.bullets?.length ? { bullets: s.bullets.slice(0, 3) } : {}),
          ...(s.icon && ICONS.includes(s.icon) ? { icon: s.icon } : {}),
          template: "big_title",
        },
      });
    }
    for (const p of products) {
      const ai2 = d.products?.find((x) => x.id === p.id);
      let image: string | null = null;
      const src = cat.productImages(p)[0];
      if (src) {
        try {
          const img = await ai.download(src);
          image = await ai.storeImage(data.org_id, img.bytes, img.mime, p.name, [
            "produto",
            "catalogo",
          ]);
        } catch {
          image = src;
        }
      }
      items.push({
        id: id(),
        kind: "product",
        label: `Produto: ${ai2?.name || p.name}`,
        data: {
          name: ai2?.name || p.name,
          ...(p.store_price_vat ? { price: Number(p.store_price_vat.toFixed(2)) } : {}),
          ...(p.brand ? { brand: p.brand } : {}),
          ...(p.category ? { category: p.category } : {}),
          ...(ai2?.description ? { description: ai2.description } : {}),
          ...(ai2?.features?.length ? { features: ai2.features.slice(0, 3) } : {}),
          ...(image ? { image_url: image } : {}),
          photo_fit: "contain",
          template:
            items.filter((x) => x.kind === "product").length % 2 ? "photo_right" : "photo_left",
          cta: "Disponível na loja",
        },
      });
    }
    if (d.hours?.length) {
      items.push({
        id: id(),
        kind: "text",
        label: "Horário",
        data: { title: "Horário", body: d.hours.join("\n"), align: "center", size: "m" },
      });
    }
    for (const idea of d.ideas ?? []) {
      items.push({
        id: id(),
        kind: "text",
        label: `Ideia: ${idea.title}`,
        data: {
          title: idea.title,
          ...(idea.body ? { body: idea.body } : {}),
          align: "center",
          size: "l",
        },
      });
    }
    const site = sites[0]?.url;
    if (site) {
      items.push({
        id: id(),
        kind: "qr",
        label: "QR para o site",
        data: {
          url: site,
          title: "Visite o nosso site",
          caption: site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
        },
      });
    }
    const maps = sites.flatMap((s) => s.mapsLinks)[0];
    if (maps) {
      items.push({
        id: id(),
        kind: "qr",
        label: "QR para avaliações no Google",
        data: {
          url: maps,
          title: "Gostou? Avalie-nos no Google",
          caption: "Aponte a câmara do telemóvel",
        },
      });
    }
    const insta = sites.flatMap((s) => s.socials).find((x) => /instagram/i.test(x));
    if (insta) {
      items.push({
        id: id(),
        kind: "qr",
        label: "QR para o Instagram",
        data: {
          url: insta,
          title: "Siga-nos no Instagram",
          caption: "@" + (insta.split("/").filter(Boolean).pop() ?? ""),
        },
      });
    }

    const primary = hex(d.colors?.primary) || "";
    const accent = hex(d.colors?.accent) || hex(sites[0]?.themeColor) || "";
    return {
      json: JSON.stringify({
        business_name: d.business_name,
        tagline: d.tagline ?? "",
        contacts: { phone: d.phone ?? "", email: d.email ?? "", address: d.address ?? "" },
        hours: d.hours ?? [],
        colors: { primary, accent },
        logo_url: logoUrl,
        logo_candidates: logoCandidates,
        ticker: (d.ticker ?? []).filter(Boolean).slice(0, 10),
        items,
        site_url: site ?? null,
        warnings,
      }),
    };
  });

/** Copia uma imagem da internet para a Biblioteca (ex.: outro candidato a logótipo). */
export const importImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        org_id: z.string().uuid(),
        url: z.string().url().max(1000),
        name: z.string().max(120).default("Imagem"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context as unknown as Ctx, data.org_id);
    const ai = await import("./ai.server");
    const img = await ai.download(data.url);
    const url = await ai.storeImage(data.org_id, img.bytes, img.mime, data.name, ["logo"]);
    return { url };
  });
