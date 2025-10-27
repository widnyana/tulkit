import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { StripeTemplateDueAmount } from "./components/DueAmount";
import { StripeTemplateHeader } from "./components/Header";
import { StripeTemplateInvoiceDetails } from "./components/InvoiceDetails";
import { StripeTemplateItemsTable } from "./components/ItemsTable";
import { StripeTemplateNotes } from "./components/Notes";
import { StripeTemplatePaymentInfo } from "./components/PaymentInfo";
import { StripeTemplateSellerBuyerInfo } from "./components/SellerBuyerInfo";
import { StripeTemplateTotalsSection } from "./components/TotalsSection";
import { stripeTemplateStyles as s } from "./styles";

/**
 * Stripe invoice template - Minimal design
 * No borders, no shadows, optimal spacing
 */
const StripeTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
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
        {/* Stripe purple accent bar */}
        <View style={s.headerBar} />

        {/* Header with logo */}
        <StripeTemplateHeader invoiceData={invoiceData} />

        {/* Invoice metadata */}
        <StripeTemplateInvoiceDetails invoiceData={invoiceData} />

        {/* Billing information */}
        <StripeTemplateSellerBuyerInfo invoiceData={invoiceData} />

        {/* Amount due - right aligned */}
        <StripeTemplateDueAmount invoiceData={invoiceData} />

        {/* Line items table */}
        <StripeTemplateItemsTable invoiceData={invoiceData} />

        {/* Summary totals and Notes side by side */}
        <View style={[s.row, s.mt16]}>
          <View style={{ flex: 1, marginRight: 20 }}>
            <StripeTemplateNotes invoiceData={invoiceData} />
          </View>
          <View style={{ width: 240 }}>
            <StripeTemplateTotalsSection invoiceData={invoiceData} />
          </View>
        </View>

        {/* Payment Information */}
        <StripeTemplatePaymentInfo invoiceData={invoiceData} />

        {/* Footer */}
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

export { StripeTemplate };
