import { z } from "zod";
import type {
  InvoiceData,
  InvoiceItem,
  InvoiceRecipient,
  InvoiceSender,
  PaymentInformation,
} from "./types";

// Base64 image data URIs ONLY. @react-pdf/renderer also fetches http(s) URLs
// server-side — allowing them would turn /api/invoice-pdf into an SSRF proxy.
// The UI logo upload produces data:image/png;base64,... via canvas, so this
// accepts everything the legit client sends.
const imageUrlSchema = z
  .string()
  .max(2_800_000, "Image data URI too large (max ~2MB decoded)")
  .regex(
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/,
    "Must be a base64 image data URI (data:image/png;base64,...) — remote URLs are not allowed",
  );
// "" means "not provided" (form initializes these fields to empty strings).
const optionalImageUrl = imageUrlSchema.optional().or(z.literal(""));

// Length caps: an unauthenticated render endpoint turns every byte of string
// into unbounded PDF layout work. Caps bound the amplification. Custom min
// messages because the form surfaces issue texts under each field.
const shortText = (max: number, requiredMsg = "This field is required") =>
  z.string().min(1, requiredMsg).max(max);

// ISO date only (yyyy-mm-dd) — what the native date inputs emit and what
// llms.txt documents. Dates render as text, but strictness here means the
// dump/API contract has exactly one date shape.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd");

export const invoiceItemSchema = z.object({
  id: z.string().max(100),
  description: shortText(2000, "Description is required"),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  notes: z.string().max(2000).optional(),
}) satisfies z.ZodSchema<InvoiceItem>;

export const invoiceSenderSchema = z.object({
  name: shortText(500, "Company name is required"),
  address: shortText(1000, "Address is required"),
  // Email optional like the recipient's: empty string means "not provided".
  email: z.string().email("Invalid email").max(320).or(z.literal("")),
  phone: shortText(50, "Phone is required"),
}) satisfies z.ZodSchema<InvoiceSender>;

export const invoiceRecipientSchema = z.object({
  name: shortText(500, "Name is required"),
  address: shortText(1000, "Address is required"),
  // Optional contact fields: empty string is treated as "not provided" so the
  // form stays valid (and controlled) when the user leaves them blank.
  email: z
    .string()
    .email("Invalid email")
    .max(320)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
}) satisfies z.ZodSchema<InvoiceRecipient>;

export const paymentInformationSchema = z.object({
  bankName: z.string().max(500).optional(),
  accountNumber: z.string().max(100).optional(),
  routingCode: z.string().max(100).optional(),
  paymentMethods: z.array(z.string().max(100)).max(20).optional(),
  paymentQRCode: optionalImageUrl,
}) satisfies z.ZodSchema<PaymentInformation>;

export const invoiceDataSchema = z.object({
  sender: invoiceSenderSchema,
  recipient: invoiceRecipientSchema,
  invoiceNumber: shortText(100),
  issueDate: isoDate,
  dueDate: isoDate,
  items: z.array(invoiceItemSchema).max(500),
  notes: z.string().max(5000).optional(),
  taxEnabled: z.boolean(),
  taxRate: z
    .number()
    .min(0, "Tax rate must be non-negative")
    .max(100, "Tax rate cannot exceed 100%"),
  templateKey: z
    .enum(["default", "stripe", "apex", "granite", "evergreen"])
    .default("default"),
  logo: optionalImageUrl,
  currency: z
    .string()
    .max(3, "Currency symbol should be 1-3 characters")
    .optional()
    .default("$"),
  decimalSeparator: z
    .string()
    .length(1, "Decimal separator must be 1 character")
    .optional()
    .default(","),
  thousandSeparator: z
    .string()
    // "" is valid: the UI "None" option means no grouping; formatNumber handles it.
    .max(1, "Thousand separator must be at most 1 character")
    .optional()
    .default("."),
  paymentInfo: paymentInformationSchema.optional(),
  showBranding: z.boolean().optional().default(true),
}) satisfies z.ZodSchema<InvoiceData>;
