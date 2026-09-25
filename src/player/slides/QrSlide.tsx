import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { SlideProps } from "./types";

export function QrSlide({ data }: SlideProps) {
  const bg = (data.bg as string) || "#0F1E36";
  const text = (data.text_color as string) || "#FFFFFF";
  const url = String(data.url ?? "");
  const [png, setPng] = useState<string>("");

  useEffect(() => {
    if (!url) {
      setPng("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 600 })
      .then(setPng)
      .catch(() => setPng(""));
  }, [url]);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-[2%] p-[5%]"
      style={{ background: bg, color: text }}
    >
      {data.title ? (
        <div className="font-display text-[5cqw] font-bold">{String(data.title)}</div>
      ) : null}
      {png ? (
        <img src={png} alt="Código QR" className="h-[55cqh] w-[55cqh] rounded bg-white p-[1%]" />
      ) : (
        <div className="text-[2.5cqw] opacity-60">Indique uma ligação</div>
      )}
      {data.caption ? <div className="text-[2.6cqw] opacity-85">{String(data.caption)}</div> : null}
    </div>
  );
}

export default QrSlide;
