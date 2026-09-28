import type { ItemData } from "@/features/playlists/contract";
import type { SourceLike } from "@/player/components/SourceView";

export type SlideData = ItemData;

export type SlideProps = {
  data: SlideData;
  /** Fontes de vídeo da organização, para os itens do tipo "canal". */
  sources?: undefined | Array<SourceLike & { id: string }>;
};
