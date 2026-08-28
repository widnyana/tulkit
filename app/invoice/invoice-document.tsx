import type { InvoiceData } from "@/lib/invoice/types";
import { ApexTemplate } from "./templates/apex/ApexTemplate";
import { DefaultTemplate } from "./templates/default/DefaultTemplate";
import { EvergreenTemplate } from "./templates/evergreen/EvergreenTemplate";
import { GraniteTemplate } from "./templates/granite-ledger/GraniteTemplate";
import { StripeTemplate } from "./templates/stripe/StripeTemplate";

// Single source of truth for the template render switch. Consumed by the
// client viewer (InvoicePDFViewer), the download button (InvoiceDownloadButton),
// and the /api/invoice-pdf route — add new TemplateKeys here only.
export function InvoiceDocument({ invoiceData }: { invoiceData: InvoiceData }) {
  switch (invoiceData.templateKey) {
    case "stripe":
      return <StripeTemplate invoiceData={invoiceData} />;
    case "granite":
      return <GraniteTemplate invoiceData={invoiceData} />;
    case "apex":
      return <ApexTemplate invoiceData={invoiceData} />;
    case "evergreen":
      return <EvergreenTemplate invoiceData={invoiceData} />;
    default:
      return <DefaultTemplate invoiceData={invoiceData} />;
  }
}
