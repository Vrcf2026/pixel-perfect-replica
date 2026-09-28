import { supabase } from "@/integrations/supabase/client";

export type MediaRow = {
  id: string;
  org_id: string;
  name: string;
  path: string;
  url: string;
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  tags: string[];
  created_at: string;
};

export const MAX_BYTES = 200 * 1024 * 1024;

export const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
];

export function isImage(mime?: string | null) {
  return !!mime && mime.startsWith("image/");
}

export function isVideo(mime?: string | null) {
  return !!mime && mime.startsWith("video/");
}

export function formatBytes(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

async function readDimensions(file: File): Promise<{
  width?: number | undefined;
  height?: number | undefined;
  duration_s?: number | undefined;
}> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }
    if (file.type.startsWith("video/")) {
      return await new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () =>
          resolve({
            width: v.videoWidth,
            height: v.videoHeight,
            duration_s: Math.round(v.duration) || undefined,
          });
        v.onerror = () => resolve({});
        v.src = url;
      });
    }
    return {};
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export async function uploadMedia(orgId: string, file: File): Promise<MediaRow> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error(`Formato não aceite: ${file.name}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} é maior do que 200 MB.`);
  }

  const path = `${orgId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const dims = await readDimensions(file);

  const { data, error } = await supabase
    .from("media")
    .insert({
      org_id: orgId,
      name: file.name,
      path,
      url: pub.publicUrl,
      mime: file.type,
      size_bytes: file.size,
      width: dims.width ?? null,
      height: dims.height ?? null,
      duration_s: dims.duration_s ?? null,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("media").remove([path]);
    throw error;
  }
  return data as MediaRow;
}

export async function deleteMedia(row: MediaRow) {
  const { error } = await supabase.from("media").delete().eq("id", row.id);
  if (error) throw error;
  await supabase.storage.from("media").remove([row.path]);
}

/** Conta onde é que um ficheiro está a ser usado. */
export async function mediaUsage(row: MediaRow) {
  const [sourcesRes, itemsRes] = await Promise.all([
    supabase
      .from("sources")
      .select("id,name")
      .eq("org_id", row.org_id)
      .or(`media_id.eq.${row.id},fallback_media_id.eq.${row.id}`),
    supabase.from("playlist_items").select("id,data").eq("org_id", row.org_id),
  ]);

  const items = (itemsRes.data ?? []).filter((it) => JSON.stringify(it.data).includes(row.url));
  return { sources: sourcesRes.data ?? [], items };
}
