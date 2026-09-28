import { supabase } from "@/integrations/supabase/client";
import type { PlayerConfig, PlayerSource } from "@/player/lib/types";

/** Monta a mesma estrutura que get_player_config, a partir das tabelas (para pré-visualizar). */
export async function buildPreviewConfig(
  layoutId: string,
  orgId: string,
): Promise<PlayerConfig | null> {
  const [l, z, s, o] = await Promise.all([
    supabase.from("layouts").select("*").eq("id", layoutId).maybeSingle(),
    supabase.from("layout_zones").select("*").eq("layout_id", layoutId),
    supabase.from("sources").select("*").eq("org_id", orgId),
    supabase.from("organizations").select("name,logo_url,theme").eq("id", orgId).maybeSingle(),
  ]);
  if (!l.data) return null;
  const zones = z.data ?? [];
  const plIds = [...new Set(zones.map((x) => x.playlist_id).filter(Boolean))] as string[];
  const [p, items] = plIds.length
    ? await Promise.all([
        supabase.from("playlists").select("*").in("id", plIds),
        supabase
          .from("playlist_items")
          .select("*")
          .in("playlist_id", plIds)
          .eq("enabled", true)
          .order("position"),
      ])
    : [{ data: [] }, { data: [] }];
  const mediaIds = (s.data ?? [])
    .flatMap((x) => [x.media_id, x.fallback_media_id])
    .filter(Boolean) as string[];
  const media = mediaIds.length
    ? ((await supabase.from("media").select("id,url").in("id", mediaIds)).data ?? [])
    : [];
  const mediaUrl = (id: string | null) =>
    id ? (media.find((m) => m.id === id)?.url ?? null) : null;

  const sources: Record<string, PlayerSource> = {};
  for (const src of s.data ?? []) {
    sources[src.id] = {
      ...src,
      media_url: mediaUrl(src.media_id),
      fallback_url: mediaUrl(src.fallback_media_id),
    } as PlayerSource;
  }
  const portrait = l.data.orientation === "portrait";

  return {
    version: "preview",
    screen: {
      id: "preview",
      name: "Pré-visualização",
      orientation: l.data.orientation as "landscape" | "portrait",
      width: portrait ? 1080 : 1920,
      height: portrait ? 1920 : 1080,
      timezone: "Europe/Lisbon",
    },
    org: { name: o.data?.name ?? "", logo_url: o.data?.logo_url ?? null },
    theme: (o.data?.theme ?? {}) as PlayerConfig["theme"],
    sources,
    layout: {
      id: l.data.id,
      name: l.data.name,
      orientation: l.data.orientation as "landscape" | "portrait",
      background: l.data.background,
      zones: zones.map((zone) => {
        const pl = (p.data ?? []).find((x) => x.id === zone.playlist_id);
        return {
          ...(zone as unknown as PlayerConfig["layout"] extends infer L
            ? L extends { zones: Array<infer Z> }
              ? Z
              : never
            : never),
          x: Number(zone.x),
          y: Number(zone.y),
          w: Number(zone.w),
          h: Number(zone.h),
          playlist: pl
            ? {
                ...pl,
                items: (items.data ?? [])
                  .filter((i) => i.playlist_id === pl.id)
                  .map((i) => ({ ...i, data: (i.data ?? {}) as Record<string, unknown> })),
              }
            : null,
        };
      }),
    },
  } as PlayerConfig;
}
