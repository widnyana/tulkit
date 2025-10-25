import { z } from "zod";
import {
  InvoiceData,
  InvoiceItem,
  InvoiceSender,
  InvoiceRecipient,
} from "./types";

export const invoiceItemSchema: z.ZodSchema<InvoiceItem> = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  notes: z.string().optional(),
});

export const invoiceSenderSchema: z.ZodSchema<InvoiceSender> = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
});

export const invoiceRecipientSchema: z.ZodSchema<InvoiceRecipient> = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
});

export const invoiceDataSchema: z.ZodSchema<InvoiceData> = z.object({
  sender: invoiceSenderSchema,
  recipient: invoiceRecipientSchema,
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  items: z.array(invoiceItemSchema),
  notes: z.string().optional(),
  taxEnabled: z.boolean(),
  taxRate: z
    .number()
    .min(0, "Tax rate must be non-negative")
    .max(100, "Tax rate cannot exceed 100%"),
  templateKey: z.enum(["default", "stripe"]).default("default"),
  logo: z.string().optional(),
});
