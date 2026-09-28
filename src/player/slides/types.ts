import type { ItemData } from "@/features/playlists/contract";

export type SlideData = ItemData;

export type SlideProps = {
  data: SlideData;
  /** Fontes de vídeo da organização, para os itens do tipo "canal". */
  sources?: undefined | Array<{ id: string; kind: string; url: string | null; muted?: boolean | null; fit?: string | null }>;
};
