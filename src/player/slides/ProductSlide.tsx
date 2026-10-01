import { Check } from "lucide-react";
import { formatPrice, parsePrice } from "@/player/lib/format";
import { QrImage } from "@/player/components/QrImage";
import type { SlideProps } from "./types";

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function ProductSlide({ data }: SlideProps) {
  const d = data as Record<string, unknown>;
  const money = {
    currency: typeof d["currency"] === "string" ? String(d["currency"]) : "EUR",
    locale: typeof d["locale"] === "string" ? String(d["locale"]) : "pt-PT",
  };
  const bg = str(d["bg"]) || "var(--m-primary, #0F1E36)";
  const text = str(d["text_color"]) || "var(--m-text, #FFFFFF)";
  const accent = str(d["accent"]) || "var(--m-accent, #F28C28)";
  const template = str(d["template"]) || "photo_left";
  const image = str(d["image_url"]);
  // Fotos de catálogo (produto em fundo branco) mostram-se inteiras; fotos de ambiente preenchem.
  const fit = str(d["photo_fit"]) || (template === "photo_background" ? "cover" : "contain");
  const photoBg =
    str(d["photo_bg"]) ||
    "radial-gradient(circle at 50% 42%, #FFFFFF 0%, #F1F4F8 62%, #E3E8EF 100%)";
  const features = (Array.isArray(d["features"]) ? (d["features"] as unknown[]) : [])
    .map(str)
    .filter(Boolean)
    .slice(0, 3);
  const brand = str(d["brand"]);
  const category = str(d["category"]);
  const eyebrow = [brand, category].filter(Boolean).join(" · ");
  const price = parsePrice(d["price"]);
  const old = parsePrice(d["old_price"]);
  const saving = price !== null && old !== null && old > price ? old - price : null;
  const savingPct = saving !== null && old ? Math.round((saving / old) * 100) : null;
  const vertical = template === "photo_top";
  const overlay = template === "photo_background";

  const info = (
    <div
      className={`relative flex min-w-0 flex-1 flex-col justify-center ${overlay ? "gap-[1.6cqh] p-[5cqw] pb-[7cqh]" : "gap-[1.8cqh] p-[4.5cqw]"}`}
    >
      {eyebrow ? (
        <div
          className="truncate text-[1.9cqw] font-semibold tracking-[0.18em] uppercase"
          style={{ color: accent }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        className="font-display leading-[1.02] font-bold"
        style={{
          fontSize: vertical ? "5cqw" : "5.4cqw",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {str(d["name"])}
      </div>
      {d["description"] ? (
        <div
          className="text-[2.3cqw] leading-snug opacity-85"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {str(d["description"])}
        </div>
      ) : null}
      {features.length ? (
        <ul className="mt-[0.6cqh] flex flex-col gap-[1.1cqh]">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-[1.2cqw] text-[2.1cqw] leading-tight">
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ background: accent, width: "2.6cqw", height: "2.6cqw" }}
              >
                <Check
                  style={{ width: "1.7cqw", height: "1.7cqw", color: "#fff" }}
                  strokeWidth={3}
                />
              </span>
              <span className="truncate">{f}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-[1.2cqh] flex flex-wrap items-end gap-x-[1.6cqw] gap-y-[0.8cqh]">
        <span
          className="font-display leading-none font-bold"
          style={{ color: accent, fontSize: vertical ? "7cqw" : "8cqw" }}
        >
          {formatPrice(d["price"], money)}
        </span>
        <div className="flex flex-col gap-[0.6cqh] pb-[0.6cqh]">
          {d["old_price"] ? (
            <span className="text-[2.4cqw] leading-none line-through opacity-55">
              {formatPrice(d["old_price"], money)}
            </span>
          ) : null}
          {d["price_suffix"] ? (
            <span className="text-[1.8cqw] leading-none opacity-70">{str(d["price_suffix"])}</span>
          ) : null}
        </div>
        {saving !== null ? (
          <span
            className="mb-[0.8cqh] rounded-full px-[1.4cqw] py-[0.5cqh] text-[2cqw] font-bold"
            style={{ background: "#16A34A", color: "#fff" }}
          >
            Poupe {formatPrice(saving, money)}
            {savingPct && savingPct >= 5 ? ` (−${savingPct}%)` : ""}
          </span>
        ) : null}
      </div>
      {d["cta"] || d["qr_url"] ? (
        <div className="mt-[1cqh] flex items-center gap-[1.6cqw]">
          {d["qr_url"] ? (
            <QrImage
              value={str(d["qr_url"])}
              className="h-[13cqh] w-[13cqh] rounded bg-white p-[0.5%]"
            />
          ) : null}
          <div className="flex flex-col gap-[0.4cqh]">
            {d["cta"] ? (
              <span className="text-[2.2cqw] font-semibold">{str(d["cta"])} →</span>
            ) : null}
            {d["qr_caption"] ? (
              <span className="text-[1.8cqw] opacity-75">{str(d["qr_caption"])}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const badge = d["badge"] ? (
    <div
      className="absolute top-[5%] left-[3%] z-10 rounded-md px-[1.6cqw] py-[0.8cqh] text-[2.2cqw] font-bold tracking-wide uppercase shadow-lg"
      style={{ background: str(d["badge_color"]) || accent, color: "#fff" }}
    >
      {str(d["badge"])}
    </div>
  ) : null;

  if (overlay) {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ background: bg, color: text }}
      >
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{
              objectFit: fit === "contain" ? "contain" : "cover",
              background: fit === "contain" ? photoBg : undefined,
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/5" />
        <div className="relative flex h-full max-w-[62%] flex-col justify-end">{info}</div>
        {badge}
      </div>
    );
  }

  const photo = image ? (
    <div
      className={`relative shrink-0 overflow-hidden ${vertical ? "h-[46%] w-full" : "h-full w-[46%]"}`}
      style={{ background: fit === "contain" ? photoBg : "#000" }}
    >
      <img
        src={image}
        alt=""
        className="h-full w-full"
        style={
          fit === "contain"
            ? {
                objectFit: "contain",
                padding: "7%",
                filter: "drop-shadow(0 2.5cqh 2.5cqh rgba(15,30,54,.28))",
              }
            : { objectFit: "cover" }
        }
      />
      {badge}
    </div>
  ) : null;

  const dir = template === "photo_right" ? "flex-row-reverse" : vertical ? "flex-col" : "flex-row";
  return (
    <div
      className={`relative flex h-full w-full overflow-hidden ${dir}`}
      style={{ background: bg, color: text }}
    >
      {photo}
      {info}
      {image ? null : badge}
    </div>
  );
}

export default ProductSlide;
