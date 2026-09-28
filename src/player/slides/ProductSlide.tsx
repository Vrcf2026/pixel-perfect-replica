import { formatPrice } from "@/player/lib/format";
import { QrImage } from "@/player/components/QrImage";
import type { SlideProps } from "./types";

export function ProductSlide({ data }: SlideProps) {
  const bg = (data.bg as string) || "#0F1E36";
  const text = (data.text_color as string) || "#FFFFFF";
  const accent = (data.accent as string) || "#F28C28";
  const template = (data.template as string) || "photo_left";
  const image = data.image_url as string | undefined;

  const info = (
    <div className="flex flex-1 flex-col justify-center gap-[2%] p-[4%]">
      {data.category ? (
        <div className="text-[2.2cqw] font-semibold uppercase tracking-[0.2em] opacity-70">
          {String(data.category)}
        </div>
      ) : null}
      <div className="font-display text-[6cqw] leading-[1.05] font-bold">
        {String(data.name ?? "")}
      </div>
      {data.description ? (
        <div className="text-[2.4cqw] opacity-80">{String(data.description)}</div>
      ) : null}
      <div className="mt-[1%] flex items-end gap-[2%]">
        {data.old_price ? (
          <span className="text-[3cqw] line-through opacity-50">{formatPrice(data.old_price)}</span>
        ) : null}
        <span className="font-display text-[8cqw] leading-none font-bold" style={{ color: accent }}>
          {formatPrice(data.price)}
        </span>
        {data.price_suffix ? (
          <span className="pb-[1%] text-[2.4cqw] opacity-70">{String(data.price_suffix)}</span>
        ) : null}
      </div>
      {data.qr_url ? (
        <div className="mt-[2%] flex items-center gap-[2%]">
          <QrImage
            value={String(data.qr_url)}
            className="h-[12cqh] w-[12cqh] rounded bg-white p-[0.5%]"
          />
          {data.qr_caption ? (
            <span className="text-[2cqw] opacity-80">{String(data.qr_caption)}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const photo = image ? (
    <div className="relative flex-1 overflow-hidden">
      <img src={image} alt="" className="h-full w-full object-cover" />
    </div>
  ) : null;

  const badge = data.badge ? (
    <div
      className="absolute top-[4%] right-[4%] rounded px-[2%] py-[1%] text-[2.4cqw] font-bold uppercase"
      style={{ background: (data.badge_color as string) || accent, color: "#fff" }}
    >
      {String(data.badge)}
    </div>
  ) : null;

  if (template === "photo_background") {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ background: bg, color: text }}
      >
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-end">{info}</div>
        {badge}
      </div>
    );
  }

  const dir =
    template === "photo_right"
      ? "flex-row-reverse"
      : template === "photo_top"
        ? "flex-col"
        : "flex-row";

  return (
    <div
      className={`relative flex h-full w-full overflow-hidden ${dir}`}
      style={{ background: bg, color: text }}
    >
      {photo}
      {info}
      {badge}
    </div>
  );
}

export default ProductSlide;
