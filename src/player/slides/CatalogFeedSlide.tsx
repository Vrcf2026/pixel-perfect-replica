import { useEffect, useState } from "react";
import { ProductSlide } from "./ProductSlide";
import type { SlideProps } from "./types";

type Row = Record<string, unknown>;

function pick(row: Row, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Row)[key];
    return undefined;
  }, row);
}

/** Lê uma lista de produtos de um link e mostra-os um a um. */
export function CatalogFeedSlide({ data }: SlideProps) {
  const url = String(data.url ?? "");
  const limit = Number(data.limit) || 20;
  const perItem = Number(data.per_item_s) || 8;
  const multiplier = Number(data.price_multiplier) || 1;
  const map = (data.map as Record<string, string>) || {};
  const headers = (data.headers as Record<string, string>) || {};
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        let list: Row[] = Array.isArray(json)
          ? json
          : Array.isArray((json as Row)['items'])
            ? ((json as Row)['items'] as Row[])
            : Array.isArray((json as Row)['data'])
              ? ((json as Row)['data'] as Row[])
              : [];
        if (data.shuffle) list = [...list].sort(() => Math.random() - 0.5);
        setRows(list.slice(0, limit));
        setError(null);
      })
      .catch(() => !cancelled && setError("Não foi possível ler o catálogo."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, limit, data.shuffle]);

  useEffect(() => {
    if (rows.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % rows.length), perItem * 1000);
    return () => clearInterval(id);
  }, [rows.length, perItem]);

  if (error || (!url && rows.length === 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[2.5cqw] text-white/60">
        {error ?? "Indique o link do catálogo"}
      </div>
    );
  }

  const row = rows[i];
  if (!row) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[2.5cqw] text-white/60">
        A carregar catálogo…
      </div>
    );
  }

  const rawPrice = pick(row, map['price'] ?? "price");
  const priceNum = Number(String(rawPrice ?? "").replace(",", "."));
  const price = Number.isFinite(priceNum)
    ? `${(priceNum * multiplier).toFixed(2).replace(".", ",")} €`
    : String(rawPrice ?? "");

  return (
    <ProductSlide
      data={{
        name: String(pick(row, map['name'] ?? "name") ?? ""),
        price,
        image_url: pick(row, map['image_url'] ?? "image") ?? undefined,
        category: pick(row, map['category'] ?? "category") ?? undefined,
        description: pick(row, map['description'] ?? "description") ?? undefined,
        badge: pick(row, map['badge'] ?? "badge") ?? undefined,
        template: data.template ?? "photo_left",
        bg: data.bg,
        text_color: data.text_color,
        accent: data.accent,
      }}
    />
  );
}

export default CatalogFeedSlide;
