import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR gerado localmente (sem serviços externos). */
export function QrImage({ value, className = "" }: { value: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc("");
      return;
    }
    QRCode.toDataURL(value, { margin: 1, width: 400 })
      .then((d) => !cancelled && setSrc(d))
      .catch(() => !cancelled && setSrc(""));
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (!src) return null;
  return <img src={src} alt="Código QR" className={className} />;
}

export default QrImage;
