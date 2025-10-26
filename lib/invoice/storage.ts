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

    const parsed = JSON.parse(storedData);
    if (isValidInvoiceData(parsed)) {
      return parsed;
    } else {
      console.warn(
        "Invalid invoice data found in storage, resetting to defaults",
      );
      return null;
    }
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
    if (isValidInvoiceData(data)) {
      window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(data));
    } else {
      console.error("Invalid invoice data, not saving to storage");
    }
  } catch (error) {
    console.error("Error saving invoice data to storage", error);
  }
}

// validation function to check if data has required structure
function isValidInvoiceData(data: InvoiceData): data is InvoiceData {
  return (
    data &&
    typeof data === "object" &&
    data.sender &&
    typeof data.sender === "object" &&
    data.recipient &&
    typeof data.recipient === "object" &&
    typeof data.invoiceNumber === "string" &&
    typeof data.issueDate === "string" &&
    typeof data.dueDate === "string" &&
    Array.isArray(data.items) &&
    typeof data.taxEnabled === "boolean" &&
    typeof data.taxRate === "number" &&
    (typeof data.templateKey === "string" || data.templateKey === undefined) &&
    (typeof data.currency === "string" || data.currency === undefined) &&
    (typeof data.paymentInfo === "object" || data.paymentInfo === undefined)
  );
}
