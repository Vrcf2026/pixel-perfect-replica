/** Leitura de catálogos externos (ex.: catálogo VRCF em Supabase) com cache. */
type Row = Record<string, unknown>;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; rows: Row[] }>();

function pick(row: Row, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Row)[key];
    return undefined;
  }, row);
}

async function fetchRows(url: string, headers: Record<string, string>): Promise<Row[]> {
  const key = url + JSON.stringify(headers);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = (await r.json()) as unknown;
    const rows: Row[] = Array.isArray(json)
      ? (json as Row[])
      : Array.isArray((json as Row)["items"])
        ? ((json as Row)["items"] as Row[])
        : Array.isArray((json as Row)["data"])
          ? ((json as Row)["data"] as Row[])
          : [];
    cache.set(key, { at: Date.now(), rows });
    return rows;
  } catch (e) {
    if (hit) return hit.rows; // última resposta boa
    throw e;
  }
}

/** Converte um item catalog_feed numa lista de dados de slide de produto. */
export async function expandCatalog(data: Row): Promise<Row[]> {
  const url = String(data["url"] ?? "");
  if (!url) return [];
  const headers = (data["headers"] as Record<string, string>) || {};
  const map = (data["map"] as Record<string, string>) || {};
  const limit = Number(data["limit"]) || 20;
  const mult = Number(data["price_multiplier"]) || 1;
  let rows = await fetchRows(url, headers);
  if (data["shuffle"]) rows = [...rows].sort(() => Math.random() - 0.5);
  const m = (k: string) => (map[k] ? map[k] : k);
  return rows.slice(0, limit).map((row) => {
    const raw = pick(row, m("price"));
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
    const oldRaw = map["old_price"] ? pick(row, map["old_price"]) : undefined;
    const oldN = Number(String(oldRaw ?? "").replace(",", "."));
    return {
      name: String(pick(row, m("name")) ?? ""),
      price: Number.isFinite(n) && String(raw ?? "") !== "" ? n * mult : raw,
      old_price: oldRaw !== undefined && Number.isFinite(oldN) ? oldN * mult : oldRaw,
      image_url: pick(row, m("image_url")),
      category: pick(row, m("category")),
      description: map["description"] ? pick(row, map["description"]) : undefined,
      badge: map["badge"] ? pick(row, map["badge"]) : undefined,
      template: data["template"] ?? "photo_left",
      bg: data["bg"],
      text_color: data["text_color"],
      accent: data["accent"],
    } as Row;
  });
}
