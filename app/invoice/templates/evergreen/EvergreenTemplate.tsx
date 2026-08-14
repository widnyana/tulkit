import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text } from "@react-pdf/renderer";
import type React from "react";
import {
  EvergreenContinuedBand,
  EvergreenTemplateHeader,
} from "./components/Header";
import { EvergreenTemplateItemsTable } from "./components/ItemsTable";
import { EvergreenTemplatePartiesRow } from "./components/PartiesRow";
import { EvergreenTemplateTotalsNotes } from "./components/TotalsNotes";
import { evergreenTemplateStyles as s } from "./styles";

/**
 * Evergreen invoice template — page-break-safe ledger.
 * Rows never split (minPresenceAhead), the totals cluster never orphans
 * (wrap={false}), and pages >= 2 carry a fixed "CONTINUED" band.
 */
const EvergreenTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
  invoiceData,
}) => {
  return (
    <Document
      title={`Invoice ${invoiceData.invoiceNumber || ""}`}
      author={invoiceData.sender.name || ""}
      subject={`Invoice for ${invoiceData.recipient.name || ""}`}
      creator="https://tulkit.widnyana.web.id/invoice"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={s.page}>
        <EvergreenContinuedBand invoiceData={invoiceData} />
        <EvergreenTemplateHeader invoiceData={invoiceData} />
        <EvergreenTemplatePartiesRow invoiceData={invoiceData} />
        <EvergreenTemplateItemsTable invoiceData={invoiceData} />
        <EvergreenTemplateTotalsNotes invoiceData={invoiceData} />
        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `tulkit.widnyana.web.id   ·   Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
};

export { EvergreenTemplate };
