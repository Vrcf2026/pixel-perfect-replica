import type { SlideProps } from "./types";

export function ImageSlide({ data }: SlideProps) {
  const fit = (data.fit as string) === "contain" ? "contain" : "cover";
  const bg = (data.bg as string) || "#000000";
  const ken = Boolean(data.ken_burns);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      {data.image_url ? (
        <img
          src={String(data.image_url)}
          alt=""
          className={`h-full w-full ${ken ? "animate-[kenburns_18s_ease-in-out_infinite_alternate]" : ""}`}
          style={{ objectFit: fit }}
        />
      ) : null}
      {data.caption ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-[3%] text-[3cqw] text-white">
          {String(data.caption)}
        </div>
      ) : null}
      <style>{`@keyframes kenburns{from{transform:scale(1)}to{transform:scale(1.12)}}`}</style>
    </div>
  );
}

export default ImageSlide;
