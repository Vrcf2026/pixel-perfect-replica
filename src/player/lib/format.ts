/**
 * Formata um preço vindo do painel ou de um catálogo.
 * - número (349 ou 9.99) ou texto só numérico ("9,99", "1.234,50") → "9,99 €" (pt-PT)
 * - texto livre ("a partir de 199 €", "Consulte") → mostrado tal como está
 */
export function formatPrice(
  value: unknown,
  opts: { currency?: string; locale?: string; multiplier?: number } = {},
): string {
  const { currency = "EUR", locale = "pt-PT", multiplier = 1 } = opts;
  if (value === null || value === undefined || value === "") return "";
  let n: number | null = null;
  if (typeof value === "number") n = value;
  else {
    const s = String(value).trim();
    if (/^-?[\d\s.]*[,.]?\d+$/.test(s)) {
      // "1.234,50" → 1234.50 ; "9,99" → 9.99 ; "9.99" → 9.99
      const norm = /^\d{1,3}(\.\d{3})+$/.test(s)
        ? s.replace(/\./g, "") // "1.234" → milhares
        : s.includes(",")
          ? s.replace(/[\s.]/g, "").replace(",", ".")
          : s.replace(/\s/g, "");
      const parsed = Number(norm);
      if (Number.isFinite(parsed)) n = parsed;
    }
  }
  if (n === null || !Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n * multiplier);
}

/** Lê um preço (número ou texto como "1.234,50") e devolve o número, ou null. */
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value ?? "")
    .replace(/[€$£\s]/g, "")
    .trim();
  if (!/^-?[\d.]*[,.]?\d+$/.test(s)) return null;
  const norm = /^\d{1,3}(\.\d{3})+$/.test(s)
    ? s.replace(/\./g, "")
    : s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
