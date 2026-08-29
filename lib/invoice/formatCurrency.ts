import { formatNumber } from "./formatNumber.ts";

/**
 * Format an amount with its currency symbol for PDF rendering.
 *
 * The templates render with Helvetica, one of the standard-14 fonts, which is
 * never embedded in the PDF — every viewer substitutes its own. Substitutes
 * draw non-ASCII currency glyphs wider than the advance width Helvetica
 * declares, so "€890,00" prints with the € sitting on top of the 8. A space
 * absorbs the mismatch. ASCII symbols ($, Rp) measure correctly and stay tight.
 *
 * Symbols outside WinAnsi (₹, ₩, ₺) cannot render at all with a non-embedded
 * font — they drop out silently. Embedding a font is the only fix for those.
 */
export function formatCurrency(
  value: number,
  currency = "$",
  decimalSeparator = ",",
  thousandSeparator = ".",
  decimalPlaces = 2,
): string {
  const amount = formatNumber(
    value,
    decimalPlaces,
    decimalSeparator,
    thousandSeparator,
  );
  const gap = /^[\x20-\x7E]*$/.test(currency) ? "" : " ";
  return `${currency}${gap}${amount}`;
}
