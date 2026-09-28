import type { SlideProps } from "./types";

const SIZES: Record<string, string> = { m: "5cqw", l: "7cqw", xl: "10cqw" };

export function TextSlide({ data }: SlideProps) {
  const bg = (data.bg as string) || "#0F1E36";
  const text = (data.text_color as string) || "#FFFFFF";
  const accent = (data.accent as string) || "#F28C28";
  const align = (data.align as string) === "left" ? "left" : "center";
  const size = SIZES[(data.size as string) || "l"] ?? SIZES['l'];

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center gap-[2%] overflow-hidden p-[6%]"
      style={{ background: bg, color: text, textAlign: align as "left" | "center" }}
    >
      {data.bg_image_url ? (
        <>
          <img src={String(data.bg_image_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : null}
      <div className="relative">
        {data.title ? (
          <div className="font-display font-bold" style={{ fontSize: size, lineHeight: 1.05 }}>
            {String(data.title)}
          </div>
        ) : null}
        {data.title && data.body ? (
          <div
            className="my-[2%] h-[0.6cqh] w-[12%] rounded"
            style={{ background: accent, marginInline: align === "center" ? "auto" : undefined }}
          />
        ) : null}
        {data.body ? (
          <div className="text-[3cqw] whitespace-pre-line opacity-90">{String(data.body)}</div>
        ) : null}
      </div>
    </div>
  );
}

export default TextSlide;
