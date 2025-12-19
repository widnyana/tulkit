/**
 * Security utilities for JSON Schema visualizer
 */

/**
 * Sanitizes text content for safe display
 * Only escapes dangerous HTML tags while preserving HTML entities
 */
export function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return String(text);
  }

  // Only escape actual HTML tags that could cause XSS
  // Preserve HTML entities like &quot;, &apos;, etc. as-is
  return (
    text
      // Escape opening HTML tags
      .replace(/</g, "")
      // Escape closing HTML tags
      .replace(/>/g, "")
  );
}

/**
 * Safely renders potentially unsafe content as text
 * Converts to string first to handle non-string inputs
 */
export function safeString(value: unknown): string {
  return sanitizeText(String(value));
}
