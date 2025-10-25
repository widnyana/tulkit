import type { Metadata } from "next";
import { InvoicePageClient } from "./page.client";

export const metadata: Metadata = {
  title: "Invoice Generator | Tulkit",
  description:
    "Create professional invoices instantly with live PDF preview. Free invoice generator tool.",
};

export default function InvoicePage() {
  return <InvoicePageClient />;
}
