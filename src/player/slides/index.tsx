import { ProductSlide } from "./ProductSlide";
import { ServiceSlide } from "./ServiceSlide";
import { ImageSlide } from "./ImageSlide";
import { VideoSlide } from "./VideoSlide";
import { StreamSlide } from "./StreamSlide";
import { TextSlide } from "./TextSlide";
import { QrSlide } from "./QrSlide";
import { WebpageSlide } from "./WebpageSlide";
import { CatalogFeedSlide } from "./CatalogFeedSlide";
import type { SlideProps } from "./types";

export type { SlideProps, SlideData } from "./types";

const MAP: Record<string, (p: SlideProps) => React.ReactNode> = {
  product: ProductSlide,
  service: ServiceSlide,
  image: ImageSlide,
  video: VideoSlide,
  stream: StreamSlide,
  text: TextSlide,
  qr: QrSlide,
  webpage: WebpageSlide,
  catalog_feed: CatalogFeedSlide,
};

/** Desenha um item de playlist. Usar sempre dentro de um contentor 16:9. */
export function Slide({ kind, data, sources }: { kind: string } & SlideProps) {
  const Cmp = MAP[kind];
  if (!Cmp) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/60">
        Tipo desconhecido: {kind}
      </div>
    );
  }
  return <>{Cmp({ data, sources })}</>;
}

/** Caixa 16:9 com container-queries para as medidas em cqw/cqh. */
export function SlideFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-lg bg-black ${className}`}
      style={{ containerType: "size" }}
    >
      {children}
    </div>
  );
}

export {
  ProductSlide,
  ServiceSlide,
  ImageSlide,
  VideoSlide,
  StreamSlide,
  TextSlide,
  QrSlide,
  WebpageSlide,
  CatalogFeedSlide,
};
