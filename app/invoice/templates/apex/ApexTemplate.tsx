import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { ApexTemplateBilledTo } from "./components/BilledTo";
import { ApexTemplateFromSection } from "./components/FromSection";
import { ApexTemplateHeader } from "./components/Header";
import { ApexTemplateInvoiceDetails } from "./components/InvoiceDetails";
import { ApexTemplateItemsTable } from "./components/ItemsTable";
import { ApexTemplateNotes } from "./components/Notes";
import { ApexTemplatePaymentInfo } from "./components/PaymentInfo";
import { ApexTemplateTotalsSection } from "./components/TotalsSection";
import { apexTemplateStyles as s } from "./styles";

/**
 * Apex invoice template - Warm & Energetic with Coral
 * Sophisticated design with strategic coral accents
 */
const ApexTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
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
        {/* Coral accent bar at top */}
        <View style={s.accentBar} />

        {/* Header: Logo left + Invoice title/number right */}
        <ApexTemplateHeader invoiceData={invoiceData} />

        {/* Two-column layout: Billed To (left) + Invoice Details (right) */}
        <View style={s.twoColumnRow}>
          <View style={s.leftColumn}>
            <ApexTemplateBilledTo invoiceData={invoiceData} />
          </View>
          <View style={s.rightColumn}>
            <ApexTemplateInvoiceDetails invoiceData={invoiceData} />
          </View>
        </View>

        {/* Items Table */}
        <ApexTemplateItemsTable invoiceData={invoiceData} />

        {/* Two-column layout: Notes (left) + Totals (right) */}
        <View style={s.twoColumnRow}>
          <View style={s.leftColumn}>
            <ApexTemplateNotes invoiceData={invoiceData} />
          </View>
          <View style={s.rightColumn}>
            <ApexTemplateTotalsSection invoiceData={invoiceData} />
          </View>
        </View>

        {/* Two-column layout: Payment Information (left) + From (right) */}
        <View style={[s.twoColumnRow, s.mt20]}>
          <View style={s.leftColumn}>
            <ApexTemplatePaymentInfo invoiceData={invoiceData} />
          </View>
          <View style={s.rightColumn}>
            <ApexTemplateFromSection invoiceData={invoiceData} />
          </View>
        </View>

        {/* Page number footer */}
        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

export { ApexTemplate };
