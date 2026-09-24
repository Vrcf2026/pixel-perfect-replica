export type SlideData = Record<string, unknown>;

export type SlideProps = {
  data: SlideData;
  /** Fontes de vídeo da organização, para os itens do tipo "canal". */
  sources?: Array<{ id: string; kind: string; url: string | null; muted?: boolean | null; fit?: string | null }>;
};
