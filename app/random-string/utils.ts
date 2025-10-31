import type { GeneratedString, RandomStringOptions } from "./types";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

/**
 * Generates cryptographically secure random strings using Web Crypto API.
 * Uses crypto.getRandomValues() which is suitable for cryptographic purposes.
 */
export function generateRandomStrings(
  options: RandomStringOptions,
): GeneratedString[] {
  const { count, length, useUppercase, useLowercase, useNumbers, useSymbols } =
    options;

  let charset = "";
  if (useUppercase) charset += UPPERCASE;
  if (useLowercase) charset += LOWERCASE;
  if (useNumbers) charset += NUMBERS;
  if (useSymbols) charset += SYMBOLS;

  if (charset.length === 0) {
    charset = LOWERCASE;
  }

  const results: GeneratedString[] = [];

  for (let i = 0; i < count; i++) {
    let randomString = "";
    const randomValues = new Uint32Array(length);

    crypto.getRandomValues(randomValues);

    for (let j = 0; j < length; j++) {
      const randomIndex = randomValues[j] % charset.length;
      randomString += charset[randomIndex];
    }

    results.push({
      id: `${i}-${Date.now()}-${crypto.randomUUID()}`,
      value: randomString,
    });
  }

  return results;
}
