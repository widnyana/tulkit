"use client";

import type { InvoiceData } from "@/lib/invoice/types";
import { PDFViewer } from "@react-pdf/renderer";
import type React from "react";
import { DefaultTemplate } from "../../templates/default/DefaultTemplate";
import { StripeTemplate } from "../../templates/stripe/StripeTemplate";

interface InvoicePDFViewerProps {
  invoiceData: InvoiceData;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({ invoiceData }) => {
  return (
    <PDFViewer
      key={invoiceData.templateKey || "default"}
      width="100%"
      height="100%"
      style={{ border: "none" }}
    >
      {invoiceData.templateKey === "stripe" ? (
        <StripeTemplate invoiceData={invoiceData} />
      ) : (
        <DefaultTemplate invoiceData={invoiceData} />
      )}
    </PDFViewer>
  );
};

export default InvoicePDFViewer;
