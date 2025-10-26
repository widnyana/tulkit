import { SUPPORTED_LANGUAGES, type SupportedLanguages } from "../schema";
import { toast } from "sonner";
import { z } from "zod";
import n2words from "n2words";

/**
 * Get the amount in words (e.g. 123.45 -> "one hundred twenty-three and 45/100 dollars")
 * @param amount - The amount to convert to words
 * @param language - The language to convert the amount to words
 * @returns The amount in words
 */
export function getAmountInWords({
  amount,
  language,
}: {
  amount: number;
  language: SupportedLanguages;
}) {
  const amountSchema = z
    .number()
    .finite()
    .nonnegative("Amount must be non-negative")
    .transform(Math.floor);

  const languageSchema = z.enum(SUPPORTED_LANGUAGES).default("en");

  const result = z
    .object({
      amount: amountSchema,
      language: languageSchema,
    })
    .safeParse({ amount, language });

  if (!result.success) {
    console.error("Validation error:", result.error);
    toast.error("Invalid input data");

    return "-/-";
  }

  let amountInWords = "";
  try {
    amountInWords = n2words(result.data.amount, {
      lang: result.data.language,
    });
  } catch (error) {
    console.error("Failed to convert number to words:", error);
    toast.error("Failed to convert number to words");

    amountInWords = Math.floor(amount ?? 0).toString();
  }

  return amountInWords;
}

/**
 * Get the fractional part of the total (e.g. 123.45 -> "45")
 * @param total - The total to get the fractional part of
 * @returns The fractional part of the total
 */
export function getNumberFractionalPart(total = 0) {
  const schema = z.number().finite().nonnegative("Amount must be non-negative");

  const parsedTotal = schema.safeParse(total);

  if (!parsedTotal.success) {
    console.error("Validation error:", parsedTotal.error);
    toast.error("Invalid input data");

    return "-/-";
  }

  return Math.round((total % 1) * 100)
    .toString()
    .padStart(2, "0");
}