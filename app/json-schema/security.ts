/**
 * Security utilities for JSON Schema visualizer
 */

/**
 * Escapes HTML entities to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return text.replace(/[&<>"'`=\/]/g, (match) => htmlEscapes[match]);
}

/**
 * Sanitizes text content for safe display
 * Currently escapes HTML entities, but could be extended with more sanitization
 */
export function sanitizeText(text: string): string {
  return escapeHtml(text);
}

/**
 * Safely renders potentially unsafe content as text
 * Converts to string first to handle non-string inputs
 */
export function safeString(value: unknown): string {
  return sanitizeText(String(value));
}