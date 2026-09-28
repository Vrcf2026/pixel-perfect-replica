import { QrImage } from "@/player/components/QrImage";
import * as Icons from "lucide-react";
import type { SlideProps } from "./types";

function Icon({ name, color }: { name?: string; color: string }) {
  if (!name) return null;
  const key = name
    .split(/[-_\s]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[key];
  if (!Cmp) return null;
  return <Cmp style={{ color }} className="h-[10cqh] w-[10cqh]" />;
}

export function ServiceSlide({ data }: SlideProps) {
  const bg = (data.bg as string) || "var(--m-primary, #0F1E36)";
  const text = (data.text_color as string) || "var(--m-text, #FFFFFF)";
  const accent = (data.accent as string) || "var(--m-accent, #F28C28)";
  const template = (data.template as string) || "big_title";
  const image = data.image_url as string | undefined;
  const bullets = Array.isArray(data.bullets) ? (data.bullets as string[]) : [];

  const body = (
    <div className="flex flex-1 flex-col justify-center gap-[2%] p-[5%]">
      <Icon name={data.icon as string} color={accent} />
      <div className="font-display text-[6.5cqw] leading-[1.05] font-bold">
        {String(data.title ?? "")}
      </div>
      {data.subtitle ? <div className="text-[3cqw] opacity-80">{String(data.subtitle)}</div> : null}
      {bullets.length > 0 ? (
        <ul className="mt-[1%] space-y-[1%] text-[2.6cqw]">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-[1.5%]">
              <span style={{ color: accent }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
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

  if (template === "image_background") {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ background: bg, color: text }}
      >
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative flex h-full">{body}</div>
      </div>
    );
  }

  if (template === "image_left") {
    return (
      <div className="flex h-full w-full overflow-hidden" style={{ background: bg, color: text }}>
        {image ? (
          <div className="flex-1 overflow-hidden">
            <img src={image} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center" style={{ background: bg, color: text }}>
      {body}
    </div>
  );
}

export default ServiceSlide;
