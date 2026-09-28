import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SlideData } from "@/player/slides";
import { defaultZoneConfig, defaultZoneStyle, ZONE_META, round1 } from "./templates";
import type { Layout, Zone, ZoneKind } from "./types";
import type { PreviewContext } from "./ZonePreview";

export type SaveState = "idle" | "saving" | "saved" | "error";

const ZONE_FIELDS = [
  "name",
  "kind",
  "x",
  "y",
  "w",
  "h",
  "z",
  "position",
  "radius",
  "style",
  "config",
  "source_id",
  "playlist_id",
] as const;

function toZone(row: Record<string, unknown>): Zone {
  return {
    ...(row as unknown as Zone),
    x: Number(row["x"]),
    y: Number(row["y"]),
    w: Number(row["w"]),
    h: Number(row["h"]),
    style: (row["style"] ?? {}) as Zone["style"],
    config: (row["config"] ?? {}) as Zone["config"],
  };
}

function zonePayload(z: Zone) {
  const out: Record<string, unknown> = {};
  for (const f of ZONE_FIELDS) out[f] = z[f];
  out["style"] = z.style as unknown as Json;
  out["config"] = z.config as unknown as Json;
  return out;
}

export function useLayoutEditor(layoutId: string, orgId: string | undefined) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sources, setSources] = useState<PreviewContext["sources"]>([]);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);
  const [firstItems, setFirstItems] = useState<PreviewContext["firstItems"]>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const zonesRef = useRef<Zone[]>([]);
  zonesRef.current = zones;
  const layoutRef = useRef<Layout | null>(null);
  layoutRef.current = layout;
  const dirtyZones = useRef(new Set<string>());
  const dirtyLayout = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [l, z, s, p, o] = await Promise.all([
      supabase.from("layouts").select("*").eq("id", layoutId).maybeSingle(),
      supabase
        .from("layout_zones")
        .select("*")
        .eq("layout_id", layoutId)
        .order("z")
        .order("position"),
      supabase
        .from("sources")
        .select("id,name,kind,url,muted,volume,loop,fit,retry_s,fallback_media_id")
        .eq("org_id", orgId)
        .order("name"),
      supabase.from("playlists").select("id,name").eq("org_id", orgId).order("name"),
      supabase.from("organizations").select("logo_url").eq("id", orgId).maybeSingle(),
    ]);
    if (l.error) toast.error(l.error.message);
    setLayout((l.data as Layout | null) ?? null);
    setZones((z.data ?? []).map((r) => toZone(r as unknown as Record<string, unknown>)));
    setPlaylists((p.data ?? []) as Array<{ id: string; name: string }>);
    setLogoUrl((o.data?.logo_url as string | null) ?? null);

    // Fontes com o URL da imagem de reserva, para a pré-visualização.
    const srcRows = (s.data ?? []) as Array<Record<string, unknown>>;
    const fbIds = srcRows.map((r) => r["fallback_media_id"]).filter(Boolean) as string[];
    const fbMap: Record<string, string> = {};
    if (fbIds.length) {
      const { data: media } = await supabase.from("media").select("id,url").in("id", fbIds);
      for (const m of media ?? []) fbMap[m.id as string] = m.url as string;
    }
    setSources(
      srcRows.map((r) => ({
        id: r["id"] as string,
        name: r["name"] as string,
        kind: r["kind"] as string,
        url: (r["url"] as string | null) ?? null,
        muted: r["muted"] as boolean,
        volume: r["volume"] as number,
        loop: r["loop"] as boolean,
        fit: r["fit"] as string,
        retry_s: r["retry_s"] as number,
        fallback_url: fbMap[(r["fallback_media_id"] as string) ?? ""] ?? null,
      })),
    );

    // Primeiro item ativo de cada playlist.
    const plIds = (p.data ?? []).map((x) => x.id as string);
    if (plIds.length) {
      const { data: items } = await supabase
        .from("playlist_items")
        .select("playlist_id,kind,data,position")
        .in("playlist_id", plIds)
        .eq("enabled", true)
        .order("position");
      const map: PreviewContext["firstItems"] = {};
      for (const it of items ?? []) {
        const pid = it.playlist_id as string;
        if (!map[pid]) map[pid] = { kind: it.kind as string, data: (it.data ?? {}) as SlideData };
      }
      setFirstItems(map);
    }
    setLoading(false);
  }, [layoutId, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const ids = [...dirtyZones.current];
    const saveLayout = dirtyLayout.current;
    if (!ids.length && !saveLayout) return;
    dirtyZones.current.clear();
    dirtyLayout.current = false;
    setSaveState("saving");
    const jobs: Array<PromiseLike<{ error: { message: string } | null }>> = [];
    for (const id of ids) {
      const z = zonesRef.current.find((x) => x.id === id);
      if (z)
        jobs.push(
          supabase
            .from("layout_zones")
            .update(zonePayload(z) as never)
            .eq("id", id),
        );
    }
    const l = layoutRef.current;
    if (saveLayout && l) {
      jobs.push(
        supabase
          .from("layouts")
          .update({ name: l.name, orientation: l.orientation, background: l.background })
          .eq("id", l.id),
      );
    }
    const results = await Promise.all(jobs);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      setSaveState("error");
      toast.error(`Não foi possível guardar: ${err.message}`);
      ids.forEach((id) => dirtyZones.current.add(id));
      if (saveLayout) dirtyLayout.current = true;
    } else setSaveState("saved");
  }, []);

  const schedule = useCallback(() => {
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }, [flush]);

  // Guarda o que faltar ao sair da página.
  useEffect(() => {
    const onUnload = () => void flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      void flush();
    };
  }, [flush]);

  const updateZone = useCallback(
    (id: string, patch: Partial<Zone>) => {
      setZones((list) => list.map((z) => (z.id === id ? { ...z, ...patch } : z)));
      dirtyZones.current.add(id);
      schedule();
    },
    [schedule],
  );

  const updateZones = useCallback(
    (patches: Array<{ id: string; patch: Partial<Zone> }>) => {
      setZones((list) =>
        list.map((z) => {
          const p = patches.find((x) => x.id === z.id);
          return p ? { ...z, ...p.patch } : z;
        }),
      );
      patches.forEach((p) => dirtyZones.current.add(p.id));
      schedule();
    },
    [schedule],
  );

  const updateLayout = useCallback(
    (patch: Partial<Layout>) => {
      setLayout((l) => (l ? { ...l, ...patch } : l));
      dirtyLayout.current = true;
      schedule();
    },
    [schedule],
  );

  const insertZone = useCallback(
    async (z: Omit<Zone, "id" | "org_id" | "layout_id">) => {
      if (!layout) return null;
      const { data, error } = await supabase
        .from("layout_zones")
        .insert({
          ...zonePayload({ ...z, id: "", org_id: layout.org_id, layout_id: layout.id } as Zone),
          org_id: layout.org_id,
          layout_id: layout.id,
        } as never)
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      const zone = toZone(data as unknown as Record<string, unknown>);
      setZones((list) => [...list, zone]);
      setSaveState("saved");
      return zone;
    },
    [layout],
  );

  const addZone = useCallback(
    (kind: ZoneKind) => {
      const maxZ = zonesRef.current.reduce((m, z) => Math.max(m, z.z), 0);
      return insertZone({
        name: ZONE_META[kind].label,
        kind,
        x: 35,
        y: 35,
        w: 30,
        h: 30,
        z: maxZ + 1,
        position: zonesRef.current.length,
        radius: 0,
        style: defaultZoneStyle(kind),
        config: defaultZoneConfig(kind),
        source_id: null,
        playlist_id: null,
      });
    },
    [insertZone],
  );

  const duplicateZone = useCallback(
    (id: string) => {
      const z = zonesRef.current.find((x) => x.id === id);
      if (!z) return Promise.resolve(null);
      const maxZ = zonesRef.current.reduce((m, q) => Math.max(m, q.z), 0);
      const { id: _id, org_id: _o, layout_id: _l, ...rest } = z;
      return insertZone({
        ...rest,
        name: `${z.name} (cópia)`,
        x: round1(Math.min(100 - z.w, z.x + 2)),
        y: round1(Math.min(100 - z.h, z.y + 2)),
        z: maxZ + 1,
        position: zonesRef.current.length,
      });
    },
    [insertZone],
  );

  const removeZone = useCallback(async (id: string) => {
    dirtyZones.current.delete(id);
    setZones((list) => list.filter((z) => z.id !== id));
    const { error } = await supabase.from("layout_zones").delete().eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  return {
    layout,
    zones,
    loading,
    saveState,
    sources,
    playlists,
    preview: { sources, firstItems, logoUrl } satisfies PreviewContext,
    updateZone,
    updateZones,
    updateLayout,
    addZone,
    duplicateZone,
    removeZone,
    flush,
  };
}
