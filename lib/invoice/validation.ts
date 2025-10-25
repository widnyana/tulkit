import { z } from "zod";
import type {
  InvoiceData,
  InvoiceItem,
  InvoiceRecipient,
  InvoiceSender,
} from "./types";

export const invoiceItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  notes: z.string().optional(),
}) satisfies z.ZodSchema<InvoiceItem>;

export const invoiceSenderSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
}) satisfies z.ZodSchema<InvoiceSender>;

export const invoiceRecipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
}) satisfies z.ZodSchema<InvoiceRecipient>;

export const invoiceDataSchema = z.object({
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
  currency: z.string().max(3, "Currency symbol should be 1-3 characters").optional().default("$"),
}) satisfies z.ZodSchema<InvoiceData>;
