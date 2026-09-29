import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Lê um feed RSS/Atom para uma zona "rss". Só aceita zonas que existam na base de
 * dados (o URL vem da configuração da zona), para não servir de proxy aberto.
 */
const cache = new Map<string, { at: number; items: string[]; title: string }>();
const TTL = 10 * 60 * 1000;

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeed(xml: string, max: number) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const items = blocks
    .map((b) => decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(b)?.[1] ?? ""))
    .filter(Boolean)
    .slice(0, max);
  const head = xml.split(/<(item|entry)[\s>]/i)[0] ?? "";
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? "");
  return { items, title };
}

export const fetchRss = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ zone_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: zone } = await supabaseAdmin
      .from("layout_zones")
      .select("config, kind")
      .eq("id", data.zone_id)
      .maybeSingle();
    const cfg = (zone?.config ?? {}) as { url?: string; max_items?: number };
    if (!zone || String(zone.kind) !== "rss" || !cfg.url || !/^https?:\/\//i.test(cfg.url)) {
      return { items: [] as string[], title: "", error: "Zona sem feed configurado." };
    }
    const max = Math.min(30, Math.max(1, Number(cfg.max_items) || 10));
    const hit = cache.get(cfg.url);
    if (hit && Date.now() - hit.at < TTL)
      return { items: hit.items.slice(0, max), title: hit.title, error: "" };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(cfg.url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "VRCF-Montra/1.0 (+https://vrcf.pt)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = (await res.text()).slice(0, 2_000_000);
      const parsed = parseFeed(xml, 30);
      cache.set(cfg.url, { at: Date.now(), ...parsed });
      return { items: parsed.items.slice(0, max), title: parsed.title, error: "" };
    } catch (e) {
      if (hit) return { items: hit.items.slice(0, max), title: hit.title, error: "" };
      return { items: [] as string[], title: "", error: e instanceof Error ? e.message : "erro" };
    }
  });
