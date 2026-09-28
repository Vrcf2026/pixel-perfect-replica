export type M3UChannel = {
  name: string;
  url: string;
  logo?: string | undefined;
  group?: string | undefined;
  kind: "hls" | "ts";
};

function attr(line: string, key: string) {
  const m = line.match(new RegExp(`${key}="([^"]*)"`));
  return m?.[1] || undefined;
}

/** Lê uma lista M3U e devolve os canais encontrados. */
export function parseM3U(text: string): M3UChannel[] {
  const lines = text.split(/\r?\n/);
  const out: M3UChannel[] = [];
  let pending: Omit<M3UChannel, "url" | "kind"> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      const name = attr(line, "tvg-name") || line.split(",").slice(1).join(",").trim() || "Canal";
      pending = { name, logo: attr(line, "tvg-logo"), group: attr(line, "group-title") };
      continue;
    }
    if (line.startsWith("#")) continue;
    const url = line;
    const lower = url.toLowerCase();
    const kind: "hls" | "ts" = lower.includes(".ts") && !lower.includes(".m3u8") ? "ts" : "hls";
    out.push({ name: pending?.name ?? url, url, logo: pending?.logo, group: pending?.group, kind });
    pending = null;
  }
  return out;
}
