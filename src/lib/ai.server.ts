/** Utilitários de IA e imagens só para o servidor (Lovable AI + Biblioteca). */
export const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const TEXT_MODEL = "google/gemini-2.5-pro";
export const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

export async function gateway(body: unknown) {
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

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Guarda uma imagem na Biblioteca do cliente e devolve o URL público. */
export async function storeImage(
  orgId: string,
  bytes: Uint8Array,
  mime: string,
  name: string,
  tags: string[],
) {
  const db = await admin();
  const ext =
    mime.includes("jpeg") || mime.includes("jpg")
      ? "jpg"
      : (mime.split("/")[1] ?? "png").replace("+xml", "");
  const path = `${orgId}/${crypto.randomUUID()}-${tags[0] ?? "img"}.${ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: mime });
  if (up.error) throw new Error(up.error.message);
  const url = db.storage.from("media").getPublicUrl(path).data.publicUrl;
  await db.from("media").insert({
    org_id: orgId,
    name: name.slice(0, 120),
    path,
    url,
    mime,
    size_bytes: bytes.length,
    tags,
  });
  return url;
}

export async function download(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const mime = (r.headers.get("content-type") ?? "image/jpeg").split(";")[0] as string;
    if (!mime.startsWith("image/")) throw new Error("não é imagem");
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 8_000_000) throw new Error("imagem demasiado grande");
    return { bytes: buf, mime };
  } finally {
    clearTimeout(t);
  }
}

export function toDataUrl(bytes: Uint8Array, mime: string) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

/** Gera (ou edita, com foto de referência) uma imagem e devolve os bytes. */
export async function makeImage(prompt: string, reference?: { bytes: Uint8Array; mime: string }) {
  const content = reference
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: toDataUrl(reference.bytes, reference.mime) } },
      ]
    : prompt;
  const img = await gateway({
    model: IMAGE_MODEL,
    messages: [{ role: "user", content }],
    modalities: ["image", "text"],
  });
  const m = ((img["choices"] as Array<Record<string, unknown>>)?.[0]?.["message"] ?? {}) as Record<
    string,
    unknown
  >;
  const dataUrl =
    (m["images"] as Array<{ image_url: { url: string } }> | undefined)?.[0]?.image_url.url ?? "";
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("a IA não devolveu imagem");
  return {
    mime: match[1] as string,
    bytes: Uint8Array.from(atob(match[2] as string), (c) => c.charCodeAt(0)),
  };
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "erro");
