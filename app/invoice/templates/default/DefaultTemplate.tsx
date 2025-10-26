import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { DefaultTemplateDetailsSection } from "./components/DetailsSection";
import { DefaultTemplateHeader } from "./components/Header";
import { DefaultTemplateItemsTable } from "./components/ItemsTable";
import { DefaultTemplateTotalsSection } from "./components/TotalsSection";
import { defaultTemplateStyles } from "./styles";

/**
 * Default invoice template - standard layout
 */
const DefaultTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
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
      <Page size="A4" style={defaultTemplateStyles.page}>
        {/* Header with logo and invoice title */}
        <DefaultTemplateHeader invoiceData={invoiceData} />

        <DefaultTemplateDetailsSection invoiceData={invoiceData} />

        {/* Line items table */}
        <DefaultTemplateItemsTable invoiceData={invoiceData} />

        {/* Notes and Totals container */}
        <View style={defaultTemplateStyles.notesAndTotalsContainer}>
          {/* Notes section - Conditionally render to avoid positioning issues */}
          {hasNotes && (
            <View style={defaultTemplateStyles.notes}>
              <Text style={defaultTemplateStyles.notesLabel}>Notes</Text>
              <Text style={defaultTemplateStyles.value}>
                {invoiceData.notes}
              </Text>
            </View>
          )}

          {/* Totals section - positioned on the right */}
          <DefaultTemplateTotalsSection invoiceData={invoiceData} />
        </View>

        {/* Footer */}
        <Text
          style={defaultTemplateStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export { DefaultTemplate };
