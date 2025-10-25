import { TRANSLATIONS } from "@/app/invoice/translations";

/**
 * This function handles the breaking change of the invoice number field.
 * It removes the old "invoiceNumber" field and adds the new "invoiceNumberObject" field with label and value.
 *
 * @example
 * ```typescript
 * const json = { invoiceNumber: "123", language: "en" };
 * const updatedJson = handleInvoiceNumberBreakingChange(json);
 * // Returns: { invoiceNumberObject: { label: "Invoice Number:", value: "123" }
 * ```
 */
export function handleInvoiceNumberBreakingChange(json: unknown) {
  // check if the invoice number is in the json
  if (
    typeof json === "object" &&
    json !== null &&
    "invoiceNumber" in json &&
    typeof json.invoiceNumber === "string"
  ) {
    const invoiceNumberLabel = TRANSLATIONS.invoiceNumber;

    // Create new object without invoiceNumber and with invoiceNumberObject
    const newJson = {
      ...json,
      // assign invoiceNumber to invoiceNumberObject.value
      invoiceNumberObject: {
        label: `${invoiceNumberLabel}:`,
        value: json.invoiceNumber,
      },
    };

    // remove deprecated invoiceNumber from json
    delete (newJson as Record<string, unknown>).invoiceNumber;

    // update json
    json = newJson;

    return json;
  }

  return json;
}
