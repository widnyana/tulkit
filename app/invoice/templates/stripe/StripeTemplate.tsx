import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { StripeTemplateDueAmount } from "./components/DueAmount";
import { StripeTemplateHeader } from "./components/Header";
import { StripeTemplateInvoiceDetails } from "./components/InvoiceDetails";
import { StripeTemplateItemsTable } from "./components/ItemsTable";
import { StripeTemplateSellerBuyerInfo } from "./components/SellerBuyerInfo";
import { StripeTemplateTotalsSection } from "./components/TotalsSection";
import { stripeTemplateStyles } from "./styles";

/**
 * Stripe-inspired invoice template
 * Features: Clean design, professional layout, yellow accent bar
 */
const StripeTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
  invoiceData,
}) => {
  return (
    <Document
      title={`Invoice ${invoiceData.invoiceNumber}`}
      author={invoiceData.sender.name}
      subject={`Invoice for ${invoiceData.recipient.name}`}
      creator="Tulkit Invoice Generator"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={stripeTemplateStyles.page}>
        {/* Signature yellow accent bar */}
        <View style={stripeTemplateStyles.headerBar} />

        {/* Main content container */}
        <View style={stripeTemplateStyles.content}>
          {/* Header section with logo and company info */}
          <StripeTemplateHeader invoiceData={invoiceData} />
          <View style={stripeTemplateStyles.spacer} />

          {/* Invoice metadata (number, dates) */}
          <StripeTemplateInvoiceDetails invoiceData={invoiceData} />
          <View style={stripeTemplateStyles.sectionSeparator} />

          {/* Billing information */}
          <StripeTemplateSellerBuyerInfo invoiceData={invoiceData} />
          <View style={stripeTemplateStyles.spacer} />

          {/* Prominent amount due display */}
          <StripeTemplateDueAmount invoiceData={invoiceData} />

          {/* Line items table */}
          <StripeTemplateItemsTable invoiceData={invoiceData} />
          <View style={stripeTemplateStyles.spacer} />

          {/* Summary totals */}
          <StripeTemplateTotalsSection invoiceData={invoiceData} />

          {/* Additional notes section */}
          {invoiceData.notes && (
            <View style={stripeTemplateStyles.mt16}>
              <Text
                style={[
                  stripeTemplateStyles.fontSize9,
                  stripeTemplateStyles.fontMedium,
                  stripeTemplateStyles.textDark,
                  stripeTemplateStyles.mb2,
                ]}
              >
                Notes
              </Text>
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textGray,
                  { lineHeight: 1.0 },
                ]}
              >
                {invoiceData.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Footer with page number */}
        <View style={stripeTemplateStyles.footer}>
          <Text
            style={[
              stripeTemplateStyles.fontSize9,
              stripeTemplateStyles.textGray,
              { textAlign: "center" },
            ]}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    </Document>
  );
};

export { StripeTemplate };
