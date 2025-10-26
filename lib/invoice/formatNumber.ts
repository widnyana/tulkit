/**
 * Format a number with custom decimal and thousand separators
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @param decimalSeparator - Character to use as decimal separator (default: ",")
 * @param thousandSeparator - Character to use as thousand separator (default: ".")
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  decimalPlaces = 2,
  decimalSeparator = ",",
  thousandSeparator = ".",
): string {
  // Handle edge cases
  if (Number.isNaN(value) || value === null || value === undefined) {
    return `0 ${decimalSeparator} 00`;
  }

  // Fix the number to specified decimal places
  const fixedValue = value.toFixed(decimalPlaces);

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = fixedValue.split(".");

  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandSeparator,
  );

  // Combine with decimal part using custom decimal separator
  return decimalPart
    ? formattedInteger + decimalSeparator + decimalPart
    : formattedInteger;
}
