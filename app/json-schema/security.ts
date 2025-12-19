/**
 * Security utilities for JSON Schema visualizer
 */

/**
 * Server-side safe HTML entity decoder
 * Handles common HTML entities without using DOM APIs
 */
export function decodeHtmlEntities(text: string): string {
  if (typeof text !== "string") {
    return String(text);
  }

  // Common HTML entity mappings
  const entityMap: Record<string, string> = {
    // Basic HTML entities
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",

    // Common numeric entities (hex)
    "&#x60;": "`", // backtick
    "&#x2F;": "/", // forward slash
    "&#x3D;": "=", // equals
    "&#x3C;": "<", // less than
    "&#x3E;": ">", // greater than
    "&#x26;": "&", // ampersand

    // Decimal equivalents
    "&#96;": "`", // backtick
    "&#47;": "/", // forward slash
    "&#61;": "=", // equals
    "&#34;": '"', // double quote
    "&#60;": "<", // less than
    "&#62;": ">", // greater than
    "&#38;": "&", // ampersand
  };

  // First replace named entities and known numeric entities
  let decoded = text.replace(/&#?[a-zA-Z0-9]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });

  // Then handle any remaining numeric entities dynamically
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    const charCode = parseInt(dec, 10);
    return Number.isNaN(charCode) ? match : String.fromCharCode(charCode);
  });

  decoded = decoded.replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => {
    const charCode = parseInt(hex, 16);
    return Number.isNaN(charCode) ? match : String.fromCharCode(charCode);
  });

  return decoded;
}

/**
 * Escapes HTML entities to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  if (typeof text !== "string") {
    return String(text);
  }

  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Sanitizes text content for safe display
 * First decodes HTML entities, then escapes dangerous ones
 */
export function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return String(text);
  }

  // First decode any existing HTML entities
  const decoded = decodeHtmlEntities(text);

  // Then escape only the dangerous HTML entities
  return escapeHtml(decoded);
}

/**
 * Safely renders potentially unsafe content as text
 * Converts to string first to handle non-string inputs
 */
export function safeString(value: unknown): string {
  return sanitizeText(String(value));
}
