import type { InvoiceData } from "./types";

// Fresh, empty invoice used as the initial form state and by the /invoice
// "Reset" button. A factory (not a const) so issueDate/dueDate regenerate to
// the current date on each call.
export function createDefaultInvoiceData(): InvoiceData {
  return {
    sender: {
      name: "",
      address: "",
      email: "",
      phone: "",
    },
    recipient: {
      name: "",
      address: "",
      email: "",
      phone: "",
    },
    invoiceNumber: "INV-001",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 7 days from now
    items: [
      {
        id: "1",
        description: "Initial item",
        quantity: 1,
        unitPrice: 0,
        notes: "",
      },
    ],
    notes: "",
    taxEnabled: false,
    taxRate: 10,
    templateKey: "default",
    currency: "$",
    decimalSeparator: ",",
    thousandSeparator: ".",
    paymentInfo: {
      bankName: "",
      accountNumber: "",
      routingCode: "",
      paymentMethods: [],
      paymentQRCode: "",
    },
    showBranding: true,
  };
}
