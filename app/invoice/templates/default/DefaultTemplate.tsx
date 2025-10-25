"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type React from "react";
import { DefaultTemplateDetailsSection } from "./components/DetailsSection";
import { DefaultTemplateFooter } from "./components/Footer";
import { DefaultTemplateHeader } from "./components/Header";
import { DefaultTemplateItemsTable } from "./components/ItemsTable";
import { DefaultTemplateTotalsSection } from "./components/TotalsSection";
import { defaultTemplateStyles } from "./styles";

// Define the PDF component
const DefaultTemplate: React.FC<{ invoiceData: InvoiceData }> = ({
  invoiceData,
}) => {
  return (
    <Document>
      <Page size="A4" style={defaultTemplateStyles.page}>
        <DefaultTemplateHeader
          invoiceData={invoiceData}
        />
        <DefaultTemplateDetailsSection
          invoiceData={invoiceData}
        />
        <DefaultTemplateItemsTable
          invoiceData={invoiceData}
        />
        <DefaultTemplateTotalsSection
          invoiceData={invoiceData}
        />

        {invoiceData.notes && (
          <View style={defaultTemplateStyles.notes}>
            <Text style={defaultTemplateStyles.value}>{invoiceData.notes}</Text>
          </View>
        )}

        <DefaultTemplateFooter />
      </Page>
    </Document>
  );
};

export { DefaultTemplate };
