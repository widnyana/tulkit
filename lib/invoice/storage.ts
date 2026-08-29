import { invoiceDataSchema } from "./validation";
import type { InvoiceData } from "./types";

const INVOICE_STORAGE_KEY = "tulkit_invoice_data";

export function loadInvoice(): InvoiceData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedData = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!storedData) {
      return null;
    }

    // Single boundary definition for the invoice shape — the same zod schema
    // that gates file import and the API. Anything it rejects resets to null.
    const parsed = invoiceDataSchema.safeParse(JSON.parse(storedData));
    if (parsed.success) {
      return parsed.data;
    }
    console.warn(
      "Invalid invoice data found in storage, resetting to defaults",
      parsed.error.issues,
    );
    return null;
  } catch (error) {
    console.error("Error loading invoice data from storage", error);
    return null;
  }
}

export function saveInvoice(data: InvoiceData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    // data is already trusted (form state only updates after schema validation).
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving invoice data to storage", error);
  }
}

export function exportInvoiceJson(data: InvoiceData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${data.invoiceNumber || "untitled"}.json`;
  a.click();
  // Defer revoke: revoking synchronously after click() can cancel the
  // download on Firefox/Safari. ponytail: fixed 10s timer, drop when the
  // download pipeline ever moves to streams.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function clearInvoice(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(INVOICE_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing invoice data from storage", error);
  }
}
