import type { SlideProps } from "./types";

export function VideoSlide({ data }: SlideProps) {
  const fit = (data.fit as string) === "contain" ? "contain" : "cover";
  const bg = (data.bg as string) || "#000000";

  if (!data.video_url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[2.5cqw] text-white/60">
        Sem vídeo escolhido
      </div>
    );
  }

  return (
    <video
      key={String(data.video_url)}
      src={String(data.video_url)}
      autoPlay
      loop
      playsInline
      muted={data.muted !== false}
      className="h-full w-full"
      style={{ objectFit: fit, background: bg }}
    />
  );
}

export default VideoSlide;
