import { SourceView } from "@/player/components/SourceView";
import type { SlideProps } from "./types";

export function StreamSlide({ data, sources = [] }: SlideProps) {
  const source = sources.find((s) => s.id === data.source_id);

  if (!source) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-[2.5cqw] text-white/60">
        Sem fonte de vídeo escolhida
      </div>
    );
  }

  return <SourceView source={source} />;
}

export default StreamSlide;
