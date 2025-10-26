export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface InvoiceSender {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface InvoiceRecipient {
  name: string;
  address: string;
  email?: string;
  phone?: string;
}

export interface PaymentInformation {
  bankName?: string;
  accountNumber?: string;
  routingCode?: string; // SWIFT/routing number
  paymentMethods?: string[]; // e.g., ["Bank Transfer", "Credit Card", "PayPal"]
  paymentQRCode?: string; // base64 image or URL
}

export type TemplateKey = "default" | "stripe" | "apex" | "granite"; // Extend as needed for more templates

export interface InvoiceData {
  sender: InvoiceSender;
  recipient: InvoiceRecipient;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  taxEnabled: boolean;
  taxRate: number;
  templateKey?: TemplateKey;
  logo?: string; // base64 string
  currency?: string; // Currency symbol (e.g., "$", "€", "£", "¥", "₹")
  decimalSeparator?: string; // Default: ","
  thousandSeparator?: string; // Default: "."
  paymentInfo?: PaymentInformation;
}
