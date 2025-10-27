"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { PDFViewer } from "@react-pdf/renderer";
import type React from "react";
import { ApexTemplate } from "../../templates/apex/ApexTemplate";
import { DefaultTemplate } from "../../templates/default/DefaultTemplate";
import { GraniteTemplate } from "../../templates/granite-ledger/GraniteTemplate";
import { StripeTemplate } from "../../templates/stripe/StripeTemplate";

interface InvoicePDFViewerProps {
  invoiceData: InvoiceData;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({ invoiceData }) => {
  const logoKey = invoiceData.logo ? invoiceData.logo.substring(0, 50) : "no-logo";

  return (
    <PDFViewer
      key={`${invoiceData.templateKey || "default"}-${logoKey}`}
      width="100%"
      height="100%"
      style={{ border: "none" }}
    >
      {invoiceData.templateKey === "stripe" ? (
        <StripeTemplate invoiceData={invoiceData} />
      ) : invoiceData.templateKey === "granite" ? (
        <GraniteTemplate invoiceData={invoiceData} />
      ) : invoiceData.templateKey === "apex" ? (
        <ApexTemplate invoiceData={invoiceData} />
      ) : (
        <DefaultTemplate invoiceData={invoiceData} />
      )}
    </PDFViewer>
  );
};

export default InvoicePDFViewer;
