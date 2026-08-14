import type { InvoiceData } from "@/lib/invoice/types";
import { SITE_URL } from "@/lib/site";
import { Document, Page, Text, View } from "@react-pdf/renderer";
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
      creator={`${SITE_URL}/invoice`}
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={s.page}>
        <EvergreenContinuedBand invoiceData={invoiceData} />
        <EvergreenTemplateHeader invoiceData={invoiceData} />
        <EvergreenTemplatePartiesRow invoiceData={invoiceData} />
        <EvergreenTemplateItemsTable invoiceData={invoiceData} />
        <EvergreenTemplateTotalsNotes invoiceData={invoiceData} />
        <View style={s.footer} fixed>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
          {invoiceData.showBranding !== false && (
            <Text>{`generated with ${SITE_URL.replace(/^https?:\/\//, "")}`}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export { EvergreenTemplate };
