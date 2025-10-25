"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import type { InvoiceData } from "../../../../../lib/types";
import { StripeTemplateDueAmount } from "./components/DueAmount";
import { StripeTemplateHeader } from "./components/Header";
import { StripeTemplateInvoiceDetails } from "./components/InvoiceDetails";
import { StripeTemplateItemsTable } from "./components/ItemsTable";
import { StripeTemplateSellerBuyerInfo } from "./components/SellerBuyerInfo";
import { StripeTemplateTotalsSection } from "./components/TotalsSection";
import { stripeTemplateStyles } from "./styles";

// Define the PDF component
const StripeTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
  invoiceData,
}) => {
  return (
    <Document title={`Invoice ${invoiceData.invoiceNumber}`}>
      <Page size="A4" style={stripeTemplateStyles.page}>
        {/* Yellow header bar */}
        <View style={stripeTemplateStyles.headerBar} />

        {/* Main content */}
        <View style={stripeTemplateStyles.content}>
          <StripeTemplateHeader
            invoiceData={invoiceData}
          />
          <StripeTemplateInvoiceDetails
            invoiceData={invoiceData}
          />
          <StripeTemplateSellerBuyerInfo
            invoiceData={invoiceData}
          />
          <StripeTemplateDueAmount
            invoiceData={invoiceData}
          />
          <StripeTemplateItemsTable
            invoiceData={invoiceData}
          />
          <StripeTemplateTotalsSection
            invoiceData={invoiceData}
          />

          {/* Notes */}
          {invoiceData.notes && (
            <View style={stripeTemplateStyles.mt24}>
              <Text
                style={[
                  stripeTemplateStyles.fontSize10,
                  stripeTemplateStyles.textDark,
                ]}
              >
                {invoiceData.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={stripeTemplateStyles.footer}>
          <Text
            style={[
              stripeTemplateStyles.fontSize10,
              stripeTemplateStyles.textGray,
              { textAlign: "center" },
            ]}
          >
            -
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export { StripeTemplate };
