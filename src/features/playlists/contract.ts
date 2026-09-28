// CONTRATO DE DADOS — playlist_items.data por kind.
import {
  Image as ImageIcon,
  Video,
  Radio,
  Type,
  QrCode,
  Globe,
  ShoppingBag,
  Wrench,
  ListTree,
  type LucideIcon,
} from "lucide-react";

export const ITEM_KINDS = [
  "product",
  "service",
  "image",
  "video",
  "stream",
  "text",
  "qr",
  "webpage",
  "catalog_feed",
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export const KIND_META: Record<ItemKind, { label: string; icon: LucideIcon; hint: string }> = {
  product: { label: "Produto", icon: ShoppingBag, hint: "Nome e preço em destaque" },
  service: { label: "Serviço", icon: Wrench, hint: "Título, subtítulo e pontos" },
  image: { label: "Imagem", icon: ImageIcon, hint: "Uma imagem da biblioteca" },
  video: { label: "Vídeo", icon: Video, hint: "Um vídeo da biblioteca" },
  stream: { label: "Canal", icon: Radio, hint: "Uma fonte de vídeo em direto" },
  text: { label: "Texto", icon: Type, hint: "Mensagem em texto" },
  qr: { label: "Código QR", icon: QrCode, hint: "Ligação em código QR" },
  webpage: { label: "Página web", icon: Globe, hint: "Um site dentro do ecrã" },
  catalog_feed: { label: "Catálogo", icon: ListTree, hint: "Lista de produtos de um link" },
};

export const PRODUCT_TEMPLATES = [
  { value: "photo_left", label: "Foto à esquerda" },
  { value: "photo_right", label: "Foto à direita" },
  { value: "photo_top", label: "Foto em cima" },
  { value: "photo_background", label: "Foto de fundo" },
] as const;

export const SERVICE_TEMPLATES = [
  { value: "big_title", label: "Título grande" },
  { value: "image_left", label: "Imagem à esquerda" },
  { value: "image_background", label: "Imagem de fundo" },
] as const;

// Campos possíveis de playlist_items.data (todos opcionais; variam por tipo).
export type ItemData = {
  accent?: unknown;
  align?: unknown;
  badge?: unknown;
  badge_color?: unknown;
  bg?: unknown;
  bg_image_url?: unknown;
  body?: unknown;
  bullets?: unknown;
  caption?: unknown;
  category?: unknown;
  description?: unknown;
  fit?: unknown;
  headers?: unknown;
  icon?: unknown;
  id?: unknown;
  image_url?: unknown;
  ken_burns?: unknown;
  limit?: unknown;
  map?: unknown;
  muted?: unknown;
  name?: unknown;
  old_price?: unknown;
  per_item_s?: unknown;
  price?: unknown;
  price_multiplier?: unknown;
  price_suffix?: unknown;
  qr_caption?: unknown;
  qr_url?: unknown;
  refresh_s?: unknown;
  shuffle?: unknown;
  size?: unknown;
  source_id?: unknown;
  subtitle?: unknown;
  template?: unknown;
  text_color?: unknown;
  title?: unknown;
  url?: unknown;
  video_url?: unknown;
  zoom?: unknown;
};

export function defaultData(kind: ItemKind): ItemData {
  switch (kind) {
    case "product":
      return { name: "Novo produto", price: "9,99 €", template: "photo_left" };
    case "service":
      return { title: "Novo serviço", template: "big_title", bullets: [] };
    case "image":
      return { image_url: "", fit: "cover" };
    case "video":
      return { video_url: "", muted: true, fit: "cover" };
    case "stream":
      return { source_id: "" };
    case "text":
      return { title: "Título", body: "", align: "center", size: "l" };
    case "qr":
      return { url: "https://", title: "" };
    case "webpage":
      return { url: "https://", zoom: 1, refresh_s: 0 };
    case "catalog_feed":
      return {
        url: "",
        limit: 20,
        shuffle: false,
        per_item_s: 8,
        template: "photo_left",
        price_multiplier: 1,
      };
  }
}

/** Devolve o erro de validação (ou null) para os campos obrigatórios do contrato. */
export function validateData(kind: ItemKind, data: ItemData): string | null {
  const s = (k: keyof ItemData) => String(data[k] ?? "").trim();
  switch (kind) {
    case "product":
      if (!s("name")) return "O produto precisa de nome.";
      if (!s("price")) return "O produto precisa de preço.";
      return null;
    case "service":
      return s("title") ? null : "O serviço precisa de título.";
    case "image":
      return s("image_url") ? null : "Escolha uma imagem.";
    case "video":
      return s("video_url") ? null : "Escolha um vídeo.";
    case "stream":
      return s("source_id") ? null : "Escolha uma fonte de vídeo.";
    case "qr":
      return s("url") ? null : "Indique a ligação do código QR.";
    case "webpage":
      return s("url") ? null : "Indique o endereço da página.";
    case "catalog_feed":
      return s("url") ? null : "Indique o link do catálogo.";
    case "text":
      return null;
  }
}
