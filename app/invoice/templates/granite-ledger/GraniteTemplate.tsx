import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { GraniteTemplateDetailsSection } from "./components/DetailsSection";
import { GraniteTemplateHeader } from "./components/Header";
import { GraniteTemplateItemsTable } from "./components/ItemsTable";
import { GraniteTemplatePaymentInfo } from "./components/PaymentInfo";
import { GraniteTemplateTotalsSection } from "./components/TotalsSection";
import { graniteTemplateStyles } from "./styles";

/**
 * Granite Ledger invoice template - solid, timeless, utilitarian design
 * Features a top header strip, two-column details section, table with borders,
 * and subdued footer - inspired by traditional ledger books
 */
const GraniteTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
  invoiceData,
}) => {
  const hasNotes = invoiceData.notes && invoiceData.notes.trim().length > 0;

  return (
    <Document
      title={`Invoice ${invoiceData.invoiceNumber || ""}`}
      author={invoiceData.sender.name || ""}
      subject={`Invoice for ${invoiceData.recipient.name || ""}`}
      creator="https://tulkit.widnyana.web.id/invoice"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={graniteTemplateStyles.page}>
        {/* Header with muted background, logo and invoice title */}
        <GraniteTemplateHeader invoiceData={invoiceData} />

        {/* Main content container */}
        <View style={graniteTemplateStyles.container}>
          <GraniteTemplateDetailsSection invoiceData={invoiceData} />

          {/* Line items table */}
          <GraniteTemplateItemsTable invoiceData={invoiceData} />

          {/* Notes and Totals container */}
          <View style={graniteTemplateStyles.notesAndTotalsContainer}>
            {/* Notes section */}
            {hasNotes && (
              <View style={graniteTemplateStyles.notes}>
                <Text style={graniteTemplateStyles.notesLabel}>Notes</Text>
                <Text style={graniteTemplateStyles.value}>
                  {invoiceData.notes}
                </Text>
              </View>
            )}

            {/* Totals section */}
            <View style={graniteTemplateStyles.totals}>
              <GraniteTemplateTotalsSection invoiceData={invoiceData} />
            </View>
          </View>

          {/* Payment Information section */}
          <GraniteTemplatePaymentInfo invoiceData={invoiceData} />
        </View>

        {/* Footer */}
        <Text
          style={graniteTemplateStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export { GraniteTemplate };
